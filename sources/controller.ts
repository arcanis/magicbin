import {npath, PortablePath, ppath, xfs}                                                                       from '@yarnpkg/fslib';
import chokidar                                                                                                from 'chokidar';
import debug                                                                                                   from 'debug';
import * as t                                                                                                  from 'typanion';

import {BackBuffer}                                                                                            from './backbuffer';
import {openConfig}                                                                                            from './config';
import {Executor}                                                                                              from './executor';
import {Configuration, ConfirmationMode, isCompletedStatus, isConfirmationMode, TaskConfiguration, TaskStatus} from './types';
import {createToken}                                                                                           from './utils';

export class Task {
  static defaultBackBufferRows = 100;
  static defaultRebootInterval = 1000;
  static defaultRebootOnSuccess = true;
  static defaultRebootOnFailure = true;
  static defaultConfirmationMode: t.InferType<typeof isConfirmationMode> = ConfirmationMode.NONE;

  public name: string;

  public status: TaskStatus = TaskStatus.CANCELLED;

  private rebootInterval = Task.defaultRebootInterval;
  private rebootOnSuccess = Task.defaultRebootOnSuccess;
  private rebootOnFailure = Task.defaultRebootOnFailure;
  private rebootTimer: ReturnType<typeof setTimeout> | undefined;

  private dependsOn = new Set<string>();
  private confirmationMode: t.InferType<typeof isConfirmationMode> = Task.defaultConfirmationMode;

  private executorConfig: TaskConfiguration | null = null;
  private executor: Executor | null = null;

  private debugLog: debug.Debugger;
  private backBuffer = new BackBuffer(Task.defaultBackBufferRows);

  private internalOnStop: {
    reboot: TaskConfiguration | null;
  } = {
      reboot: null,
    };

  public confirm = () => {};

  constructor(private readonly controller: Controller, public readonly id: string) {
    this.name = id;
    this.debugLog = debug(`mb:task:${id}`);

    this.backBuffer.onFlush.add(lines => {
      for (const fn of Controller.onTaskFlush) {
        fn(this.controller.namespace, this.id, lines);
      }
    });
  }

  getInfo() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
    };
  }

  sync(config: TaskConfiguration) {
    this.debugLog(`Syncing the task configuration`);

    this.name = config.name ?? this.id;

    this.rebootInterval = config.rebootInterval ?? Task.defaultRebootInterval;
    this.rebootOnSuccess = config.rebootOnSuccess ?? Task.defaultRebootOnSuccess;
    this.rebootOnFailure = config.rebootOnFailure ?? Task.defaultRebootOnFailure;

    this.dependsOn = new Set(typeof config.dependsOn == `string` ? [config.dependsOn] : config.dependsOn ?? []);
    this.confirmationMode = config.confirmationMode ?? Task.defaultConfirmationMode;

    this.backBuffer.setRows(config.backBufferRows ?? Task.defaultBackBufferRows);

    for (const fn of this.controller.onTaskUpdate)
      fn(this.id);

    if (typeof this.rebootTimer !== `undefined`) {
      clearTimeout(this.rebootTimer);
      this.rebootTimer = undefined;
    }

    if (!this.executor || !this.executor.accept(config) || !this.executor.running) {
      if (this.executor && !this.executor.accept(config))
        this.debugLog(`The executor doesn't accept the current configuration; stopping it`);

      this.stop({reboot: config});
    }
  }

  setStatus(status: TaskStatus) {
    this.debugLog(`Status changed into ${status}`);
    this.status = status;

    for (const fn of this.controller.onTaskUpdate)
      fn(this.id);

    if (this.status === TaskStatus.RUNNING)
      for (const task of this.controller.getTasks())
        if (task.dependsOn.has(this.id))
          task.reboot();

    if (isCompletedStatus(this.status))
      for (const task of this.controller.getTasks())
        if (task.dependsOn.has(this.id))
          task.stop();

    if (this.status === TaskStatus.SUCCESS && this.rebootOnSuccess)
      this.scheduleForReboot();

    if (this.status === TaskStatus.FAILED && this.rebootOnFailure) {
      this.scheduleForReboot();
    }
  }

  scheduleForReboot() {
    if (typeof this.rebootTimer !== `undefined` || this.rebootInterval === null)
      return;

    this.rebootTimer = setTimeout(() => {
      this.rebootTimer = undefined;
      this.reboot();
    }, this.rebootInterval);

    this.debugLog(`Reboot scheduled`);
  }

  waitForConfirmation() {
    const confirmationMode = this.confirmationMode;
    if (confirmationMode === ConfirmationMode.NONE)
      return Promise.resolve();

    return new Promise<void>(resolve => {
      if (typeof confirmationMode !== `string` && confirmationMode.type === ConfirmationMode.GREP) {
        const handler = (lines: Array<Buffer>) => {
          for (const line of lines) {
            if (!line.toString().match(confirmationMode.pattern))
              continue;

            this.backBuffer.onFlush.delete(handler);
            resolve();
            return;
          }
        };

        this.backBuffer.onFlush.add(handler);
      }

      this.confirm = resolve;
    }).then(() => {
      this.confirm = () => {};
    });
  }

  reboot() {
    if (!isCompletedStatus(this.status)) {
      this.stop({reboot: true});
      return;
    }

    if (this.status === TaskStatus.STOPPING) {
      this.internalOnStop.reboot = this.internalOnStop.reboot ?? this.executorConfig;
      return;
    }

    if (!this.executorConfig)
      return;

    if (typeof this.rebootTimer !== `undefined`) {
      clearTimeout(this.rebootTimer);
      this.rebootTimer = undefined;
    }

    const unfulfilledDependencies = [...this.dependsOn].filter(dependency => {
      const dependencyStatus = this.controller.tryTask(dependency)?.status;
      return dependencyStatus !== TaskStatus.RUNNING;
    });

    if (unfulfilledDependencies.length > 0) {
      this.debugLog(`Dependencies unmet: ${unfulfilledDependencies.join(`, `)}`);
      this.setStatus(TaskStatus.PENDING);
      return;
    }

    const executor = Executor.create(createToken(this.controller.namespace, this.id), this.executorConfig);
    if (!executor) {
      this.debugLog(`Reboot failed: executor didn't match any provider`);
      this.setStatus(TaskStatus.CANCELLED);
      return;
    }

    this.executor = executor;
    this.setStatus(TaskStatus.STARTING);

    this.executor.boot.then(() => {
      return this.waitForConfirmation();
    }).then(() => {
      if (this.executor === executor) {
        this.setStatus(TaskStatus.RUNNING);
      }
    });

    this.executor.execution.then(exitCode => {
      if (this.executor === executor) {
        this.setStatus(exitCode === 0 ? TaskStatus.SUCCESS : TaskStatus.FAILED);
      }
    });

    this.executor.onmessage = chunk => {
      this.backBuffer.write(chunk);
    };
  }

  clear() {
    this.backBuffer.clear();
  }

  tail(size: number) {
    return this.backBuffer.read(size);
  }

  stop({reboot = false}: {reboot?: TaskConfiguration | boolean} = {}) {
    if (reboot === true)
      this.internalOnStop.reboot = this.executorConfig;
    else if (reboot)
      this.internalOnStop.reboot = reboot;
    else
      this.internalOnStop.reboot = null;

    if (this.status === TaskStatus.STOPPING)
      return;

    if (isCompletedStatus(this.status)) {
      if (this.rebootTimer) {
        clearTimeout(this.rebootTimer);
        this.rebootTimer = undefined;
      }

      if (this.status === TaskStatus.PENDING)
        this.setStatus(TaskStatus.CANCELLED);

      if (this.internalOnStop.reboot) {
        this.executorConfig = this.internalOnStop.reboot;
        this.reboot();
      }

      return;
    }

    const executor = this.executor;
    if (!executor)
      throw new Error(`Assertion failed: Expected an executor to be associated with the task`);

    this.executor = null;
    this.setStatus(TaskStatus.STOPPING);

    executor.abort().then(() => {
      this.setStatus(TaskStatus.CANCELLED);
      if (this.internalOnStop.reboot) {
        this.executorConfig = this.internalOnStop.reboot;
        this.reboot();
      }
    });
  }
}

export type TaskInfo = ReturnType<Task[`getInfo`]>;

export class Controller {
  private static instances = new Map<string, Controller>();

  public static onNamespaceUpdate = new Set<(namespace: string) => void>();
  public static onTaskUpdate = new Set<(namespace: string, taskId: string) => void>();
  public static onTaskFlush = new Set<(namespace: string, taskId: string, lines: Array<Buffer>) => void>();

  public onTaskUpdate = new Set<(taskId: string) => void>();

  static notifyUpdate(namespace: string) {
    for (const fn of Controller.onNamespaceUpdate) {
      fn(namespace);
    }
  }

  static getNamespaces() {
    return [...Controller.instances.keys()];
  }

  static tryGet(namespace: string) {
    return this.instances.get(namespace) ?? null;
  }

  static get(namespace: string) {
    const controller = this.instances.get(namespace);
    if (typeof controller === `undefined`)
      throw new Error(`Namespace not found`);

    return controller;
  }

  static upsert(namespace: string) {
    let controller = this.instances.get(namespace);
    if (typeof controller === `undefined`) {
      this.instances.set(namespace, controller = new Controller(namespace));
      for (const fn of Controller.onNamespaceUpdate) {
        fn(namespace);
      }
    }

    return controller;
  }

  private debugLog: any;

  private configPath: PortablePath | null = null;
  private tasks = new Map<string, Task>();

  private description: {
    type: `string`;
    value: string;
  } | {
    type: `file`;
    path: PortablePath;
    value: string;
  } | null = null;

  private watched = true;
  private stopWatch = () => {};
  private configWatcher: chokidar.FSWatcher;
  private descriptionWatcher: chokidar.FSWatcher;

  private constructor(public namespace: string) {
    this.debugLog = debug(`mb:controller:${namespace}`);

    this.onTaskUpdate.add(taskId => {
      for (const fn of Controller.onTaskUpdate) {
        fn(this.namespace, taskId);
      }
    });

    this.configWatcher = chokidar.watch([]);
    this.descriptionWatcher = chokidar.watch([]);

    this.configWatcher.on(`change`, async () => {
      this.debugLog(`Detected a change in the configuration`);

      const {config} = await openConfig(this.configPath!);
      this.sync(config);
    });

    this.descriptionWatcher.on(`change`, async () => {
      if (this.description?.type !== `file`)
        return;

      this.debugLog(`Detected a change in the description file`);
      try {
        this.description.value = await xfs.readFilePromise(this.description.path, `utf8`);
      } catch {
        return;
      }

      for (const fn of Controller.onNamespaceUpdate) {
        fn(this.namespace);
      }
    });
  }

  watch(enabled: boolean) {
    this.stopWatch?.();
    this.stopWatch = () => {};

    this.watched = enabled;
    if (this.watched) {
      if (this.configPath) {
        const p = npath.fromPortablePath(this.configPath);
        this.configWatcher.add(p);

        const stopWatch = this.stopWatch;
        this.stopWatch = () => {
          this.configWatcher.unwatch(p);
          stopWatch();
        };
      }

      if (this.description?.type === `file`) {
        const p = npath.fromPortablePath(this.description.path);
        this.descriptionWatcher.add(p);

        const stopWatch = this.stopWatch;
        this.stopWatch = () => {
          this.descriptionWatcher.unwatch(p);
          stopWatch();
        };
      }
    }
  }

  sync(config: Configuration) {
    this.configPath = config.path;

    if (typeof config.descriptionFile !== `undefined`) {
      const descriptionFile = ppath.join(ppath.dirname(config.path), config.descriptionFile as PortablePath);

      let description;
      try {
        description = xfs.readFileSync(descriptionFile, `utf8`);
      } catch {
        description = `Failed to open the requested description file.`;
      }

      this.description = {type: `file`, path: descriptionFile, value: description};
    } else if (typeof config.description !== `undefined`) {
      this.description = {type: `string`, value: config.description};
    } else {
      this.description = null;
    }

    const currentTasks = new Set(Object.keys(config.tasks));

    for (const task of this.tasks.values())
      if (!currentTasks.has(task.id))
        task.stop();

    for (const [taskId, taskConfig] of Object.entries(config.tasks)) {
      let task = this.tasks.get(taskId);
      if (typeof task === `undefined`)
        this.tasks.set(taskId, task = new Task(this, taskId));

      task.sync(taskConfig);
    }

    this.watch(this.watched);

    for (const fn of Controller.onNamespaceUpdate) {
      fn(this.namespace);
    }
  }

  getInfo() {
    return {
      id: this.namespace,
      name: this.namespace,
      configPath: this.configPath,
      description: this.description?.value ?? null,
      taskCount: this.tasks.size,
      watched: this.watched,
    };
  }

  getTasks() {
    return [...this.tasks.values()];
  }

  tryTask(taskId: string) {
    return this.tasks.get(taskId) ?? null;
  }

  getTask(taskId: string) {
    const task = this.tryTask(taskId);
    if (task === null)
      throw new Error(`Task not found`);

    return task;
  }
}

export type ControllerInfo = ReturnType<Controller[`getInfo`]>;

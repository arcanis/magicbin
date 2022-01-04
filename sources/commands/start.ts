import {ppath}                         from '@yarnpkg/fslib';
import {Command, Option}               from 'clipanion';

import type {Context}                  from '../cli';
import {findConfig}                    from '../config';
import {Controller}                    from '../controller';
import {daemon}                        from '../daemon';
import {isCompletedStatus, TaskStatus} from '../types';

export class StartCommand extends Command<Context> {
  static paths = [[`start`]];

  static usage = Command.Usage({
    description: `Start a task`,
  });

  force = Option.Boolean(`-f,--force`, {
    description: `If set, restart the service if it's already running`,
  });

  task = Option.String();

  execute = daemon.register(async () => {
    const {config} = await findConfig(ppath.cwd());
    const controller = Controller.upsert(config.namespace);

    const task = controller.getTask(this.task);
    if (!isCompletedStatus(task.status) && !this.force)
      return;

    const promise = new Promise<void>((resolve, reject) => {
      const listener = (namespace: string, taskId: string) => {
        if (namespace === config.namespace && taskId === task.id) {
          const status = Controller.tryGet(namespace)?.tryTask(taskId)?.status;
          if (status === TaskStatus.RUNNING) {
            Controller.onTaskUpdate.delete(listener);
            resolve();
          }
        }
      };

      Controller.onTaskUpdate.add(listener);
    });

    task.reboot();
    await promise;
  });
}

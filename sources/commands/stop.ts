import {ppath}                         from '@yarnpkg/fslib';
import {Command, Option}               from 'clipanion';

import type {Context}                  from '../cli';
import {findConfig}                    from '../config';
import {Controller}                    from '../controller';
import {daemon}                        from '../daemon';
import {isCompletedStatus, TaskStatus} from '../types';

export class StopCommand extends Command<Context> {
  static paths = [[`stop`]];

  static usage = Command.Usage({
    description: `Stop a task`,
  });

  task = Option.String();

  execute = daemon.register(async () => {
    const {config} = await findConfig(ppath.cwd());
    const controller = Controller.upsert(config.namespace);

    const task = controller.getTask(this.task);
    if (!isCompletedStatus(task.status))
      return;

    const promise = new Promise<void>((resolve, reject) => {
      const listener = (namespace: string, taskId: string) => {
        if (namespace === config.namespace && taskId === task.id) {
          const status = Controller.tryGet(namespace)?.tryTask(taskId)?.status;
          if (status === TaskStatus.CANCELLED) {
            Controller.onTaskUpdate.delete(listener);
            resolve();
          }
        }
      };

      Controller.onTaskUpdate.add(listener);
    });

    task.stop();
    await promise;
  });
}

import {ppath}        from '@yarnpkg/fslib';
import {Command}      from 'clipanion';

import type {Context} from '../cli';
import {findConfig}   from '../config';
import {Controller}   from '../controller';
import {daemon}       from '../daemon';

export class ListCommand extends Command<Context> {
  static paths = [[`list`], [`ls`]];

  static usage = Command.Usage({
    description: `Display the list of tasks and their state`,
  });

  execute = daemon.register(async () => {
    const {config} = await findConfig(ppath.cwd());
    const controller = Controller.upsert(config.namespace);

    const tasks = controller.getTasks();
    for (const task of tasks) {
      this.context.stdout.write(`${task.id}\n`);
    }
  });
}

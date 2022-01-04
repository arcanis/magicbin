import {ppath}           from '@yarnpkg/fslib';
import {Command, Option} from 'clipanion';
import open              from 'open';

import type {Context}    from '../cli';
import {SERVER_PORT}     from '../common/constants';
import {findConfig}      from '../config';
import {Controller}      from '../controller';
import {daemon}          from '../daemon';

export class SyncCommand extends Command<Context> {
  static paths = [[`sync`]];

  static usage = Command.Usage({
    description: `Synchronize the daemon with the local configuration`,
  });

  open = Option.Boolean(`-o,--open`, {
    description: `If set, open the browser once the sync has completed`,
  });

  execute = daemon.register(async () => {
    const {config} = await findConfig(ppath.cwd());
    const controller = Controller.upsert(config.namespace);

    await controller.sync(config);

    if (this.open) {
      open(`http://localhost:${SERVER_PORT}`);
    }
  });
}

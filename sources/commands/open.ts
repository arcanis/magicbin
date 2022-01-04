import {Command}      from 'clipanion';
import open           from 'open';

import type {Context} from '../cli';
import {SERVER_PORT}  from '../common/constants';
import {daemon}       from '../daemon';

export class OpenCommand extends Command<Context> {
  static paths = [[`open`]];

  static usage = Command.Usage({
    description: `Open the magicbin dashboard in your browser`,
  });

  execute = daemon.register(async () => {
    open(`http://localhost:${SERVER_PORT}`);
  });
}

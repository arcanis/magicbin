import {Command, Option} from 'clipanion';
import * as t            from 'typanion';

import type {Context}    from '../cli';
import {daemon}          from '../daemon';

export class TailCommand extends Command<Context> {
  static paths = [[`tail`]];

  static usage = Command.Usage({
    description: `Display the output of a given task`,
  });

  follow = Option.Boolean(`-f,--follow`, false, {
    description: `If true, output appended lines as the logs grow`,
  });

  lines = Option.String(`-n,--lines`, `10`, {
    description: `Output the specified amount of lines, starting from the end`,
    validator: t.applyCascade(t.isNumber(), [t.isInteger(), t.isPositive()]),
  });

  task = Option.String();

  execute = daemon.register(async () => {
    throw new Error(`Currently broken`);
  });
}

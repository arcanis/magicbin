import {ppath, xfs}      from '@yarnpkg/fslib';
import {Command, Option} from 'clipanion';

import type {Context}    from '../cli';
import {CONFIG_FILE}     from '../common/constants';

export class InitCommand extends Command<Context> {
  static paths = [[`init`]];

  static usage = Command.Usage({
    description: `Create a default configuration if there isn't one already`,
  });

  name = Option.String();

  async execute() {
    const configPath = ppath.join(ppath.cwd(), CONFIG_FILE);
    if (await xfs.existsPromise(configPath))
      return;

    await xfs.writeFilePromise(configPath, [
      `// @ts-check\n`,
      `\n`,
      `/** @type {import('magicbin').Configuration} */\n`,
      `module.exports = {\n`,
      `  namespace: \`${this.name}\`,\n`,
      `  tasks: {\n`,
      `    showTime: {\n`,
      `      name: \`Show Current Time\`,\n`,
      `      shell: \`date\`,\n`,
      `      rebootInterval: 1000,\n`,
      `    },\n`,
      `  },\n`,
      `};\n`,
    ].join(``));
  }
}

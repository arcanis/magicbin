import {Builtins, Cli} from 'clipanion';
import {DaemonContext} from 'griselbrand';

import {InitCommand}   from './commands/init';
import {ListCommand}   from './commands/list';
import {OpenCommand}   from './commands/open';
import {StartCommand}  from './commands/start';
import {StopCommand}   from './commands/stop';
import {SyncCommand}   from './commands/sync';
import {TailCommand}   from './commands/tail';
import {daemon}        from './daemon';

export type Context = DaemonContext & {
};

const cli = new Cli<DaemonContext>({
  binaryName: `yarn mb`,
  binaryLabel: `Magic Bin`,
  binaryVersion: require(`magicbin/package.json`).version,
});

for (const command of daemon.getControlCommands([`daemon`]))
  cli.register(command);

cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);

cli.register(InitCommand);
cli.register(ListCommand);
cli.register(OpenCommand);
cli.register(StartCommand);
cli.register(StopCommand);
cli.register(SyncCommand);
cli.register(TailCommand);

daemon.runExit(cli, process.argv.slice(2));

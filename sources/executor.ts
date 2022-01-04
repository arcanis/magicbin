import {ChildProcessByStdio, spawn}                from 'child_process';
import {PassThrough}                               from 'stream';
import {style}                                     from 'term-strings';

import {isShellTask, ShellTask, TaskConfiguration} from './types';

const childProcesses = new Set<ChildProcessByStdio<null, any, any>>();

const formatDate = () => {
  const now = new Date();

  const dateStr = new Intl.DateTimeFormat(`sv`, {
    year: `numeric`, month: `numeric`, day: `numeric`,
  }).format(now);

  const timeStr = new Intl.DateTimeFormat(`en-US`, {
    hour: `numeric`, minute: `numeric`, second: `numeric`,
    hour12: false,
  }).format(now);

  return `${dateStr} ${timeStr}`;
};

const getShell = (cwd: string) => [
  style.color.front.turquoise.in,
  formatDate(),
  ` `,
  style.color.front.orange.in,
  cwd.replace(/^\/(home\/|Users\/|(?=root\/))/, `~`),
  style.color.front.turquoise.in,
  ` $ `,
  style.color.front.out,
].join(``);

process.on(`beforeExit`, () => {
  for (const child of childProcesses) {
    process.kill(-child.pid!, `SIGTERM`);
  }
});

export abstract class Executor {
  static create(token: string, config: TaskConfiguration) {
    if (isShellTask(config))
      return new ShellExecutor(token, config);

    return null;
  }

  abstract accept(config: TaskConfiguration): boolean;
  abstract abort(): Promise<void>;

  public abstract get boot(): Promise<void>;
  public abstract get execution(): Promise<number>;
  public abstract get running(): boolean;

  public onmessage: ((chunk: Buffer) => void) | undefined;
}

class ShellExecutor extends Executor {
  private shell: string;

  public boot: Promise<void>;
  public execution: Promise<number>;
  public running = true;

  private child?: ChildProcessByStdio<null, any, any>;

  constructor(token: string, config: ShellTask) {
    super();

    const fence = config.fence ?? true;
    this.shell = config.shell;

    const logStream = new PassThrough();
    logStream.on(`data`, chunk => {
      this.onmessage?.(chunk);
    });

    this.boot = Promise.resolve();
    this.execution = Promise.resolve().then(() => new Promise<number>((resolve, reject) => {
      if (fence)
        logStream.write(`${getShell(config.cwd!)}${this.shell}\n\n`);

      const child = this.child = spawn(this.shell, [], {
        shell: true,
        env: {...process.env, CLIPANION_DAEMON: undefined, MAGICBIN_TOKEN: token, FORCE_COLOR: `3`},
        stdio: [`ignore`, `pipe`, `pipe`],
        detached: true,
      });

      if (typeof child.pid !== `undefined`)
        childProcesses.add(child);

      child.stdout!.on(`data`, chunk => {
        logStream.write(chunk);
      });

      child.stderr!.on(`data`, chunk => {
        logStream.write(chunk);
      });

      child.on(`error`, error => {
        if (!this.running)
          return;

        logStream.write(`${error.stack}\n`);
        resolve(1);
      });

      child.on(`exit`, code => {
        if (!this.running)
          return;

        const effectiveCode = code ?? 1;

        if (fence) {
          if (code === 0) {
            logStream.write(`\n${style.color.front.darkseagreen.in}Process exited successfully${style.color.front.out}\n\n`);
          } else {
            logStream.write(`\n${style.color.front.lightcoral.in}Process failed with exit code ${effectiveCode}${style.color.front.out}\n\n`);
          }
        }

        resolve(effectiveCode);
      });
    })).finally(() => {
      if (typeof this.child !== `undefined`)
        childProcesses.delete(this.child);

      this.running = false;
    });
  }

  accept(config: ShellTask) {
    return config.shell === this.shell;
  }

  async abort() {
    const child = this.child;
    if (!child)
      return;

    const hardExitTimeout = setTimeout(() => {
      this.child?.stdout.write(`The child process didn't exit cleanly after the timeout; sending a SIGKILL to abort it forcefully.\n`);
      process.kill(-child.pid!, `SIGKILL`);
    }, 5000);

    await new Promise<void>(resolve => {
      child.on(`exit`, resolve);
      process.kill(-child.pid!, `SIGTERM`);
    });

    clearTimeout(hardExitTimeout);
    this.running = false;
  }
}

export function createToken(namespace: string, taskId: string) {
  return Buffer.from(JSON.stringify([namespace, taskId])).toString(`base64`);
}

export function parseToken(str: string): [namespace: string, taskId: string] {
  return JSON.parse(Buffer.from(str, `base64`).toString());
}

export class Deferred<T = void> {
  public promise!: Promise<T>;

  public resolve!: (value: T) => void;
  public reject!: (error?: any) => void;

  constructor() {
    this.reset();
  }

  reset() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

export class CancelledOperation extends Error {
  constructor() {
    super(`Operation cancelled`);
  }
}

export type UseCancel = <T>(promise: Promise<T>) => Promise<T>;

export function cancelAwareGenerator<T, TArgs extends Array<any> = []>(genFn: (useCancel: <T>(promise: Promise<T>) => Promise<T>, ...args: TArgs) => AsyncGenerator<T, void, unknown>): (...args: TArgs) => AsyncGenerator<T, void, unknown> {
  return function (...args: TArgs) {
    const useCancel = <T>(promise: Promise<T>) => {
      return Promise.race([cancel.promise, promise]) as Promise<T>;
    };

    const cancel = new Deferred<void>();
    const gen = genFn(useCancel, ...args);

    const nextFn: typeof gen.next = async (...args) => {
      try {
        return await gen.next(...args);
      } catch (err) {
        if (err instanceof CancelledOperation) {
          return {value: undefined, done: true};
        } else {
          throw err;
        }
      }
    };

    const throwFn: typeof gen.throw = (...args) => {
      cancel.reject(new CancelledOperation());
      return gen.throw(...args);
    };

    const returnFn: typeof gen.return = (...args) => {
      cancel.reject(new CancelledOperation());
      return gen.return(...args);
    };

    const iterable: AsyncGenerator<T, void, unknown> = {
      [Symbol.asyncIterator]: () => iterable,
      next: nextFn,
      throw: throwFn,
      return: returnFn,
    };

    return iterable;
  };
}

export async function * watchEvents<TArgs extends Array<any>>(useCancel: UseCancel, set: Set<(...args: TArgs) => void>) {
  let queue: Array<TArgs> = [];
  let lock = new Deferred();

  const handler = (...args: TArgs) => {
    queue.push(args);
    lock.resolve();
  };

  set.add(handler);

  try {
    while (true) {
      await useCancel(lock.promise);
      const value = queue;

      queue = [];
      lock = new Deferred();

      yield value;
    }
  } finally {
    set.delete(handler);
  }
}

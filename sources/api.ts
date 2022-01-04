import debug                                  from 'debug';
import {buildSchema}                          from 'graphql';

import {graphqlTypes}                         from './common/graphqlTypes';
import {Controller, ControllerInfo, TaskInfo} from './controller';
import {NamespaceAction, TaskAction}          from './types';
import {cancelAwareGenerator, watchEvents}    from './utils';

const debugApiLog = debug(`mb:api`);

export const schema = buildSchema(`
  ${graphqlTypes}

  type Query {
    namespaces: [Namespace!]!
    namespace(namespace: String!): Namespace
    tasks(namespace: String!): [Task!]
    task(namespace: String!, taskId: String!): Task
  }

  type Subscription {
    namespaces(namespace: String): [NamespaceUpdate!]!
    tasks(namespace: String!, taskId: String): [TaskUpdate!]!
    buffer(namespace: String!, taskId: String!): String!
  }

  type Mutation {
    namespaceAction(namespace: String! action: NamespaceAction!): NamespaceActionMutation
    taskAction(namespace: String!, taskId: String!, action: TaskAction!): TaskActionMutation
  }
`);

export const resolvers = {
  Query: {
    namespaces(_: any, args: any) {
      return Controller.getNamespaces().map(namespace => {
        return Controller.get(namespace).getInfo();
      });
    },
    namespace(_: any, args: any) {
      return Controller.tryGet(args.namespace)?.getInfo() ?? null;
    },
    tasks(_: any, args: any) {
      return Controller.tryGet(args.namespace)?.getTasks()?.map(task => task.getInfo()) ?? null;
    },
    task(_: any, args: any) {
      return Controller.tryGet(args.namespace)?.tryTask(args.taskId)?.getInfo() ?? null;
    },
  },
  Mutation: {
    namespaceAction(_: any, args: any) {
      switch (args.action) {
        case NamespaceAction.UNWATCH: {
          const controller = Controller.get(args.namespace);
          controller.watch(false);
          Controller.notifyUpdate(controller.namespace);
        } break;

        case NamespaceAction.WATCH: {
          const controller = Controller.get(args.namespace);
          controller.watch(true);
          Controller.notifyUpdate(controller.namespace);
        } break;

        case NamespaceAction.STOP: {
          const controller = Controller.get(args.namespace);
          for (const task of controller.getTasks()) {
            task.stop();
          }
        } break;

        case NamespaceAction.REBOOT: {
          const controller = Controller.get(args.namespace);
          for (const task of controller.getTasks()) {
            task.reboot();
          }
        } break;
      }

      return {success: true};
    },
    taskAction(_: any, args: any) {
      switch (args.action) {
        case TaskAction.STOP: {
          Controller.get(args.namespace).getTask(args.taskId).stop();
        } break;

        case TaskAction.REBOOT: {
          Controller.get(args.namespace).getTask(args.taskId).reboot();
        } break;

        case TaskAction.CLEAR: {
          Controller.get(args.namespace).getTask(args.taskId).clear();
        } break;
      }

      return {success: true};
    },
  },
  Subscription: {
    buffer: cancelAwareGenerator<{
      buffer: string;
    }, [any]>(async function * (useCancel, args) {
      debugApiLog(`Registering a new subscription on /buffer`);

      const controller = Controller.tryGet(args.namespace);
      const task = controller?.tryTask(args.taskId);
      if (task) {
        const lines = task.tail(100);
        const buffer = Buffer.concat(lines);
        yield {buffer: buffer.toString(`base64`)};
      }

      const producer = watchEvents(useCancel, Controller.onTaskFlush);
      try {
        do {
          const record = await producer.next();
          if (record.done)
            break;

          const relevantUpdates = record.value.filter(([namespace, taskId]) => namespace === args.namespace && taskId === args.taskId);
          if (relevantUpdates.length === 0)
            continue;

          const aggregatedBuffer = Buffer.concat(relevantUpdates.flatMap(([,, lines]) => lines));
          if (aggregatedBuffer.length === 0)
            continue;

          yield {buffer: aggregatedBuffer.toString(`base64`)};
        } while (true);
      } finally {
        debugApiLog(`Releasing subscription on /buffer`);
        producer.return();
      }
    }),

    namespaces: cancelAwareGenerator<{
      namespaces: Array<{pointer: {id: string}, entity: ControllerInfo | null}>;
    }, [any]>(async function * (useCancel, args) {
      debugApiLog(`Registering a new subscription on /namespaces`);

      const filter = typeof args.namespace !== `undefined`
        ? ([namespace]: [string]) => namespace === args.namespace
        : ([namespace]: [string]) => true;

      yield {
        namespaces: Controller.getNamespaces().filter(namespace => {
          return filter([namespace]);
        }).map(namespace => ({
          pointer: {id: namespace},
          entity: Controller.get(namespace).getInfo(),
        })),
      };

      const producer = watchEvents(useCancel, Controller.onNamespaceUpdate);
      try {
        do {
          const record = await producer.next();
          if (record.done)
            break;

          const relevantUpdates = record.value.filter(filter);
          if (relevantUpdates.length === 0)
            continue;

          const deduplicatedIds = new Set(relevantUpdates.map(([namespace]) => {
            return namespace;
          }));

          const namespaces = [...deduplicatedIds].map(namespace => ({
            pointer: {id: namespace},
            entity: Controller.tryGet(namespace)?.getInfo() ?? null,
          }));

          yield {namespaces};
        } while (true);
      } finally {
        debugApiLog(`Releasing subscription on /namespaces`);
        producer.return();
      }
    }),

    tasks: cancelAwareGenerator<{
      tasks: Array<{pointer: {id: string}, entity: TaskInfo | null}>;
    }, [any]>(async function * (useCancel, args) {
      debugApiLog(`Registering a new subscription on /tasks`);

      const filter = typeof args.taskId !== `undefined`
        ? ([namespace, taskId]: [string, string]) => namespace === args.namespace && taskId === args.taskId
        : ([namespace]: [string, string]) => namespace === args.namespace;

      const controller = Controller.tryGet(args.namespace);
      if (controller) {
        yield {
          tasks: controller.getTasks().filter(task => {
            return filter([args.namespace, task.id]);
          }).map(task => ({
            pointer: {id: task.id},
            entity: task.getInfo(),
          })),
        };
      }

      const producer = watchEvents(useCancel, Controller.onTaskUpdate);
      try {
        do {
          const record = await producer.next();
          if (record.done)
            break;

          const relevantUpdates = record.value.filter(filter);
          if (relevantUpdates.length === 0)
            continue;

          const deduplicatedIds = new Set(relevantUpdates.map(([, taskId]) => {
            return taskId;
          }));

          const tasks = [...deduplicatedIds].map(taskId => ({
            pointer: {id: taskId},
            entity: Controller.tryGet(args.namespace)?.tryTask(taskId)?.getInfo() ?? null,
          }));

          yield {tasks};
        } while (true);
      } finally {
        debugApiLog(`Releasing subscription on /tasks`);
        producer.return();
      }
    }),
  },
};

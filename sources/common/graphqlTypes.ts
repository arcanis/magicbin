export const graphqlTypes = `
  enum NamespaceAction {
    WATCH
    UNWATCH
    REBOOT
    STOP
  }

  enum TaskAction {
    REBOOT
    STOP
    CLEAR
  }

  type Task {
    id: String!
    name: String!
    description: String
    status: String!
  }

  type TaskPointer {
    id: String!
  }

  type TaskUpdate {
    pointer: TaskPointer!
    entity: Task
  }

  type Namespace {
    id: String!
    name: String!
    configPath: String!
    watched: Boolean!
    description: String
    taskCount: Int!
  }

  type NamespacePointer {
    id: String!
  }

  type NamespaceUpdate {
    pointer: NamespacePointer!
    entity: Namespace
  }

  type NamespaceActionMutation {
    success: Boolean!
  }

  type TaskActionMutation {
    success: Boolean!
  }
`;

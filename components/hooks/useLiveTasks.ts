import {TaskInfo}   from '../../sources/controller';

import {useGraphql} from './useGraphql';

const TasksQuery = `
  query ($namespace: String!) {
    tasks(namespace: $namespace) {
      __typename
      id
      name
      status
    }
  }
`;

const TasksSubscription = `
  subscription ($namespace: String!) {
    tasks(namespace: $namespace) {
      pointer {
        __typename
        id
      }
      entity {
        __typename
        id
        name
        status
      }
    }
  }
`;

export function useLiveTasks(namespace: string | undefined) {
  const {useLiveCollection} = useGraphql();

  return useLiveCollection<TaskInfo & {
    __typename: string;
  }>({
    query: TasksQuery,
    subscription: TasksSubscription,
    variables: {namespace},
    sortBy: `name`,
  });
}

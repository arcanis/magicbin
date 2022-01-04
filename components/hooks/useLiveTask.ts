import {TaskInfo}   from '../../sources/controller';

import {useGraphql} from './useGraphql';

const TaskQuery = `
  query ($namespace: String!, $taskId: String!) {
    task(namespace: $namespace, taskId: $taskId) {
      __typename
      id
      name
      status
    }
  }
`;

const TaskSubscription = `
  subscription ($namespace: String!, $taskId: String!) {
    tasks(namespace: $namespace, taskId: $taskId) {
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

export function useLiveTask(namespace: string | undefined, taskId: string | undefined) {
  const {useLiveEntity} = useGraphql();

  return useLiveEntity<TaskInfo & {
    __typename: string;
  }>({
    query: TaskQuery,
    subscription: TaskSubscription,
    variables: {namespace, taskId},
  });
}

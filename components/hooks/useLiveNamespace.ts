import {ControllerInfo, TaskInfo} from '../../sources/controller';

import {useGraphql}               from './useGraphql';

const NamespaceQuery = `
  query ($namespace: String!) {
    namespace(namespace: $namespace) {
      __typename
      id
      name
      configPath
      description
      watched
      taskCount
    }
  }
`;

const NamespaceSubscription = `
  subscription ($namespace: String!) {
    namespaces(namespace: $namespace) {
      pointer {
        __typename
        id
      }
      entity {
        __typename
        id
        name
        configPath
        description
        watched
        taskCount
      }
    }
  }
`;

export function useLiveNamespace(namespace: string | undefined) {
  const {useLiveEntity} = useGraphql();

  return useLiveEntity<ControllerInfo & {
    __typename: string;
  }>({
    query: NamespaceQuery,
    subscription: NamespaceSubscription,
    variables: {namespace},
  });
}

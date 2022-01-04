import {ControllerInfo} from '../../sources/controller';

import {useGraphql}     from './useGraphql';

const NamespacesQuery = `
  query {
    namespaces {
      __typename
      id
      name
      taskCount
    }
  }
`;

const NamespacesSubscription = `
  subscription {
    namespaces {
      pointer {
        __typename
        id
      }
      entity {
        __typename
        id
        name
        taskCount
      }
    }
  }
`;

export function useLiveNamespaces() {
  const {useLiveCollection} = useGraphql();

  return useLiveCollection<ControllerInfo & {
    __typename: string;
  }>({
    query: NamespacesQuery,
    subscription: NamespacesSubscription,
    sortBy: `name`,
  });
}

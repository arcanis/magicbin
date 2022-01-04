import {Client, createClient as createWSClient, ExecutionResult} from 'graphql-ws';
import ws                                                        from 'isomorphic-ws';
import ReactDOM                                                  from 'react-dom';
import React, {useCallback, useContext, useEffect, useState}     from 'react';
import * as t                                                    from 'typanion';

import {SERVER_PORT}                                             from '../../sources/common/constants';

const GraphqlClientContext = React.createContext<GraphqlClient | null>(null);

const isEntity = t.isObject({
  __typename: t.isString(),
  id: t.isString(),
}, {
  extra: t.isDict(t.isUnknown()),
});

const isEntityPlaceholder = t.isObject({
  __entityKey: t.isNullable(t.isString()),
});

const isEntityUpdate = t.isObject({
  pointer: isEntity,
  entity: t.isOptional(isEntity),
});

const isEntityPlaceholderArray = t.isArray(isEntityPlaceholder);
const isEntityUpdateArray = t.isArray(isEntityUpdate);

const getEntityKey = (entity: t.InferType<typeof isEntity>) => {
  return `${entity.__typename}\0${entity.id}`;
};

type ResolvedDeferred<T> = {
  resolved: true;
  value: T;
};

type RejectedDeferred = {
  resolved: false;
  error: any;
};

class Deferred<T> {
  promise: Promise<T>;

  resolve!: (val: T) => void;
  reject!: (err: any) => void;

  fulfilled:
  | ResolvedDeferred<T>
  | RejectedDeferred
  | null = null;

  static resolve<T>(val: T) {
    const deferred = new Deferred<T>();
    deferred.resolve(val);
    return deferred;
  }

  static reject(error: any) {
    const deferred = new Deferred<any>();
    deferred.resolve(error);
    return deferred;
  }

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = value => {
        if (this.fulfilled) return;
        this.fulfilled = {resolved: true, value};
        resolve(value);
      };

      this.reject = error => {
        if (this.fulfilled) return;
        this.fulfilled = {resolved: false, error};
        reject(error);
      };
    });
  }
}

let wsClient: Client | undefined;

export class GraphqlClient {
  private entityCache = new Map<string, t.InferType<typeof isEntity>>();
  private requestCache = new Map<string, Deferred<unknown>>();

  private onEntityChange = new Set<(cacheKey: Array<string>) => void>();

  private static get ws() {
    if (typeof wsClient === `undefined`) {
      wsClient = createWSClient({
        url: `ws://localhost:${SERVER_PORT}/ws`,
        webSocketImpl: ws,
      });
    }

    return wsClient;
  }

  constructor({rawRequestCache = [], rawEntityCache = []}: {rawRequestCache?: Array<[string, unknown]>, rawEntityCache?: Array<[string, t.InferType<typeof isEntity>]>} = {}) {
    this.entityCache = new Map(rawEntityCache);
    this.requestCache = new Map(rawRequestCache.map(([key, resolution]) => {
      return [key, Deferred.resolve(resolution)] as const;
    }));
  }

  getCacheData() {
    const rawEntityCache = [...this.entityCache];
    const rawRequestCache = [...this.requestCache].map(([key, deferred]) => {
      return [key, deferred.fulfilled] as const;
    }).filter((item): item is [string, ResolvedDeferred<unknown>] => {
      return item[1]?.resolved ?? false;
    }).map(([key, resolution]): [string, unknown] => {
      return [key, resolution.value];
    });

    return {
      rawRequestCache,
      rawEntityCache,
    };
  }

  useQuery = <T>({query, variables}: {query: string, variables?: Record<string, any>}): T => {
    const deferred = this.performCachedQuery({query, variables});
    if (!deferred.fulfilled)
      throw deferred.promise;

    if (!deferred.fulfilled.resolved)
      throw deferred.fulfilled.error;

    const {hydrated, dependencies} = this.hydrateEntity(deferred.fulfilled.value);
    this.useEntityWatch(dependencies);

    return hydrated;
  };

  useMutation = (query: string) => {
    const mutate = useCallback(async (variables?: Record<string, any>) => {
      const data = await this.performAsyncQuery({query, variables});
      return this.hydrateEntity(data).hydrated;
    }, [query]);

    return [mutate] as const;
  };

  useSubscription = <T>({query, variables}: {query: string, variables?: Record<string, any>}, cb?: (data: T) => void) => {
    const next = ({data}: {data: T}) => {
      const importedData = this.importEntities(data);
      cb?.(this.hydrateEntity(importedData).hydrated);
    };

    useEffect(() => GraphqlClient.ws.subscribe<T>({query, variables}, {
      next: downgradeExceptions(next),
      error: websocketError,
      complete: () => {},
    }), [query, JSON.stringify(variables)]);
  };

  useLiveEntity = <T extends {__typename: string, id: string}>({query, subscription, variables}: {query: string, subscription: string, variables?: Record<string, any>}) => {
    const deferred = this.performCachedQuery({query, variables});
    if (!deferred.fulfilled)
      throw deferred.promise;

    if (!deferred.fulfilled.resolved)
      throw deferred.fulfilled.error;

    if (typeof deferred.fulfilled.value !== `object` || !deferred.fulfilled.value || Array.isArray(deferred.fulfilled.value))
      throw new Error(`The subscription must return its result through an object`);

    const keys = Object.keys(deferred.fulfilled.value as any);
    if (keys.length !== 1)
      throw new Error(`The query must return exactly one result`);

    const initialEntity = (deferred.fulfilled.value as any)[keys[0]] as unknown;
    if (!t.isNullable(isEntityPlaceholder)(initialEntity))
      throw new Error(`The query must return an entity (${JSON.stringify(initialEntity)}), or null`);

    const [entityKey, setEntityKey] = useState(initialEntity?.__entityKey ?? null);

    useEffect(() => {
      const next = ({data}: ExecutionResult<unknown, unknown>) => {
        if (typeof data !== `object` || !data || Array.isArray(data))
          throw new Error(`The subscription must return its result through an object`);

        const keys = Object.keys(data);
        if (keys.length !== 1)
          throw new Error(`The subscription must return exactly one result`);

        const entityUpdates = (data as any)[keys[0]] as unknown ?? [];
        if (!isEntityUpdateArray(entityUpdates))
          throw new Error(`The subscription must provide a set of entity updates`);

        const entities: Array<unknown> = [];

        ReactDOM.unstable_batchedUpdates(() => {
          for (const {entity} of entityUpdates) {
            if (entity) {
              entities.push(entity);
              setEntityKey(getEntityKey(entity));
            } else {
              setEntityKey(null);
            }
          }

          this.importEntities(entities);
        });
      };

      return GraphqlClient.ws.subscribe<T>({query: subscription, variables}, {
        next: downgradeExceptions(next),
        error: websocketError,
        complete: () => {},
      });
    }, [
      subscription,
      JSON.stringify(variables),
    ]);

    const {hydrated, dependencies} = this.hydrateEntity({__entityKey: entityKey});
    this.useEntityWatch(dependencies);

    return hydrated as T | null;
  };

  useLiveCollection = <T extends {__typename: string, id: string}>({query, subscription, variables, sortBy}: {query: string, subscription: string, variables?: Record<string, any>, sortBy?: string}) => {
    const deferred = this.performCachedQuery({query, variables});
    if (!deferred.fulfilled)
      throw deferred.promise;

    if (!deferred.fulfilled.resolved)
      throw deferred.fulfilled.error;

    if (typeof deferred.fulfilled.value !== `object` || !deferred.fulfilled.value || Array.isArray(deferred.fulfilled.value))
      throw new Error(`The subscription must return its result through an object`);

    const keys = Object.keys(deferred.fulfilled.value as any);
    if (keys.length !== 1)
      throw new Error(`The query must return exactly one result`);

    const initialEntities = (deferred.fulfilled.value as any)[keys[0]] as unknown ?? [];
    if (!isEntityPlaceholderArray(initialEntities))
      throw new Error(`The query must return a set of entities (${JSON.stringify(initialEntities)})`);

    const [entitySet, setEntitySet] = useState(() => {
      return new Set(initialEntities.map(entity => {
        return entity.__entityKey;
      }));
    });

    useEffect(() => {
      const next = ({data}: ExecutionResult<unknown, unknown>) => {
        if (typeof data !== `object` || !data || Array.isArray(data))
          throw new Error(`The subscription must return its result through an object`);

        const keys = Object.keys(data);
        if (keys.length !== 1)
          throw new Error(`The subscription must return exactly one result`);

        const entityUpdates = (data as any)[keys[0]] as unknown ?? [];
        if (!isEntityUpdateArray(entityUpdates))
          throw new Error(`The subscription must provide a set of entity updates`);

        setEntitySet(entitySet => {
          const copy = new Set(entitySet);
          const entities: Array<unknown> = [];

          for (const {pointer, entity} of entityUpdates) {
            if (!entity) {
              copy.delete(getEntityKey(pointer));
            } else {
              entities.push(entity);
            }
          }

          ReactDOM.unstable_batchedUpdates(() => {
            const importedEntities = this.importEntities(entities);
            for (const importedEntity of importedEntities as any) {
              copy.add(importedEntity.__entityKey);
            }
          });

          return copy;
        });
      };

      return GraphqlClient.ws.subscribe<T>({query: subscription, variables}, {
        next: downgradeExceptions(next),
        error: websocketError,
        complete: () => {},
      });
    }, [
      subscription,
      JSON.stringify(variables),
    ]);

    const entityArray = [...entitySet].map(entityKey => ({
      __entityKey: entityKey,
    }));

    const {hydrated, dependencies} = this.hydrateEntity(entityArray);
    this.useEntityWatch(dependencies);

    return hydrated as Array<T>;
  };

  private importEntities(data: any) {
    const changedKeys: Array<string> = [];

    const importedData = traverseObject(data, (val: unknown) => {
      if (!isEntity(val))
        return val;

      const entityKey = getEntityKey(val);

      const cacheEntry = this.entityCache.get(entityKey) ?? {...val};
      this.entityCache.set(entityKey, cacheEntry);

      for (const [attributeName, attributeValue] of Object.entries(val)) {
        if (cacheEntry[attributeName] === attributeValue)
          continue;

        cacheEntry[attributeName] = attributeValue;
        changedKeys.push(entityKey);
      }

      return {__entityKey: entityKey};
    });

    if (changedKeys.length > 0)
      for (const fn of this.onEntityChange)
        fn(changedKeys);

    return importedData;
  }

  private hydrateEntity(data: unknown) {
    const dependencies = new Set<string>();

    const hydrated = traverseObject(data, val => {
      if (!isEntityPlaceholder(val))
        return val;

      const entityKey = val.__entityKey;
      if (entityKey === null)
        return null;

      const cacheEntry = this.entityCache.get(entityKey);
      dependencies.add(entityKey);

      return cacheEntry;
    });

    return {hydrated, dependencies};
  }

  private useEntityWatch(cacheKeys: Set<string>) {
    const [, forceUpdate] = useState({});

    useEffect(() => {
      const handler = (changedKeys: Array<string>) => {
        if (changedKeys.some(key => cacheKeys.has(key))) {
          forceUpdate({});
        }
      };

      this.onEntityChange.add(handler);
      return () => {
        this.onEntityChange.delete(handler);
      };
    }, [JSON.stringify([...cacheKeys].sort())]);
  }

  private async performAsyncQuery({query, variables}: {query: string, variables?: Record<string, any>}): Promise<any> {
    const {data} = await postRequest(query, variables);
    const entities = this.importEntities(data);
    return entities;
  }

  private performCachedQuery({query, variables}: {query: string, variables?: Record<string, any>}) {
    const cacheKey = JSON.stringify({query, variables});

    let cacheEntry = this.requestCache.get(cacheKey);
    if (!cacheEntry) {
      const deferred = new Deferred<unknown>();

      const fetch = this.performAsyncQuery({query, variables});
      fetch.then(deferred.resolve, deferred.reject);

      this.requestCache.set(cacheKey, cacheEntry = deferred);
    }

    return cacheEntry;
  }
}

const postRequest = (query: string, variables?: Record<string, any>) => {
  return fetch(`http://localhost:${SERVER_PORT}/graphql`, {
    method: `POST`,
    headers: {
      [`Content-Type`]: `application/json`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  }).then(async res => {
    if (res.status !== 200)
      throw new Error(`HTTP ${res.status} ${res.statusText}\n\n${await res.text()}`);

    return res.json();
  });
};

function traverseObject(val: unknown, cb: (val: unknown) => void): any {
  if (Array.isArray(val)) {
    for (let t = 0, T = val.length; t < T; ++t)
      val[t] = traverseObject(val[t], cb);

    return val;
  }

  if (typeof val !== `object` || !val)
    return val;

  const indexed = val as Record<string, unknown>;

  const keys = Object.keys(indexed);
  for (const key of keys)
    indexed[key] = traverseObject(indexed[key], cb);

  return cb(val);
}

export const GraphqlClientProvider = GraphqlClientContext.Provider;

export function useGraphql() {
  const client = useContext(GraphqlClientContext);
  if (!client)
    throw new Error(`Misconfigured client`);

  return {
    useQuery: client.useQuery,
    useLiveCollection: client.useLiveCollection,
    useLiveEntity: client.useLiveEntity,
    useMutation: client.useMutation,
    useSubscription: client.useSubscription,
  };
}

function websocketError(data: unknown) {
  console.error(`Something happened in the websocket subscription`, data);
}

function downgradeExceptions<Args extends Array<any>>(fn: (...args: Args) => void) {
  return (...args: Args) => {
    try {
      fn(...args);
    } catch (err: any) {
      console.error(err.message);
    }
  };
}

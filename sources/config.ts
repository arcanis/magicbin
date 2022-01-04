import {npath, PortablePath, ppath, xfs} from '@yarnpkg/fslib';
import {UsageError}                      from 'clipanion';
import {realpath}                        from 'fs/promises';

import {CONFIG_FILE}                     from './common/constants';
import {isConfiguration}                 from './types';

export async function openConfig(configFile: PortablePath) {
  const errors: Array<string> = [];

  const normalizedPath = await realpath(npath.fromPortablePath(configFile));
  delete require.cache[normalizedPath];

  const currentCache = require.cache;
  require.cache = Object.create(currentCache);

  const config = require(normalizedPath);
  require.cache = currentCache;

  if (!isConfiguration(config, {errors}))
    throw new UsageError(`Invalid configuration file found in ${npath.fromPortablePath(configFile)}\n\n${errors.join(`\n`)}`);

  for (const task of Object.values(config.tasks))
    task.cwd = ppath.resolve(configFile, (task.cwd ?? `.`) as PortablePath);

  return {root: ppath.dirname(configFile), config: {...config, path: configFile}};
}

export async function findConfig(p: PortablePath) {
  let current = ppath.resolve(p);
  let next = current;

  do {
    current = next;
    next = ppath.dirname(current);

    const configFile = ppath.join(current, CONFIG_FILE);
    if (!xfs.existsSync(configFile))
      continue;

    return await openConfig(configFile);
  } while (next !== current);

  throw new UsageError(`No Magic Bin configuration file found`);
}

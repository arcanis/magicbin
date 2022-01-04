import {daemon}                  from './daemon';
import {createToken, parseToken} from './utils';

export type {Configuration} from './types';
export {createToken, parseToken};

let confirmed = false;

export function confirmProcess() {
  if (typeof process.env.MAGICBIN_TOKEN === `undefined`)
    return;
  if (confirmed)
    return;

  confirmed = true;

  const [namespace, taskId] = parseToken(process.env.MAGICBIN_TOKEN);
  daemon.send({type: `confirm`, namespace, taskId});
}

import {PortablePath} from '@yarnpkg/fslib';
import * as t         from 'typanion';

export enum TaskStatus {
  PENDING = `pending`,
  STARTING = `starting`,
  RUNNING = `running`,
  STOPPING = `stopping`,
  SUCCESS = `success`,
  FAILED = `failed`,
  CANCELLED = `cancelled`,
}

export enum ConfirmationMode {
  NONE = `none`,
  MODERN = `modern`,
  GREP = `grep`,
}

export const isCompletedStatus = t.isEnum([
  TaskStatus.PENDING,
  TaskStatus.SUCCESS,
  TaskStatus.FAILED,
  TaskStatus.STOPPING,
  TaskStatus.CANCELLED,
]);

export enum TaskAction {
  REBOOT = `REBOOT`,
  STOP = `STOP`,
  CLEAR = `CLEAR`,
}

export enum NamespaceAction {
  WATCH = `WATCH`,
  UNWATCH = `UNWATCH`,
  REBOOT = `REBOOT`,
  STOP = `STOP`,
}

const isPositiveInteger = t.applyCascade(t.isNumber(), [
  t.isInteger(),
  t.isPositive(),
]);

export const isConfirmationMode = t.isOneOf([
  t.isEnum([ConfirmationMode.NONE, ConfirmationMode.MODERN]),
  t.isObject({type: t.isLiteral(ConfirmationMode.GREP), pattern: t.isInstanceOf(RegExp)}),
]);

export const isTaskSettings = t.isObject({
  cwd: t.isOptional(t.isString()),
  name: t.isOptional(t.isString()),
  backBufferRows: t.isOptional(isPositiveInteger),
  rebootInterval: t.isOptional(t.isNullable(isPositiveInteger)),
  rebootOnSuccess: t.isOptional(t.isBoolean()),
  rebootOnFailure: t.isOptional(t.isBoolean()),
  dependsOn: t.isOptional(t.isOneOf([t.isArray(t.isString()), t.isString()])),
  confirmationMode: t.isOptional(isConfirmationMode),
});

export const isShellTask = t.isObject({
  shell: t.isString(),
  fence: t.isOptional(t.isBoolean()),
}, {extra: isTaskSettings});

export const isTaskConfiguration = t.isOneOf([
  isShellTask,
]);

export const isConfiguration = t.isObject({
  namespace: t.isString(),
  description: t.isOptional(t.isString()),
  descriptionFile: t.isOptional(t.isString()),
  tasks: t.isDict(isTaskConfiguration),
});

export type TaskSettings = t.InferType<typeof isTaskSettings>;
export type ShellTask = t.InferType<typeof isShellTask>;
export type TaskConfiguration = t.InferType<typeof isTaskConfiguration>;
export type Configuration = t.InferType<typeof isConfiguration> & {path: PortablePath};

export const isConfirmMessage = t.isObject({
  type: t.isLiteral(`confirm`),
  namespace: t.isString(),
  taskId: t.isString(),
});

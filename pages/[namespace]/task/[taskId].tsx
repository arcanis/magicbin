import {decode}                                    from 'base64-arraybuffer';
import dynamic                                     from 'next/dynamic';
import {useRouter}                                 from 'next/router';
import type {NextPage}                             from 'next';
import {useCallback, useRef}                       from 'react';
import * as t                                      from 'typanion';
import {XTerm}                                     from 'xterm-for-react';

import {CardBox}                                   from '../../../components/CardBox';
import {NamespaceLayout}                           from '../../../components/NamespaceLayout';
import type {Terminal as TerminalComponent}        from '../../../components/Terminal';
import {useGraphql}                                from '../../../components/hooks/useGraphql';
import {useLiveTask}                               from '../../../components/hooks/useLiveTask';
import {isCompletedStatus, TaskAction, TaskStatus} from '../../../sources/types';

import {
  HeaderContainer,
  HeaderRightAlignedItems,
  HeaderItem,
} from '../../../components/Header';

const BufferSubscription = `
  subscription ($namespace: String!, $taskId: String!) {
    buffer(namespace: $namespace, taskId: $taskId)
  }
`;

const TaskMutation = `
  mutation ($namespace: String!, $taskId: String!, $action: TaskAction!) {
    taskAction(namespace: $namespace, taskId: $taskId, action: $action) {
      success
    }
  }
`;

const Terminal = dynamic<React.ComponentProps<typeof TerminalComponent>>(
  () => import(`../../../components/Terminal`).then(mod => mod.Terminal),
  {ssr: false},
);

const Page: NextPage = () => {
  const router = useRouter();
  const {namespace, taskId} = router.query;

  t.assert(namespace, t.isString());
  t.assert(taskId, t.isString());

  const {useSubscription, useMutation} = useGraphql();

  const task = useLiveTask(namespace, taskId);
  const [sendTaskAction] = useMutation(TaskMutation);

  const onTaskAction = useCallback((action: TaskAction) => {
    sendTaskAction({namespace, taskId, action});
    if (action === TaskAction.CLEAR) {
      terminalRef.current?.terminal.clear();
    }
  }, [namespace, taskId]);

  const bufferedDataRef = useRef<Array<Uint8Array>>([]);
  const terminalRef = useRef<XTerm | null>(null);

  useSubscription<{
    buffer: string;
  }>({query: BufferSubscription, variables: {namespace, taskId}}, data => {
    const buffer = new Uint8Array(decode(data.buffer));
    if (terminalRef.current) {
      terminalRef.current.terminal.write(buffer);
    } else {
      bufferedDataRef.current.push(buffer);
    }
  });

  const setTerminalRef = useCallback((ref: XTerm | null) => {
    terminalRef.current = ref;

    if (ref) {
      const bufferedData = bufferedDataRef.current;
      bufferedDataRef.current = [];

      for (const buffer of bufferedData) {
        ref.terminal.write(buffer);
      }
    }
  }, []);

  return (
    <NamespaceLayout header={<Header taskName={task?.name ?? `Untitled`} status={task?.status ?? null} onTaskAction={onTaskAction}/>} namespace={namespace}>
      {task ? <>
        <div className={`relative flex flex-auto m-4`}>
          <CardBox/>
          <div className={`absolute inset-4`}>
            <div className={`relative w-full h-full`}>
              <Terminal key={`${namespace}:${taskId}`} termRef={setTerminalRef}/>
            </div>
          </div>
        </div>
      </> : (
        <div className={`flex m-4 max-w-3xl`}>
          <CardBox>
            <div className={`markdown-body p-6`}>
              This task isn't currently registered.
            </div>
          </CardBox>
        </div>
      )}
    </NamespaceLayout>
  );
};

function Header({taskName, status, onTaskAction}: {taskName: string, status: TaskStatus | null, onTaskAction?: (action: TaskAction) => void}) {
  const isStopped = !!status && isCompletedStatus(status);
  const isRunning = !!status && !isStopped;

  return (
    <HeaderContainer>
      <HeaderItem name={`Start`} active={isStopped} onClick={() => onTaskAction?.(TaskAction.REBOOT)}/>
      <HeaderItem name={`Stop`} active={status !== null} onClick={() => onTaskAction?.(TaskAction.STOP)}/>
      <HeaderItem name={`Restart`} active={isRunning} onClick={() => onTaskAction?.(TaskAction.REBOOT)}/>
      <HeaderItem name={`Clear`} onClick={() => onTaskAction?.(TaskAction.CLEAR)}/>
      <HeaderRightAlignedItems>
        {taskName}
      </HeaderRightAlignedItems>
    </HeaderContainer>
  );
}

// eslint-disable-next-line arca/no-default-export
export default Page;

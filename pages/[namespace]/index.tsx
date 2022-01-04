import Link               from 'next/link';
import {useRouter}        from 'next/router';
import type {NextPage}    from 'next';
import ReactMarkdown      from 'react-markdown';
import {useCallback}      from 'react';
import * as t             from 'typanion';

import {CardBox}          from '../../components/CardBox';
import {ConfigLink}       from '../../components/ConfigLink';
import {NamespaceLayout}  from '../../components/NamespaceLayout';
import {useGraphql}       from '../../components/hooks/useGraphql';
import {useLiveNamespace} from '../../components/hooks/useLiveNamespace';
import {NamespaceAction}  from '../../sources/types';

import {
  HeaderContainer,
  HeaderRightAlignedItems,
  HeaderItem,
} from '../../components/Header';

const NamespaceMutation = `
  mutation ($namespace: String!, $action: NamespaceAction!) {
    namespaceAction(namespace: $namespace, action: $action) {
      success
    }
  }
`;

const Page: NextPage = () => {
  const router = useRouter();
  const {namespace} = router.query;

  t.assert(namespace, t.isString());

  const {useMutation} = useGraphql();

  const namespaceEntity = useLiveNamespace(namespace);
  const [sendNamespaceAction] = useMutation(NamespaceMutation);

  const onNamespaceAction = useCallback((action: NamespaceAction) => {
    sendNamespaceAction({namespace, action});
  }, [namespace]);

  return (
    <NamespaceLayout header={<Header watched={namespaceEntity?.watched ?? false} onNamespaceAction={onNamespaceAction}/>} namespace={namespace}>
      {namespaceEntity && (
        <div className={`mx-8 my-4 mb-0`}>
          <div className={`markdown-body`} style={{background: `none`}}>
            <div className={`flex text-xs space-x-2`}>
              <div className={`max-w-xl truncate`}>
                Configured in <a href={`vscode://file${namespaceEntity.configPath}`}>{namespaceEntity.configPath}</a>
              </div>
              <div>—</div>
              <div>
                see <Link href={`/docs/config`}>documentation</Link>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className={`flex m-4 max-w-3xl`}>
        <CardBox>
          <div className={`markdown-body p-6`}>
            {namespaceEntity ? <>
              <div className={`max-w-2xl`}>
                {namespaceEntity.description ? (
                  <ReactMarkdown children={namespaceEntity?.description}/>
                ) : <p>
                  This namespace isn't documented. You can give it a documentation by using any of the <ConfigLink name={`description`}/> or <ConfigLink name={`descriptionFile`}/> configuration settings.
                </p>}
              </div>
            </> : <p>
              This namespace isn't currently registered.
            </p>}
          </div>
        </CardBox>
      </div>
    </NamespaceLayout>
  );
};

function Header({watched, onNamespaceAction}: {watched: boolean, onNamespaceAction?: (action: NamespaceAction) => void}) {
  return (
    <HeaderContainer>
      <HeaderItem name={`Stop all`} onClick={() => onNamespaceAction?.(NamespaceAction.STOP)}/>
      <HeaderItem name={`Restart all`} onClick={() => onNamespaceAction?.(NamespaceAction.REBOOT)}/>
      <HeaderRightAlignedItems>
        <HeaderItem name={<><input className={`mr-2`} type={`checkbox`} checked={watched} readOnly={true}/> Watch config</>} onClick={() => onNamespaceAction?.(watched ? NamespaceAction.UNWATCH : NamespaceAction.WATCH)}/>
      </HeaderRightAlignedItems>
    </HeaderContainer>
  );
}

// eslint-disable-next-line arca/no-default-export
export default Page;

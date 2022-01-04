import 'tailwindcss/tailwind.css';
import {AppProps}                                                from 'next/app';
import Head                                                      from 'next/head';
import {NextPageContext}                                         from 'next';
import ssrPrepass                                                from 'react-ssr-prepass';
import {Suspense, useEffect, useLayoutEffect, useMemo, useState} from 'react';

import {Layout}                                                  from '../components/Layout';
import {GraphqlClient, GraphqlClientProvider}                    from '../components/hooks/useGraphql';
import '../styles/github.css';
import '../styles/globals.css';

function SsrCompatibleSuspense({fallback, children}: React.SuspenseProps) {
  type SuspenseComponent = (props: React.SuspenseProps) => React.ReactElement | null;

  const [state, setState] = useState<{
    Component: SuspenseComponent;
  }>({
    Component: ({fallback}) => <>{fallback}</>,
  });

  if (process.browser) {
    useLayoutEffect(() => {
      setState({
        Component: Suspense,
      });
    }, []);
  }

  return (
    <state.Component fallback={fallback}>
      {children}
    </state.Component>
  );
}

function MyApp({Component, pageProps, graphqlClient, cacheData = {}}: AppProps & {graphqlClient?: GraphqlClient, cacheData: any}) {
  const finalGraphqlClient = useMemo(() => {
    return graphqlClient ?? new GraphqlClient(cacheData);
  }, []);

  return (
    <GraphqlClientProvider value={finalGraphqlClient}>
      <SsrCompatibleSuspense fallback={<Layout children={null}/>}>
        <Head>
          <title>Magicbin</title>
          <link rel={`icon`} href={`/favicon.svg`} />
        </Head>
        <Component {...pageProps} />
      </SsrCompatibleSuspense>
    </GraphqlClientProvider>
  );
}

MyApp.getInitialProps = async ({AppTree}: any) => {
  const graphqlClient = new GraphqlClient();
  await ssrPrepass(<AppTree pageProps={{}} graphqlClient={graphqlClient}/>);
  const cacheData = graphqlClient.getCacheData();

  return {cacheData};
};

// eslint-disable-next-line arca/no-default-export
export default MyApp;

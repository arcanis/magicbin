import '@fontsource/mononoki/index.css';
import type {NextPage}           from 'next';
import React                     from 'react';

import {CardBox}                 from '../../components/CardBox';
import {JsonSchemaDocumentation} from '../../components/JsonSchemaDocumentation';
import {Layout}                  from '../../components/Layout';
import manifest                  from '../../manifest.json';

const Page: NextPage = () => {
  return (
    <Layout>
      <div className={`flex flex-auto m-4`}>
        <CardBox>
          <div className={`p-8`}>
            <JsonSchemaDocumentation data={manifest}/>
          </div>
        </CardBox>
      </div>
    </Layout>
  );
};

// eslint-disable-next-line arca/no-default-export
export default Page;

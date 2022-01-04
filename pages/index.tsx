import type {NextPage} from 'next';

import {CardBox}       from '../components/CardBox';
import {Layout}        from '../components/Layout';

const Page: NextPage = () => {
  return (
    <Layout>
      <div className={`flex flex-auto m-4`}>
        <CardBox>
          <div className={`markdown-body p-8 max-w-2xl`}>
            <h1>
              Welcome to Magic Bin
            </h1>
            <p>
              Magic Bin, apart from being an amazing <a href={`https://en.wikipedia.org/wiki/Jack_and_the_Beanstalk`}>pun</a>, is a process manager. It spawns what you tell it to, in the order you tell it to, grouped by namespaces (thus letting you easily work on multiple projects at the same time).
            </p>
            <p>
              The interface you're currently on is the live dashboard. It'll always represent the latest state of your processes, which you can use to monitor the state of your applications and debug potential failures.
            </p>
            <p>
              I built Magic Bin for my own use case, and there are no company behind it. If you want to support my work, feel free to <a href={`https://twitter.com/arcanis`}>follow me</a>, <a href={`https://github.com/sponsors/arcanis`}>sponsor me</a>, or simply contribute new features. If you're looking for inspiration, here's a list of <a href={`https://github.com/arcanis/magicbin/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22`}>good first issues</a> you can pick!
            </p>
          </div>
        </CardBox>
      </div>
    </Layout>
  );
};

// eslint-disable-next-line arca/no-default-export
export default Page;

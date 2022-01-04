import '@fontsource/glory/index.css';
import Link                    from 'next/link';
import {NextRouter, useRouter} from 'next/router';
import React                   from 'react';

import {useLiveNamespaces}     from './hooks/useLiveNamespaces';

const isActive = (router: NextRouter, target: string, {exact = false}: {exact?: boolean} = {}) => {
  return router.asPath === target || (!exact && router.asPath.startsWith(`${target}/`));
};

type Button = {
  className?: string;
  icon: React.ReactNode;
  label: React.ReactNode;
  target: string;
  exact?: boolean;
  counter?: number;
};

type LayoutProps = {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
};

export function Layout({header, sidebar, children}: LayoutProps) {
  const namespaces = useLiveNamespaces();

  return (
    <div className={`pl-64 bg-gray-100 font-glory`}>
      <div className={`fixed left-0 inset-y-0 w-64 p-4 space-y-12 bg-gray-800 shadow-lg select-none`}>
        <Section>
          <Button target={`/`} icon={<img width={24} src={`/home.svg`}/>} label={`Home`} exact={true}/>
          <Button target={`https://github.com/arcanis/magicbin`} icon={<img width={24} src={`/website.svg`}/>} label={`Magic Bin`} exact={true}/>
        </Section>
        <Section title={`Namespaces`}>
          {namespaces.length === 0 && (
            <EmptyState title={`No namespaces`}/>
          )}
          {namespaces.map(namespace => (
            <Button key={namespace.id} target={`/${namespace.id}`} icon={<NamespaceIcon/>} label={namespace.name} exact={true} counter={namespace.taskCount}/>
          ))}
        </Section>
        {sidebar}
      </div>
      <div className={`flex flex-col min-h-screen`}>
        {header && (
          <header className={`sticky top-0 flex-none bg-white border-b border-gray-200 z-30`}>
            {header}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}

export function Section({title, children}: {title?: React.ReactNode, children: React.ReactNode}) {
  return (
    <div className={`px-4 border-l-2 border-gray-700`}>
      {title && (
        <h3 className={`mb-4 text-xs uppercase text-gray-500 font-semibold pl-3`}>
          {title}
        </h3>
      )}
      <ul className={`space-y-2`}>
        {children}
      </ul>
    </div>
  );
}

export function EmptyState({title}: {title: React.ReactNode}) {
  return (
    <li className={`block`}>
      <a className={`flex items-center px-3 py-2 space-x-2 rounded-sm`}>
        <div className={`flex-auto block text-gray-600 italic truncate trim-both`}>
          {title}
        </div>
      </a>
    </li>
  );
}

export function Button({target, icon, label, exact, counter}: Button) {
  const router = useRouter();

  return (
    <li className={`block`}>
      <Link href={target}>
        <a className={`flex items-center px-3 py-2 space-x-2 rounded-sm ${isActive(router, target, {exact}) ? `bg-gray-900` : `hover:bg-gray-900 hover:bg-opacity-50`}`} target={target.includes(`:`) ? `_blank` : `_self`}>
          <div className={`mr-4`}>
            {icon}
          </div>
          <div className={`flex-auto block text-gray-200 truncate trim-both`}>
            {label}
          </div>
          {counter && (
            <div className={`self-baseline text-xs font-medium text-white bg-indigo-500 px-2 py-1 rounded-sm`} style={{fontFamily: `"Segoe UI"`}}>
              {counter}
            </div>
          )}
        </a>
      </Link>
    </li>
  );
}

function NamespaceIcon() {
  return (
    <svg className={`flex-shrink-0 h-6 w-6`} viewBox={`0 0 24 24`}>
      <circle className={`fill-current text-gray-400 false`} cx={`18.5`} cy={`5.5`} r={`4.5`}/>
      <circle className={`fill-current text-gray-600 false`} cx={`5.5`} cy={`5.5`} r={`4.5`}/>
      <circle className={`fill-current text-gray-600 false`} cx={`18.5`} cy={`18.5`} r={`4.5`}/>
      <circle className={`fill-current text-gray-400 false`} cx={`5.5`} cy={`18.5`} r={`4.5`}/>
    </svg>
  );
}

import {Layout, Section, Button, EmptyState} from './Layout';
import {TaskIcon}                            from './TaskIcon';
import {useLiveTasks}                        from './hooks/useLiveTasks';

export type NamespaceLayoutProps = {
  header?: React.ReactNode;
  namespace: string | undefined;
  children: React.ReactNode;
};

export function NamespaceLayout({header, namespace, children}: NamespaceLayoutProps) {
  const tasks = useLiveTasks(namespace);

  const sidebar = (
    <Section title={`Tasks`}>
      {tasks.length === 0 && (
        <EmptyState title={`No tasks`}/>
      )}
      {tasks.map(task => (
        <Button key={task.id} target={`/${namespace}/task/${task.id}`} icon={<TaskIcon status={task.status}/>} label={task.name}/>
      ))}
    </Section>
  );

  return (
    <Layout header={header} sidebar={sidebar}>
      {children}
    </Layout>
  );
}

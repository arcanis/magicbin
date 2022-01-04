import Link from 'next/link';

export function ConfigLink({name}: {name: string}) {
  return (
    <Link href={`/docs/config#${name}`}>
      <a className={``}>
        {name}
      </a>
    </Link>
  );
}

import { btn } from "../lib/ui";

export default function Header({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center gap-4">
      <h1 className="text-xl font-bold">{title}</h1>
      {children}
    </header>
  );
}

export function HeaderUser({ name, email }: { name: string; email: string }) {
  return <span className="ml-auto text-gray-600">{`${name} (${email})`}</span>;
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button className={btn} onClick={onClick}>
      ← Voltar
    </button>
  );
}

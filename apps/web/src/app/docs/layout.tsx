import Link from 'next/link';

const docPages = [
  { href: '/docs/quickstart', label: 'Quick Start' },
  { href: '/docs/glossary', label: 'Glossary' },
  { href: '/docs/architecture', label: 'Architecture' },
  { href: '/docs/trace-format', label: 'Trace Format' },
  { href: '/docs/cli', label: 'CLI Reference' },
  { href: '/docs/scenarios', label: 'Scenarios' },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <Link href="/" className="text-lg font-bold text-neutral-900 dark:text-white">
            OCPP DebugKit
          </Link>
          <span className="ml-2 text-sm text-neutral-500">Docs</span>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8 flex gap-8">
        <nav className="w-48 shrink-0">
          <ul className="space-y-1">
            {docPages.map((page) => (
              <li key={page.href}>
                <Link
                  href={page.href}
                  className="block rounded px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
                >
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex-1 min-w-0 prose prose-neutral dark:prose-invert max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
}

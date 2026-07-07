export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-3xl text-center">
        <h1 className="text-5xl font-bold tracking-tight">OCPP DebugKit</h1>
        <p className="mt-6 text-xl text-neutral-600 dark:text-neutral-400">
          Open-source DevTools for debugging OCPP charging sessions.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/inspector"
            className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            Try Inspector
          </a>
          <a
            href="https://github.com/ocpp-debugkit/ocpp-debugkit"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-neutral-300 px-6 py-3 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </main>
  );
}

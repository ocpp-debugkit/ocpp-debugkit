import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-6xl">
          OCPP DebugKit
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
          Open-source DevTools for debugging OCPP charging sessions. Inspect traces, detect
          failures, and generate reports — right in your browser.
        </p>
        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link
            href="/inspector"
            className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            Try Inspector
          </Link>
          <a
            href="https://github.com/ocpp-debugkit/ocpp-debugkit"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-900"
          >
            View on GitHub
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-neutral-900 dark:text-white">
          Features
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            title="Inspect"
            description="Parse OCPP 1.6 JSON traces and view normalized events, sessions, and timelines."
          />
          <FeatureCard
            title="Detect"
            description="Automatically detect failures: failed authorization, connector faults, station offline."
          />
          <FeatureCard
            title="Test"
            description="Run predefined scenarios through the analysis engine and compare results."
          />
          <FeatureCard
            title="Report"
            description="Export Markdown reports with session overview, failures, and suggested steps."
          />
        </div>
      </section>

      {/* What it's not */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-neutral-900 dark:text-white">
          What it&apos;s not
        </h2>
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <NotBadge text="Not a CSMS" />
          <NotBadge text="Not a simulator" />
          <NotBadge text="Not a compliance tool" />
        </div>
      </section>

      {/* Architecture overview */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-neutral-900 dark:text-white">
          Architecture
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-neutral-600 dark:text-neutral-400">
          A modular monorepo with independent packages. Use only what you need.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PackageCard name="@ocpp-debugkit/core" desc="Parser, normalizer, timeline, detection" />
          <PackageCard name="@ocpp-debugkit/scenarios" desc="5 predefined test scenarios" />
          <PackageCard name="@ocpp-debugkit/reporter" desc="Markdown report generator" />
          <PackageCard name="@ocpp-debugkit/cli" desc="Command-line interface" />
        </div>
      </section>

      {/* Quick start */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-neutral-900 dark:text-white">
          Quick Start
        </h2>
        <div className="mt-8 rounded-lg bg-neutral-900 p-6 dark:bg-neutral-900">
          <pre className="overflow-x-auto text-sm text-neutral-100">
            <code>{`# Install the CLI
npm install -g @ocpp-debugkit/cli

# Inspect a trace
ocpp-debugkit inspect trace.json

# Generate a report
ocpp-debugkit report trace.json --output report.md

# Run a scenario
ocpp-debugkit scenario run failed-auth`}</code>
          </pre>
        </div>
        <p className="mt-4 text-center text-sm text-neutral-500">
          Or try the{' '}
          <Link
            href="/inspector"
            className="underline hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            web inspector
          </Link>{' '}
          — no installation required.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-5xl px-6 py-8 flex flex-wrap gap-6 justify-between items-center">
          <p className="text-sm text-neutral-500">Apache 2.0 License</p>
          <div className="flex gap-6">
            <a
              href="https://github.com/ocpp-debugkit/ocpp-debugkit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/org/ocpp-debugkit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              npm
            </a>
            <Link
              href="/docs"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              Docs
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
    </div>
  );
}

function NotBadge({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-neutral-100 px-4 py-2 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
      {text}
    </span>
  );
}

function PackageCard({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <code className="text-sm font-medium text-neutral-900 dark:text-white">{name}</code>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{desc}</p>
    </div>
  );
}

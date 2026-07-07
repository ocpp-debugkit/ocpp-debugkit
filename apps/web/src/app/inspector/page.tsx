export default function InspectorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">OCPP Inspector</h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
          Inspect OCPP charging traces, view session timelines, and detect failures.
        </p>
        <p className="mt-2 text-sm text-neutral-500">The inspector UI is under construction.</p>
      </div>
    </main>
  );
}

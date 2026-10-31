import { TaskTabs } from "./tabs";

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto w-full max-w-3xl min-w-0 flex-1 px-4 py-6 sm:py-8">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Operator tasks</h1>
        <p className="mt-1 text-sm text-slate-400">
          What only you can do, from every app&apos;s <span className="font-mono">plans/user-tasks/</span>.
        </p>
      </header>
      <TaskTabs />
      {children}
    </main>
  );
}

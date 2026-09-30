'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Service notice
        </p>
        <h2 className="mt-4 text-2xl font-bold">Something went wrong</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          The app had a client-side issue while loading. Please refresh and try again.
        </p>
        <button
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

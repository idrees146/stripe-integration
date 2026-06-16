import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-20 font-sans dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-black/[.06] bg-white p-8 text-center shadow-sm dark:border-white/[.08] dark:bg-zinc-950">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl dark:bg-red-900/40">
          ✋
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Payment canceled
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          No charge was made. You can head back and try again whenever
          you&apos;re ready.
        </p>

        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Back to store
        </Link>
      </div>
    </div>
  );
}

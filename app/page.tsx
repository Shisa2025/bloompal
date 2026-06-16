export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-24 font-sans">
      <main className="flex max-w-2xl flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          BloomPal
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Your plant care companion is taking root.
        </p>
      </main>
    </div>
  );
}

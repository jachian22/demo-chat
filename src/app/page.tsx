import { HydrateClient } from "@/trpc/server";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Restaurant Staffing Assistant
          </h1>
          <p className="text-lg text-slate-300">
            AI-powered staffing recommendations for NYC restaurants
          </p>
          <div className="text-sm text-slate-500">
            Chat interface coming soon...
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}

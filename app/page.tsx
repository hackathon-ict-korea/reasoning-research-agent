'use client';

import { FormEvent, useState } from "react";

type FulfilledResult = {
  status: "fulfilled";
  result: {
    researcherId: string;
    answer: string;
    confidenceScore: number;
    rawText: string;
  };
};

type RejectedResult = {
  status: "rejected";
  error: string;
  researcherId: string;
};

type ApiResponse = {
  results: Array<FulfilledResult | RejectedResult>;
};

export default function Home() {
  const [conversation, setConversation] = useState("");
  const [results, setResults] = useState<ApiResponse["results"]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch("/api/researchers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ conversation }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
          typeof errorBody.error === "string"
            ? errorBody.error
            : `Request failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as ApiResponse;
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center gap-12 bg-white px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="w-full space-y-2 text-center sm:text-left">
        <h1 className="text-3xl font-semibold">Researcher Agent Playground</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Paste a conversation transcript to see each researcher persona respond
          with their own analysis and confidence score.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="w-full space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <label htmlFor="conversation" className="block text-sm font-medium">
          Conversation
        </label>
        <textarea
          id="conversation"
          value={conversation}
          onChange={(event) => setConversation(event.target.value)}
          placeholder="Summarized discussion or bullet list of findings..."
          className="h-40 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-600"
          required
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:pointer-events-none disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {isLoading ? "Generating…" : "Run Researchers"}
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Conversation stays in the browser until you submit.
          </span>
        </div>
      </form>

      {error ? (
        <div className="w-full rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {results.length > 0 ? (
        <section className="grid w-full gap-4 md:grid-cols-2">
          {results.map((entry, idx) =>
            entry.status === "fulfilled" ? (
              <article
                key={`${entry.result.researcherId}-${idx}`}
                className="flex h-full flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold capitalize">
                    {entry.result.researcherId}
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    Confidence:{" "}
                    <span className="font-medium">
                      {entry.result.confidenceScore.toFixed(1)} / 5
                    </span>
                  </p>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-800 dark:text-zinc-200">
                  {entry.result.answer}
                </p>
              </article>
            ) : (
              <article
                key={`${entry.researcherId}-${idx}`}
                className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
              >
                <h2 className="text-lg font-semibold capitalize">
                  {entry.researcherId}
                </h2>
                <p className="mt-2 text-sm">
                  Researcher failed to respond: {entry.error}
                </p>
              </article>
            )
          )}
        </section>
      ) : null}
    </main>
  );
}

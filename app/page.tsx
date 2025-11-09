"use client";

import useResearch from "@/hooks/useResearch";
import useSynthesizer from "@/hooks/useSynthesizer";
import { FormEvent, useEffect, useRef, useState } from "react";

export default function Home() {
  const [conversation, setConversation] = useState("");
  const {
    results,
    isLoading: isResearchLoading,
    error: researcherError,
    call: runResearchers,
  } = useResearch();
  const {
    synthesis,
    isLoading: isSynthesizerLoading,
    error: synthesizerError,
    call: runSynthesizer,
    reset: resetSynthesizer,
  } = useSynthesizer();
  const synthesizerKeyRef = useRef<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    resetSynthesizer();
    synthesizerKeyRef.current = null;

    runResearchers(conversation);
  }

  useEffect(() => {
    if (isResearchLoading) {
      return;
    }

    if (results.length === 0) {
      resetSynthesizer();
      synthesizerKeyRef.current = null;
      return;
    }

    const fulfilled = results.filter(
      (
        entry
      ): entry is Extract<(typeof results)[number], { status: "fulfilled" }> =>
        entry.status === "fulfilled"
    );

    if (fulfilled.length === 0) {
      return;
    }

    const researcherResponses = fulfilled.map((entry) => ({
      researcherId: entry.result.researcherId,
      answer: entry.result.answer,
      confidenceScore: entry.result.confidenceScore,
    }));

    const synthesizerKey = JSON.stringify({
      conversation: conversation.trim(),
      responses: researcherResponses.map(
        ({ researcherId, answer, confidenceScore }) => ({
          researcherId,
          answer,
          confidenceScore,
        })
      ),
    });

    if (synthesizerKeyRef.current === synthesizerKey) {
      return;
    }

    runSynthesizer({
      conversation: conversation.trim(),
      researcherResponses,
    });

    synthesizerKeyRef.current = synthesizerKey;
  }, [
    conversation,
    isResearchLoading,
    resetSynthesizer,
    results,
    runSynthesizer,
  ]);

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
            disabled={isResearchLoading}
            className="inline-flex items-center rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:pointer-events-none disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {isResearchLoading ? "Generating…" : "Run Researchers"}
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Conversation stays in the browser until you submit.
          </span>
        </div>
      </form>

      {researcherError ? (
        <div className="w-full rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {researcherError}
        </div>
      ) : null}

      {results.length > 0 ? (
        <section className="flex w-full flex-col gap-6">
          {results.map((entry) => {
            const label =
              entry.phase === "initial"
                ? `기본답장#${entry.phasePosition}`
                : `피드백답장#${entry.phasePosition}`;

            return entry.status === "fulfilled" ? (
              <article
                key={`${entry.result.researcherId}-${entry.phase}`}
                className="flex h-full flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                      {label}
                    </span>
                    <h2 className="text-lg font-semibold capitalize">
                      {entry.result.researcherId}
                    </h2>
                  </div>
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
                key={`${entry.researcherId}-${entry.phase}`}
                className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase text-amber-600 dark:text-amber-300">
                    {label}
                  </span>
                  <h2 className="text-lg font-semibold capitalize">
                    {entry.researcherId}
                  </h2>
                </div>
                <p className="mt-2 text-sm">
                  Researcher failed to respond: {entry.error}
                </p>
              </article>
            );
          })}
          {(synthesizerError || isSynthesizerLoading || synthesis) && (
            <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 text-indigo-900 shadow-sm transition dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-100">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
                    Synthesizer
                  </span>
                  <h2 className="text-xl font-semibold">Mediator Summary</h2>
                </div>
                <div className="rounded-full border border-indigo-300 bg-white px-3 py-1 text-xs font-medium text-indigo-600 dark:border-indigo-500 dark:bg-indigo-900 dark:text-indigo-200">
                  Collective View
                </div>
              </div>

              {synthesizerError ? (
                <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200">
                  Synthesizer 오류: {synthesizerError}
                </p>
              ) : isSynthesizerLoading ? (
                <p className="text-sm text-indigo-700 dark:text-indigo-200">
                  Synthesizer가 연구자 답변을 통합하는 중입니다…
                </p>
              ) : synthesis ? (
                <div className="space-y-4 text-sm leading-6">
                  <p className="text-base font-medium text-indigo-800 dark:text-indigo-100">
                    {synthesis.summary}
                  </p>

                  {synthesis.mediatorNotes ? (
                    <div className="rounded-lg border border-indigo-200 bg-white/70 px-4 py-3 dark:border-indigo-600 dark:bg-indigo-900/40">
                      <h3 className="text-xs font-semibold uppercase text-indigo-500 dark:text-indigo-300">
                        중재 메모
                      </h3>
                      <p className="mt-1 text-indigo-800 dark:text-indigo-100">
                        {synthesis.mediatorNotes}
                      </p>
                    </div>
                  ) : null}

                  {synthesis.highlights && synthesis.highlights.length > 0 ? (
                    <div>
                      <h3 className="text-xs font-semibold uppercase text-indigo-500 dark:text-indigo-300">
                        핵심 하이라이트
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {synthesis.highlights.map((highlight, index) => (
                          <li
                            key={`${highlight.title}-${index}`}
                            className="rounded-lg border border-indigo-200 bg-white/60 px-4 py-2 dark:border-indigo-600 dark:bg-indigo-900/40"
                          >
                            {"title" in highlight ? (
                              <p className="font-semibold text-indigo-800 dark:text-indigo-100">
                                {highlight.title}
                              </p>
                            ) : null}
                            <p className="text-indigo-700 dark:text-indigo-100">
                              {"detail" in highlight
                                ? highlight.detail
                                : highlight}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div>
                    <h3 className="text-xs font-semibold uppercase text-indigo-500 dark:text-indigo-300">
                      Follow-up 질문
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {synthesis.followUpQuestions.map((question, index) => (
                        <li
                          key={`${question}-${index}`}
                          className="flex items-start gap-2 rounded-lg border border-indigo-200 bg-white/70 px-4 py-2 text-indigo-800 dark:border-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-100"
                        >
                          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white dark:bg-indigo-400">
                            {index + 1}
                          </span>
                          <span>{question}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </article>
          )}
        </section>
      ) : null}
    </main>
  );
}

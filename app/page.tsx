"use client";

import Loading from "@/components/loading";
import FileUpload, {
  AttachedFile,
  AttachedFilesList,
} from "@/components/file-upload";
import useResearch from "@/hooks/useResearch";
import useSynthesizer from "@/hooks/useSynthesizer";
import { cn } from "@/lib/utils";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

const MAX_CYCLES = 3;

export default function Home() {
  const [conversation, setConversation] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [cycleConversations, setCycleConversations] = useState<
    Record<number, string>
  >({});
  const {
    results,
    isLoading: isResearchLoading,
    error: researcherError,
    call: runResearchers,
    reset: resetResearchers,
  } = useResearch();
  const {
    syntheses,
    errors: synthesizerErrors,
    loadingCycle: synthesizerLoadingCycle,
    call: runSynthesizer,
    clarify: runSynthesizerClarifier,
    clarifier: initialClarifier,
    clarifierError: initialClarifierError,
    isClarifying: isSynthesizerClarifying,
    reset: resetSynthesizer,
  } = useSynthesizer();
  const synthesizerKeysRef = useRef<Record<number, string>>({});

  const [isMessageSent, setIsMessageSent] = useState<boolean>(false);

  function handleFilesAdded(newFiles: AttachedFile[]) {
    setAttachedFiles((prev) => [...prev, ...newFiles]);
  }

  function handleFileRemoved(index: number) {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsMessageSent(true);
    console.log("conversation", conversation);

    // Prepare message parts with text and files
    const parts: Array<{
      type: string;
      text?: string;
      data?: string;
      mimeType?: string;
    }> = [{ type: "text", text: conversation }];

    // Add attached files to parts
    attachedFiles.forEach((file) => {
      parts.push({
        type: "file",
        data: file.data,
        mimeType: file.mimeType,
      });
    });

    // call summarize api(/summarize) and use respond as conversation param
    const summarizeResponse = await fetch("/api/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", parts }],
      }),
    });

    const normalizedConversation = (await summarizeResponse.json()).text;

    if (normalizedConversation.length === 0) {
      return;
    }

    resetResearchers();
    resetSynthesizer();
    synthesizerKeysRef.current = {};
    setCycleConversations({ 1: normalizedConversation });
    setConversation(normalizedConversation);
    setAttachedFiles([]); // Clear attached files after submission

    await runSynthesizerClarifier({
      conversation: normalizedConversation,
    });

    runResearchers({
      conversation: normalizedConversation,
      cycle: 1,
    });
  }

  useEffect(() => {
    if (isResearchLoading) {
      return;
    }

    if (results.length === 0) {
      if (
        Object.keys(syntheses).length > 0 ||
        Object.keys(synthesizerErrors).length > 0 ||
        synthesizerLoadingCycle !== null
      ) {
        resetSynthesizer();
        synthesizerKeysRef.current = {};
      }
      return;
    }

    const resultsByCycle = results.reduce<Record<number, typeof results>>(
      (accumulator, entry) => {
        if (!accumulator[entry.cycle]) {
          accumulator[entry.cycle] = [];
        }
        accumulator[entry.cycle]!.push(entry);
        return accumulator;
      },
      {}
    );

    Object.entries(resultsByCycle).forEach(([cycleKey, cycleEntries]) => {
      const cycleNumber = Number(cycleKey);
      const conversationForCycle = cycleConversations[cycleNumber];

      if (!conversationForCycle) {
        return;
      }

      const fulfilled = cycleEntries.filter(
        (
          entry
        ): entry is Extract<
          (typeof cycleEntries)[number],
          { status: "fulfilled" }
        > => entry.status === "fulfilled"
      );

      if (fulfilled.length === 0) {
        return;
      }

      const trimmedConversation = conversationForCycle.trim();
      const researcherResponses = fulfilled.map((entry) => ({
        researcherId: entry.result.researcherId,
        answer: entry.result.answer,
        confidenceScore: entry.result.confidenceScore,
      }));

      const synthesizerKey = JSON.stringify({
        cycle: cycleNumber,
        conversation: trimmedConversation,
        responses: researcherResponses.map(
          ({ researcherId, answer, confidenceScore }) => ({
            researcherId,
            answer,
            confidenceScore,
          })
        ),
      });

      if (synthesizerKeysRef.current[cycleNumber] === synthesizerKey) {
        return;
      }

      runSynthesizer({
        conversation: trimmedConversation,
        researcherResponses,
        cycle: cycleNumber,
      });

      synthesizerKeysRef.current[cycleNumber] = synthesizerKey;
    });
  }, [
    cycleConversations,
    isResearchLoading,
    resetSynthesizer,
    results,
    runSynthesizer,
    syntheses,
    synthesizerErrors,
    synthesizerLoadingCycle,
  ]);

  useEffect(() => {
    if (
      isMessageSent &&
      !isResearchLoading &&
      !isSynthesizerClarifying &&
      synthesizerLoadingCycle === null
    ) {
      setIsMessageSent(false);
    }
  }, [
    isMessageSent,
    isResearchLoading,
    isSynthesizerClarifying,
    synthesizerLoadingCycle,
  ]);

  function handleStartFollowUpCycle(currentCycle: number) {
    const nextCycle = currentCycle + 1;

    if (nextCycle > MAX_CYCLES || cycleConversations[nextCycle]) {
      return;
    }

    const synthesisForCycle = syntheses[currentCycle];
    if (!synthesisForCycle) {
      return;
    }

    const followUp = synthesisForCycle.followUpQuestion
      ?.trim()
      .replace(/\s+/g, " ");

    if (!followUp || followUp.length === 0) {
      return;
    }

    const baseConversation =
      cycleConversations[currentCycle] ?? conversation.trim();
    const nextConversation = [
      baseConversation.trim(),
      "",
      `Synthesizer Cycle ${currentCycle} Follow-up Question:`,
      `1. ${followUp}`,
    ]
      .join("\n")
      .trim();

    setCycleConversations((previous) => ({
      ...previous,
      [nextCycle]: nextConversation,
    }));
    setConversation(nextConversation);

    const nextKeys = { ...synthesizerKeysRef.current };
    delete nextKeys[nextCycle];
    synthesizerKeysRef.current = nextKeys;

    runResearchers({
      conversation: nextConversation,
      cycle: nextCycle,
    });
  }

  const groupedResults = useMemo(() => {
    return results.reduce<Record<number, typeof results>>(
      (accumulator, entry) => {
        if (!accumulator[entry.cycle]) {
          accumulator[entry.cycle] = [];
        }

        accumulator[entry.cycle]!.push(entry);
        return accumulator;
      },
      {}
    );
  }, [results]);

  const sortedCycles = useMemo(
    () =>
      Object.keys(groupedResults)
        .map((cycle) => Number(cycle))
        .sort((a, b) => a - b),
    [groupedResults]
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center gap-12 bg-white px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="w-full space-y-2 text-center sm:text-left">
        <h1 className="text-3xl font-semibold">Researcher Agent Playground</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Paste a conversation transcript to see each researcher persona respond
          with their own analysis and confidence score.
        </p>
      </header>
      {isMessageSent &&
      (isResearchLoading ||
        isSynthesizerClarifying ||
        synthesizerLoadingCycle !== null) ? (
        <Loading />
      ) : (
        <form
          onSubmit={handleSubmit}
          className={cn(
            "w-full space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950",
            isMessageSent ? "hidden" : ""
          )}
        >
          <div className="flex items-center justify-between">
            <label htmlFor="conversation" className="block text-sm font-medium">
              Conversation
            </label>
            <FileUpload onFilesAdded={handleFilesAdded} />
          </div>

          <AttachedFilesList
            attachedFiles={attachedFiles}
            onFileRemoved={handleFileRemoved}
          />

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
              disabled={isResearchLoading || isSynthesizerClarifying}
              className="inline-flex items-center rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:pointer-events-none disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {isSynthesizerClarifying
                ? "Synthesizer가 질문을 이해 중…"
                : isResearchLoading
                ? "Generating…"
                : "Run Researchers"}
            </button>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Conversation stays in the browser until you submit.
            </span>
          </div>
        </form>
      )}

      {researcherError ? (
        <div className="w-full rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {researcherError}
        </div>
      ) : null}

      {(initialClarifierError ||
        isSynthesizerClarifying ||
        initialClarifier) && (
        <section className="w-full">
          <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 text-indigo-900 shadow-sm transition dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-100">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
                  Synthesizer Clarifier
                </span>
                <h3 className="text-xl font-semibold">
                  첫 질문 이해 &amp; 팔로업 제안
                </h3>
              </div>
              <div className="rounded-full border border-indigo-300 bg-white px-3 py-1 text-xs font-medium text-indigo-600 dark:border-indigo-500 dark:bg-indigo-900 dark:text-indigo-200">
                Cycle 0
              </div>
            </div>

            {initialClarifierError ? (
              <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200">
                Synthesizer 오류: {initialClarifierError}
              </p>
            ) : isSynthesizerClarifying ? (
              <p className="text-sm text-indigo-700 dark:text-indigo-200">
                Synthesizer가 질문을 파악하는 중입니다…
              </p>
            ) : initialClarifier ? (
              <div className="space-y-4 text-sm leading-6">
                <p className="text-base font-medium text-indigo-800 dark:text-indigo-100">
                  {initialClarifier.summary}
                </p>

                {initialClarifier.mediatorNotes ? (
                  <div className="rounded-lg border border-indigo-200 bg-white/70 px-4 py-3 dark:border-indigo-600 dark:bg-indigo-900/40">
                    <h4 className="text-xs font-semibold uppercase text-indigo-500 dark:text-indigo-300">
                      참고 메모
                    </h4>
                    <p className="mt-1 text-indigo-800 dark:text-indigo-100">
                      {initialClarifier.mediatorNotes}
                    </p>
                  </div>
                ) : null}

                {initialClarifier.followUpQuestion ? (
                  <div className="rounded-lg border border-indigo-200 bg-white px-4 py-3 dark:border-indigo-600 dark:bg-indigo-900/60">
                    <h4 className="text-xs font-semibold uppercase text-indigo-500 dark:text-indigo-300">
                      추천 팔로업 질문
                    </h4>
                    <p className="mt-1 text-indigo-900 dark:text-indigo-100">
                      {initialClarifier.followUpQuestion}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        </section>
      )}

      {sortedCycles.length > 0 ? (
        <section className="flex w-full flex-col gap-10">
          {sortedCycles.map((cycleNumber) => {
            const cycleEntries = groupedResults[cycleNumber] ?? [];
            const synthesizerForCycle = syntheses[cycleNumber];
            const synthesizerErrorForCycle = synthesizerErrors[cycleNumber];
            const isCycleLoading = synthesizerLoadingCycle === cycleNumber;
            const isFollowUpCycle = cycleNumber > 1;
            const followUpQuestion =
              synthesizerForCycle?.followUpQuestion?.trim() ?? "";
            const nextCycle = cycleNumber + 1;
            const nextCycleConversation =
              nextCycle <= MAX_CYCLES
                ? cycleConversations[nextCycle]
                : undefined;
            const canTriggerNextCycle =
              followUpQuestion.length > 0 &&
              cycleNumber < MAX_CYCLES &&
              !nextCycleConversation &&
              !isResearchLoading &&
              synthesizerLoadingCycle !== nextCycle;
            const isNextCycleInFlight =
              cycleNumber < MAX_CYCLES &&
              Boolean(nextCycleConversation) &&
              (!sortedCycles.includes(nextCycle) ||
                synthesizerLoadingCycle === nextCycle ||
                isResearchLoading);

            return (
              <div key={`cycle-${cycleNumber}`} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {isFollowUpCycle
                      ? `Cycle ${cycleNumber} — Follow-up Analysis`
                      : "Cycle 1 — Primary Analysis"}
                  </h2>
                  <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                    Cycle {cycleNumber}
                  </span>
                </div>

                <div className="flex w-full flex-col gap-6">
                  {cycleEntries.map((entry) => {
                    const label =
                      entry.phase === "initial"
                        ? `기본답장#${entry.phasePosition}`
                        : `피드백답장#${entry.phasePosition}`;

                    return entry.status === "fulfilled" ? (
                      <article
                        key={`${entry.cycle}-${entry.result.researcherId}-${entry.phase}-${entry.phasePosition}`}
                        className="flex h-full flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                              {label}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                Cycle {entry.cycle}
                              </span>
                              <h3 className="text-lg font-semibold capitalize">
                                {entry.result.researcherId}
                              </h3>
                            </div>
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
                        key={`${entry.cycle}-${entry.researcherId}-${entry.phase}-${entry.phasePosition}`}
                        className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium uppercase text-amber-600 dark:text-amber-300">
                            {label}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-500 dark:text-amber-300/80">
                              Cycle {entry.cycle}
                            </span>
                            <h3 className="text-lg font-semibold capitalize">
                              {entry.researcherId}
                            </h3>
                          </div>
                        </div>
                        <p className="mt-2 text-sm">
                          Researcher failed to respond: {entry.error}
                        </p>
                      </article>
                    );
                  })}

                  {(synthesizerErrorForCycle ||
                    isCycleLoading ||
                    synthesizerForCycle) && (
                    <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 text-indigo-900 shadow-sm transition dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-100">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
                            Synthesizer
                          </span>
                          <h3 className="text-xl font-semibold">
                            {isFollowUpCycle
                              ? "Follow-up Summary"
                              : "Mediator Summary"}
                          </h3>
                        </div>
                        <div className="rounded-full border border-indigo-300 bg-white px-3 py-1 text-xs font-medium text-indigo-600 dark:border-indigo-500 dark:bg-indigo-900 dark:text-indigo-200">
                          {isFollowUpCycle
                            ? "Cycle Follow-up"
                            : "Collective View"}
                        </div>
                      </div>

                      {synthesizerErrorForCycle ? (
                        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200">
                          Synthesizer 오류: {synthesizerErrorForCycle}
                        </p>
                      ) : isCycleLoading ? (
                        <p className="text-sm text-indigo-700 dark:text-indigo-200">
                          Synthesizer가 연구자 답변을 통합하는 중입니다…
                        </p>
                      ) : synthesizerForCycle ? (
                        <div className="space-y-4 text-sm leading-6">
                          <p className="text-base font-medium text-indigo-800 dark:text-indigo-100">
                            {synthesizerForCycle.summary}
                          </p>

                          {synthesizerForCycle.mediatorNotes ? (
                            <div className="rounded-lg border border-indigo-200 bg-white/70 px-4 py-3 dark:border-indigo-600 dark:bg-indigo-900/40">
                              <h4 className="text-xs font-semibold uppercase text-indigo-500 dark:text-indigo-300">
                                중재 메모
                              </h4>
                              <p className="mt-1 text-indigo-800 dark:text-indigo-100">
                                {synthesizerForCycle.mediatorNotes}
                              </p>
                            </div>
                          ) : null}

                          {synthesizerForCycle.highlights &&
                          synthesizerForCycle.highlights.length > 0 ? (
                            <div>
                              <h4 className="text-xs font-semibold uppercase text-indigo-500 dark:text-indigo-300">
                                핵심 하이라이트
                              </h4>
                              <ul className="mt-2 space-y-2">
                                {synthesizerForCycle.highlights.map(
                                  (highlight, index) => (
                                    <li
                                      key={`${highlight.title}-${index}`}
                                      className="rounded-lg border border-indigo-200 bg-white/60 px-4 py-2 dark:border-indigo-600 dark:bg-indigo-900/40"
                                    >
                                      <p className="font-semibold text-indigo-800 dark:text-indigo-100">
                                        {highlight.title}
                                      </p>
                                      <p className="text-indigo-700 dark:text-indigo-100">
                                        {highlight.detail}
                                      </p>
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          ) : null}

                          <div>
                            <h4 className="text-xs font-semibold uppercase text-indigo-500 dark:text-indigo-300">
                              Follow-up 질문
                            </h4>
                            {followUpQuestion.length > 0 ? (
                              <div className="mt-2 flex items-start gap-2 rounded-lg border border-indigo-200 bg-white/70 px-4 py-2 text-indigo-800 dark:border-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-100">
                                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white dark:bg-indigo-400">
                                  1
                                </span>
                                <span>{followUpQuestion}</span>
                              </div>
                            ) : (
                              <p className="mt-2 text-xs text-indigo-700 opacity-80 dark:text-indigo-200">
                                No follow-up question provided for this cycle.
                              </p>
                            )}
                          </div>

                          {canTriggerNextCycle ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleStartFollowUpCycle(cycleNumber)
                              }
                              className="mt-4 inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-indigo-300 dark:focus:ring-offset-zinc-900"
                            >
                              Run Cycle {nextCycle}
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      {isNextCycleInFlight ? (
                        <p className="mt-4 text-xs text-indigo-600 dark:text-indigo-200">
                          Cycle {nextCycle} is starting—researchers are
                          preparing their next-round analyses.
                        </p>
                      ) : null}
                    </article>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ) : null}
    </main>
  );
}

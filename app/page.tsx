"use client";

import FileUpload, {
  AttachedFile,
  AttachedFilesList,
} from "@/components/file-upload";
import useResearch from "@/hooks/useResearch";
import useSynthesizer from "@/hooks/useSynthesizer";
import { cn, parseMarkdown } from "@/lib/utils";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const MAX_CYCLES = 3;

const STATUS_LABELS = {
  done: "Done",
  "in-progress": "In Progress",
  upcoming: "Upcoming",
  error: "Error",
} as const;

// 리뷰어별 파스텔 컬러 매핑
const RESEARCHER_COLORS: Record<
  string,
  { bg: string; border: string; text: string; label: string }
> = {
  default: {
    bg: "bg-slate-50 dark:bg-slate-900/60",
    border: "border-slate-200 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-100",
    label: "text-slate-500 dark:text-slate-400",
  },
  researcherA: {
    bg: "bg-rose-50 dark:bg-rose-900/30",
    border: "border-rose-200 dark:border-rose-700",
    text: "text-rose-900 dark:text-rose-100",
    label: "text-rose-500 dark:text-rose-400",
  },
  researcherB: {
    bg: "bg-sky-50 dark:bg-sky-900/30",
    border: "border-sky-200 dark:border-sky-700",
    text: "text-sky-900 dark:text-sky-100",
    label: "text-sky-500 dark:text-sky-400",
  },
  researcherC: {
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    border: "border-emerald-200 dark:border-emerald-700",
    text: "text-emerald-900 dark:text-emerald-100",
    label: "text-emerald-500 dark:text-emerald-400",
  },
  researcherD: {
    bg: "bg-purple-50 dark:bg-purple-900/30",
    border: "border-purple-200 dark:border-purple-700",
    text: "text-purple-900 dark:text-purple-100",
    label: "text-purple-500 dark:text-purple-400",
  },
  researcherE: {
    bg: "bg-amber-50 dark:bg-amber-900/30",
    border: "border-amber-200 dark:border-amber-700",
    text: "text-amber-900 dark:text-amber-100",
    label: "text-amber-500 dark:text-amber-400",
  },
  researcherF: {
    bg: "bg-teal-50 dark:bg-teal-900/30",
    border: "border-teal-200 dark:border-teal-700",
    text: "text-teal-900 dark:text-teal-100",
    label: "text-teal-500 dark:text-teal-400",
  },
  researcherG: {
    bg: "bg-pink-50 dark:bg-pink-900/30",
    border: "border-pink-200 dark:border-pink-700",
    text: "text-pink-900 dark:text-pink-100",
    label: "text-pink-500 dark:text-pink-400",
  },
  researcherH: {
    bg: "bg-cyan-50 dark:bg-cyan-900/30",
    border: "border-cyan-200 dark:border-cyan-700",
    text: "text-cyan-900 dark:text-cyan-100",
    label: "text-cyan-500 dark:text-cyan-400",
  },
};

// 리뷰어 ID로 색상 가져오기
function getResearcherColors(researcherId: string) {
  return RESEARCHER_COLORS[researcherId] || RESEARCHER_COLORS.default;
}

type TimelineStatus = keyof typeof STATUS_LABELS;

type TimelineResponse = {
  id: string;
  label: string;
  researcherId: string;
  content: string;
  confidence?: number;
  isError: boolean;
  cycleNumber: number;
};

type TimelineHighlight = {
  title: string;
  detail: string;
};

type TimelineSynthesizer = {
  summary?: string;
  highlights?: TimelineHighlight[];
  followUp?: string;
  error?: string;
  loading: boolean;
};

type TimelineNode = {
  id: string;
  stageId: string;
  status: TimelineStatus;
  title: string;
  subtitle: string;
  content: string;
  footer: string;
  responses?: TimelineResponse[];
  synthesizer?: TimelineSynthesizer;
  isSynthNode?: boolean;
  renderContent?: () => ReactNode;
};

export default function Home() {
  const [conversation, setConversation] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [visibleConversation, setVisibleConversation] = useState("");
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

  const [viewMode, setViewMode] = useState<"focus" | "timeline">("focus");
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  function handleFilesAdded(newFiles: AttachedFile[]) {
    setAttachedFiles((prev) => [...prev, ...newFiles]);
  }

  function handleFileRemoved(index: number) {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedConversation = visibleConversation.trim();

    if (submittedConversation.length === 0 && attachedFiles.length === 0) {
      return;
    }

    // Prepare message parts with text and files
    const parts: Array<{
      type: string;
      text?: string;
      data?: string;
      mimeType?: string;
    }> = [];

    if (submittedConversation.length > 0) {
      parts.push({
        type: "text",
        text: submittedConversation,
      });
    }

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

    let normalizedConversation = submittedConversation;
    try {
      const summarizeJson = await summarizeResponse.json();
      if (typeof summarizeJson?.text === "string") {
        normalizedConversation = summarizeJson.text.trim();
      }
    } catch (error) {
      console.error("Failed to parse summarize response", error);
    }

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

  const orderedCycleNumbers = useMemo(() => {
    return Object.keys(cycleConversations)
      .map((cycle) => Number(cycle))
      .sort((a, b) => a - b);
  }, [cycleConversations]);

  const hasClarifierStage = useMemo(
    () =>
      Boolean(
        initialClarifierError || isSynthesizerClarifying || initialClarifier
      ),
    [initialClarifierError, initialClarifier, isSynthesizerClarifying]
  );

  const sortedCycles = useMemo(
    () =>
      Object.keys(groupedResults)
        .map((cycle) => Number(cycle))
        .sort((a, b) => a - b),
    [groupedResults]
  );

  const activeStageId = useMemo(() => {
    if (synthesizerLoadingCycle !== null) {
      return `cycle-${synthesizerLoadingCycle}`;
    }

    if (orderedCycleNumbers.length > 0) {
      const lastCycle = orderedCycleNumbers[orderedCycleNumbers.length - 1];
      const hasCycleOutput =
        (groupedResults[lastCycle]?.length ?? 0) > 0 ||
        Boolean(syntheses[lastCycle]) ||
        Boolean(synthesizerErrors[lastCycle]) ||
        isResearchLoading;

      if (hasCycleOutput) {
        return `cycle-${lastCycle}`;
      }
    }

    if (hasClarifierStage) {
      return "clarifier";
    }

    return "input";
  }, [
    groupedResults,
    hasClarifierStage,
    isResearchLoading,
    orderedCycleNumbers,
    synthesizerErrors,
    synthesizerLoadingCycle,
    syntheses,
  ]);

  const isProcessing =
    isResearchLoading ||
    isSynthesizerClarifying ||
    synthesizerLoadingCycle !== null;

  const renderInputStage = () => (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className={cn(
          "w-full space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-950",
          isProcessing ? "opacity-70" : ""
        )}
      >
        <label htmlFor="conversation" className="block text-sm font-medium">
          Conversation
        </label>

        <AttachedFilesList
          attachedFiles={attachedFiles}
          onFileRemoved={handleFileRemoved}
        />

        <textarea
          id="conversation"
          value={visibleConversation}
          onChange={(event) => setVisibleConversation(event.target.value)}
          placeholder="Summarized discussion or bullet list of findings..."
          className="h-40 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-600"
          required
          disabled={isProcessing}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Conversation stays in the browser until you submit.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isProcessing}
              className="inline-flex items-center rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:pointer-events-none disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {isSynthesizerClarifying
                ? "Synthesizer is understanding the question…"
                : isResearchLoading
                ? "Generating…"
                : "Run Researchers"}
            </button>
            <FileUpload onFilesAdded={handleFilesAdded} />
          </div>
        </div>
      </form>
      {researcherError ? (
        <div className="w-full rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {researcherError}
        </div>
      ) : null}
    </div>
  );

  const renderTimelineInputStage = () => (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      <div className="space-y-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Quick prompt
        </span>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3 shadow-inner transition focus-within:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/70 dark:focus-within:border-zinc-500">
          <textarea
            value={visibleConversation}
            onChange={(event) => setVisibleConversation(event.target.value)}
            placeholder="Summarize the conversation or drop a quick hypothesis..."
            className="h-32 w-full resize-y rounded-lg border-0 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            required
            disabled={isProcessing}
          />
        </div>
        {attachedFiles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <button
                key={`${file.name}-${index}`}
                type="button"
                onClick={() => handleFileRemoved(index)}
                className="group inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs text-zinc-600 transition hover:border-zinc-400 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
                title={`Remove ${file.name}`}
              >
                <span className="max-w-[160px] truncate font-medium group-hover:text-zinc-800 dark:group-hover:text-zinc-50">
                  {file.name}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-3.5 w-3.5 text-zinc-400 transition group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          Runs the full researcher workflow with this prompt.
        </span>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isProcessing}
            className="inline-flex items-center rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:pointer-events-none disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {isProcessing ? "Running…" : "Run"}
          </button>
          <FileUpload onFilesAdded={handleFilesAdded} />
        </div>
      </div>
    </form>
  );

  const renderClarifierStage = () => (
    <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 text-indigo-900 shadow-sm transition dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-100">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
            Synthesizer Clarifier
          </span>
          <h3 className="text-xl font-semibold">
            Understand the First Question &amp; Suggest Follow-ups
          </h3>
        </div>
        <div className="rounded-full border border-indigo-300 bg-white px-3 py-1 text-xs font-medium text-indigo-600 dark:border-indigo-500 dark:bg-indigo-900 dark:text-indigo-200">
          Cycle 0
        </div>
      </div>

      {initialClarifierError ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200">
          Synthesizer error: {initialClarifierError}
        </p>
      ) : isSynthesizerClarifying ? (
        <p className="text-sm text-indigo-700 dark:text-indigo-200">
          Synthesizer is analyzing the question…
        </p>
      ) : initialClarifier ? (
        <div className="space-y-4 text-sm leading-6">
          <p className="text-base font-medium text-indigo-800 dark:text-indigo-100">
            {initialClarifier.summary}
          </p>

          {initialClarifier.followUpQuestion ? (
            <div className="rounded-lg border border-indigo-200 bg-white px-4 py-3 dark:border-indigo-600 dark:bg-indigo-900/60">
              <h4 className="text-xs font-semibold uppercase text-indigo-500 dark:text-indigo-300">
                Recommended Follow-up Question
              </h4>
              <p className="mt-1 text-indigo-900 dark:text-indigo-100">
                {initialClarifier.followUpQuestion}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );

  const renderCycleStage = (cycleNumber: number) => {
    const cycleEntries = groupedResults[cycleNumber] ?? [];
    const synthesizerForCycle = syntheses[cycleNumber];
    const synthesizerErrorForCycle = synthesizerErrors[cycleNumber];
    const isCycleLoading = synthesizerLoadingCycle === cycleNumber;
    const isFollowUpCycle = cycleNumber > 1;
    const isFinalCycle = cycleNumber === MAX_CYCLES;
    const followUpQuestion = isFinalCycle
      ? ""
      : synthesizerForCycle?.followUpQuestion?.trim() ?? "";
    const nextCycle = cycleNumber + 1;
    const nextCycleConversation =
      nextCycle <= MAX_CYCLES ? cycleConversations[nextCycle] : undefined;
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {isFollowUpCycle
                ? `Cycle ${cycleNumber} — Follow-up Analysis`
                : "Cycle 1 — Primary Analysis"}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Compare researcher responses and Synthesizer summaries in one
              view.
            </p>
          </div>
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
            Cycle {cycleNumber}
          </span>
        </div>

        <div className="flex w-full flex-col gap-6">
          {cycleEntries.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              Collecting researcher responses…
            </div>
          ) : null}
          {cycleEntries.map((entry) => {
            const label =
              entry.phase === "initial"
                ? `InitialResponse#${entry.phasePosition}`
                : `FeedbackResponse#${entry.phasePosition}`;

            const researcherId =
              entry.status === "fulfilled"
                ? entry.result.researcherId
                : entry.researcherId;
            const colors = getResearcherColors(researcherId);

            return entry.status === "fulfilled" ? (
              <article
                key={`${entry.cycle}-${entry.result.researcherId}-${entry.phase}-${entry.phasePosition}`}
                className={cn(
                  "flex h-full flex-col justify-between rounded-xl border p-5 shadow-sm transition-all",
                  colors.border,
                  colors.bg
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs font-medium uppercase",
                        colors.label
                      )}
                    >
                      {label}
                    </span>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-wide",
                          colors.label
                        )}
                      >
                        Cycle {entry.cycle}
                      </span>
                      <h3
                        className={cn(
                          "text-lg font-bold capitalize",
                          colors.label
                        )}
                      >
                        {entry.result.researcherId}
                      </h3>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "mt-4 text-sm leading-6 whitespace-break-spaces",
                      colors.text
                    )}
                    dangerouslySetInnerHTML={{
                      __html: parseMarkdown(entry.result.answer),
                    }}
                  />
                </div>
              </article>
            ) : (
              <article
                key={`${entry.cycle}-${entry.researcherId}-${entry.phase}-${entry.phasePosition}`}
                className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase text-red-600 dark:text-red-300">
                    {label}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-red-500 dark:text-red-300/80">
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
                    {isFollowUpCycle ? "Follow-up Summary" : "Mediator Summary"}
                  </h3>
                </div>
                <div className="rounded-full border border-indigo-300 bg-white px-3 py-1 text-xs font-medium text-indigo-600 dark:border-indigo-500 dark:bg-indigo-900 dark:text-indigo-200">
                  {isFollowUpCycle ? "Cycle Follow-up" : "Collective View"}
                </div>
              </div>

              {synthesizerErrorForCycle ? (
                <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200">
                  Synthesizer error: {synthesizerErrorForCycle}
                </p>
              ) : isCycleLoading ? (
                <p className="text-sm text-indigo-700 dark:text-indigo-200">
                  Synthesizer is synthesizing researcher answers…
                </p>
              ) : synthesizerForCycle ? (
                <div className="space-y-4 text-sm leading-6">
                  <p className="text-base font-medium text-indigo-800 dark:text-indigo-100">
                    {synthesizerForCycle.summary}
                  </p>

                  {synthesizerForCycle.highlights &&
                  synthesizerForCycle.highlights.length > 0 ? (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-indigo-500 dark:text-indigo-300">
                        Key Highlights
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

                  {!isFinalCycle ? (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-indigo-500 dark:text-indigo-300">
                        Follow-up Question
                      </h4>
                      {followUpQuestion.length > 0 ? (
                        <div className="mt-2 rounded-lg border border-indigo-200 bg-white/70 px-4 py-2 text-indigo-800 dark:border-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-100">
                          <span>{followUpQuestion}</span>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-indigo-700 opacity-80 dark:text-indigo-200">
                          No follow-up question provided for this cycle.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {canTriggerNextCycle ? (
                    <button
                      type="button"
                      onClick={() => handleStartFollowUpCycle(cycleNumber)}
                      className="mt-4 inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-indigo-300 dark:focus:ring-offset-zinc-900"
                    >
                      Run Cycle {nextCycle}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {isNextCycleInFlight ? (
                <p className="mt-4 text-xs text-indigo-600 dark:text-indigo-200">
                  Cycle {nextCycle} is starting—researchers are preparing their
                  next-round analyses.
                </p>
              ) : null}
            </article>
          )}
        </div>
      </div>
    );
  };

  const stages = [
    {
      id: "input",
      title: "Problem Definition",
      subtitle: "Conversation",
      content: renderInputStage(),
    },
  ];

  if (hasClarifierStage) {
    stages.push({
      id: "clarifier",
      title: "Clarifier",
      subtitle: "Cycle 0",
      content: renderClarifierStage(),
    });
  }

  orderedCycleNumbers.forEach((cycleNumber) => {
    stages.push({
      id: `cycle-${cycleNumber}`,
      title: cycleNumber > 1 ? `Cycle ${cycleNumber}` : "Cycle 1",
      subtitle: cycleNumber > 1 ? "Follow-up" : "Primary",
      content: renderCycleStage(cycleNumber),
    });
  });

  const progressStageIndex = Math.max(
    0,
    stages.findIndex((stage) => stage.id === activeStageId)
  );

  const preferredStageId =
    viewMode === "focus" &&
    selectedStageId &&
    stages.some((stage) => stage.id === selectedStageId)
      ? selectedStageId
      : activeStageId;

  const focusStageIndex = Math.max(
    0,
    stages.findIndex((stage) => stage.id === preferredStageId)
  );

  const highlightedStageId =
    viewMode === "focus" ? preferredStageId : activeStageId;

  const timelineNodes: TimelineNode[] = [];

  stages.forEach((stage, stageIndex) => {
    const stageProgressStatus: TimelineStatus =
      stageIndex < progressStageIndex
        ? "done"
        : stageIndex === progressStageIndex
        ? "in-progress"
        : "upcoming";

    if (stage.id === "input") {
      const conversationSource =
        cycleConversations[1]?.trim() ||
        conversation.trim() ||
        visibleConversation.trim();

      const content =
        conversationSource.length > 0
          ? conversationSource
          : "Enter the conversation to start the research cycle.";
      let nodeStatus: TimelineStatus = stageProgressStatus;
      if (conversationSource.length === 0) {
        nodeStatus = "upcoming";
      } else if (isProcessing) {
        nodeStatus = "in-progress";
      } else {
        nodeStatus = "done";
      }

      const footer =
        conversationSource.length > 0
          ? isProcessing
            ? "Status: Running · Awaiting summary"
            : "Status: Submitted"
          : "Status: Pending";

      timelineNodes.push({
        id: stage.id,
        stageId: stage.id,
        status: nodeStatus,
        title: stage.title,
        subtitle: stage.subtitle,
        content,
        footer,
        renderContent: renderTimelineInputStage,
      });
      return;
    }

    if (stage.id === "clarifier") {
      let content = "Clarifier is getting ready.";
      let footer = "Status: Pending";
      let nodeStatus: TimelineStatus = "upcoming";
      let synthesizerDetails: TimelineSynthesizer | undefined;

      if (initialClarifierError) {
        content = initialClarifierError.trim();
        footer = "Status: Error";
        nodeStatus = "error";
      } else if (isSynthesizerClarifying) {
        content = "Synthesizer is summarizing the submitted materials…";
        footer = "Status: In Progress";
        nodeStatus = "in-progress";
      } else if (initialClarifier) {
        content = initialClarifier.summary.trim();
        footer = "Status: Complete";
        nodeStatus = "done";
        synthesizerDetails = {
          summary: initialClarifier.summary.trim(),
          followUp: initialClarifier.followUpQuestion?.trim(),
          loading: false,
        };
      }

      timelineNodes.push({
        id: stage.id,
        stageId: stage.id,
        status: nodeStatus,
        title: stage.title,
        subtitle: stage.subtitle,
        content,
        footer,
        synthesizer: synthesizerDetails,
      });
      return;
    }

    const cycleMatch = stage.id.match(/^cycle-(\d+)$/);
    if (cycleMatch) {
      const cycleNumber = Number(cycleMatch[1]);
      const cycleEntries = groupedResults[cycleNumber] ?? [];
      const fulfilledCount = cycleEntries.filter(
        (entry) => entry.status === "fulfilled"
      ).length;
      const errorCount = cycleEntries.length - fulfilledCount;
      const synthesizerForCycle = syntheses[cycleNumber];
      const synthesizerErrorForCycle = synthesizerErrors[cycleNumber];
      const isCycleLoading = synthesizerLoadingCycle === cycleNumber;
      const isFinalCycle = cycleNumber === MAX_CYCLES;
      const followUp = !isFinalCycle
        ? synthesizerForCycle?.followUpQuestion?.trim()
        : undefined;

      let cycleContent = "Cycle information is being prepared.";
      if (cycleEntries.length > 0) {
        if (fulfilledCount > 0) {
          cycleContent = `Collected ${fulfilledCount} researcher responses.`;
        } else {
          cycleContent = `Collecting ${cycleEntries.length} researcher responses.`;
        }
      } else if (isResearchLoading) {
        cycleContent = `Collecting researcher responses for Cycle ${cycleNumber}…`;
      } else {
        cycleContent = `Waiting for Cycle ${cycleNumber} results.`;
      }

      const cycleFooterParts: string[] = [];
      if (cycleEntries.length > 0) {
        cycleFooterParts.push(
          `Responses ${fulfilledCount}${
            errorCount > 0 ? ` · Errors ${errorCount}` : ""
          }`
        );
      } else {
        cycleFooterParts.push("Responses pending");
      }
      if (followUp) {
        cycleFooterParts.push("Follow-up ready");
      }
      const synthesizerDetails: TimelineSynthesizer = {
        summary: synthesizerForCycle?.summary?.trim(),
        highlights: synthesizerForCycle?.highlights?.map((highlight) => ({
          title: highlight.title,
          detail: highlight.detail,
        })),
        followUp,
        error: synthesizerErrorForCycle,
        loading: isCycleLoading,
      };

      let synthContent = cycleContent;
      if (synthesizerErrorForCycle) {
        synthContent = "Synthesizer encountered an error.";
      } else if (isCycleLoading) {
        synthContent = "Synthesizer is synthesizing researcher answers…";
      } else if (synthesizerDetails.summary) {
        synthContent = synthesizerDetails.summary;
      } else if (followUp) {
        synthContent = "Follow-up question is ready.";
      }

      const synthFooterParts: string[] = [];
      const cycleFooterLabel = cycleFooterParts.join(" · ");
      if (cycleFooterLabel.length > 0) {
        synthFooterParts.push(cycleFooterLabel);
      }
      let synthStatus: TimelineStatus = stageProgressStatus;
      if (synthesizerErrorForCycle) {
        synthFooterParts.push("Status: Error");
        synthStatus = "error";
      } else if (synthesizerDetails.summary) {
        synthFooterParts.push("Status: Complete");
        synthStatus = "done";
      } else if (isCycleLoading) {
        synthFooterParts.push("Status: In Progress");
        synthStatus = "in-progress";
      } else {
        synthFooterParts.push(`Status: ${STATUS_LABELS[stageProgressStatus]}`);
      }
      if (followUp) {
        synthFooterParts.push("Follow-up ready");
      }
      const synthFooter = synthFooterParts.join(" · ");

      timelineNodes.push({
        id: `${stage.id}-synth`,
        stageId: stage.id,
        status: synthStatus,
        title:
          cycleNumber > 1
            ? `Cycle ${cycleNumber} Synthesizer`
            : "Cycle 1 Synthesizer",
        subtitle: "Synthesizer",
        content: synthContent,
        footer: synthFooter,
        synthesizer: synthesizerDetails,
        isSynthNode: true,
      });

      return;
    }

    timelineNodes.push({
      id: stage.id,
      stageId: stage.id,
      status: stageProgressStatus,
      title: stage.title,
      subtitle: stage.subtitle,
      content: "Preparing details.",
      footer: `Status: ${STATUS_LABELS[stageProgressStatus]}`,
    });
  });

  const renderFocusView = () => (
    <div className="relative w-full overflow-hidden rounded-3xl border border-zinc-200 bg-white pb-12 pt-12 shadow-lg transition dark:border-zinc-800 dark:bg-zinc-950">
      <div
        className="flex min-h-[420px] gap-0 transition-transform duration-700 ease-[cubic-bezier(0.4,0.0,0.2,1)]"
        style={{ transform: `translateX(-${focusStageIndex * 100}%)` }}
      >
        {stages.map((stage) => (
          <section
            key={stage.id}
            className="flex min-h-full w-full shrink-0 flex-col gap-6 px-6 transition-all"
          >
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                {stage.subtitle}
              </span>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {stage.title}
              </h2>
            </div>
            {stage.content}
          </section>
        ))}
      </div>
    </div>
  );

  const renderTimelineView = () => {
    if (timelineNodes.length === 0) {
      return (
        <div className="relative w-full rounded-3xl border border-zinc-200 bg-white shadow-lg transition dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex min-h-[420px] items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
            No stages available for the timeline.
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full overflow-x-auto rounded-3xl border border-zinc-200 bg-white shadow-lg transition dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex min-h-[420px] items-start gap-6 px-8 py-10">
          {timelineNodes.map((node, index) => {
            const isComplete = node.status === "done";
            const isActive = node.status === "in-progress";
            const isError = node.status === "error";
            const isClarifierNode = node.id === "clarifier";
            const isCycleNode = node.id.startsWith("cycle-");
            const isSynthNode = node.isSynthNode;
            const cardWidthClass =
              isCycleNode || isSynthNode
                ? "w-[640px]"
                : isClarifierNode
                ? "w-[448px]"
                : "w-[320px]";

            return (
              <div key={node.id} className="flex items-center gap-6">
                <article
                  className={cn(
                    "flex shrink-0 flex-col gap-4 rounded-2xl border px-5 py-4 shadow-sm transition",
                    cardWidthClass,
                    isError
                      ? "border-red-400 bg-red-50/70 dark:border-red-500 dark:bg-red-900/40"
                      : isComplete
                      ? "border-emerald-400 bg-emerald-50/70 dark:border-emerald-500 dark:bg-emerald-900/40"
                      : isActive
                      ? "border-indigo-400 bg-indigo-50/80 dark:border-indigo-500 dark:bg-indigo-900/40"
                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        {node.subtitle}
                      </span>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        {node.title}
                      </h3>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        isError
                          ? "bg-red-500 text-white dark:bg-red-600"
                          : isComplete
                          ? "bg-emerald-500 text-white"
                          : isActive
                          ? "bg-amber-500 text-white"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-100"
                      )}
                    >
                      {STATUS_LABELS[node.status]}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {node.renderContent ? (
                      node.renderContent()
                    ) : node.content ? (
                      <p className="text-sm leading-snug text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">
                        {node.content}
                      </p>
                    ) : null}

                    {node.synthesizer ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                            Synthesizer
                          </h4>
                          {node.isSynthNode ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStageId(node.stageId);
                                setViewMode("focus");
                              }}
                              className="inline-flex items-center rounded-full border border-indigo-300 px-3 py-1 text-xs font-medium text-indigo-600 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 dark:border-indigo-500 dark:text-indigo-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-900/60 dark:hover:text-indigo-100"
                            >
                              Open full review
                            </button>
                          ) : null}
                        </div>
                        <div className="space-y-3 text-sm leading-snug text-indigo-800 dark:text-indigo-100">
                          {node.synthesizer.error ? (
                            <p className="text-red-500 dark:text-red-300">
                              Synthesizer error: {node.synthesizer.error}
                            </p>
                          ) : node.synthesizer.loading ? (
                            <p>
                              Synthesizer is synthesizing researcher answers…
                            </p>
                          ) : (
                            <>
                              {node.synthesizer.summary ? (
                                <p className="whitespace-pre-wrap font-medium">
                                  {node.synthesizer.summary}
                                </p>
                              ) : null}

                              {node.synthesizer.highlights &&
                              node.synthesizer.highlights.length > 0 ? (
                                <div className="space-y-2">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-200">
                                    Key Highlights
                                  </span>
                                  <ul className="space-y-2">
                                    {node.synthesizer.highlights.map(
                                      (highlight, idx) => (
                                        <li
                                          key={`${highlight.title}-${idx}`}
                                          className="space-y-1"
                                        >
                                          <p className="font-semibold text-indigo-700 dark:text-indigo-100">
                                            {highlight.title}
                                          </p>
                                          <p className="whitespace-pre-wrap text-sm text-indigo-800 dark:text-indigo-100">
                                            {highlight.detail}
                                          </p>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              ) : null}

                              {node.synthesizer.followUp ? (
                                <div className="space-y-1">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
                                    Follow-up Question
                                  </span>
                                  <p className="whitespace-pre-wrap text-sm text-indigo-800 dark:text-indigo-100">
                                    {node.synthesizer.followUp}
                                  </p>
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                    ) : null}

                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {node.footer}
                    </p>
                  </div>
                </article>
                {index < timelineNodes.length - 1 ? (
                  <div
                    className={cn(
                      "h-0.5 w-16 rounded-full",
                      isComplete
                        ? "bg-emerald-400"
                        : isActive
                        ? "bg-indigo-400"
                        : "bg-zinc-300 dark:bg-zinc-700"
                    )}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 bg-white px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Reasoning Researcher Agent</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Paste a conversation transcript and follow each stage of the research
          pipeline as it unfolds horizontally.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav className="flex flex-wrap items-center gap-2">
          {stages.map((stage) => (
            <button
              key={stage.id}
              type="button"
              onClick={() => {
                setViewMode("focus");
                setSelectedStageId(stage.id);
              }}
              aria-pressed={highlightedStageId === stage.id}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                highlightedStageId === stage.id
                  ? "border-indigo-500 bg-indigo-100 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-100"
                  : "border-zinc-200 bg-white/60 text-zinc-500 hover:border-indigo-200 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-indigo-500 dark:hover:text-indigo-200"
              )}
            >
              {stage.title}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white p-1 text-xs font-medium shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setViewMode("focus")}
            className={cn(
              "rounded-full px-3 py-1 transition",
              viewMode === "focus"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            )}
          >
            Focus
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedStageId(null);
              setViewMode("timeline");
            }}
            className={cn(
              "rounded-full px-3 py-1 transition",
              viewMode === "timeline"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            )}
          >
            Timeline
          </button>
        </div>
      </div>

      {viewMode === "timeline" ? renderTimelineView() : renderFocusView()}
    </main>
  );
}

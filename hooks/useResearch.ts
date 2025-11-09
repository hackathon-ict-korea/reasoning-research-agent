import { useState } from "react";

export type ResearchPhase = "initial" | "feedback";

const PHASE_ORDER: Record<ResearchPhase, number> = {
  initial: 0,
  feedback: 1,
};

export type FulfilledResult = {
  status: "fulfilled";
  cycle: number;
  result: {
    researcherId: string;
    answer: string;
    confidenceScore: number;
    rawText: string;
  };
  phase: ResearchPhase;
  phasePosition: number;
};

export type RejectedResult = {
  status: "rejected";
  cycle: number;
  error: string;
  researcherId: string;
  phase: ResearchPhase;
  phasePosition: number;
};

type ApiResponse = {
  cycle: number;
  results: Array<FulfilledResult | RejectedResult>;
};

type CallOptions = {
  conversation: string;
  researcherIds?: string[];
  cycle?: number;
};

export default function useResearch() {
  const [results, setResults] = useState<ApiResponse["results"]>([]);
  const [latestCycle, setLatestCycle] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call({ conversation, researcherIds, cycle = 1 }: CallOptions) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/researchers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ conversation, researcherIds, cycle }),
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
      setResults((previous) => {
        const filtered = previous.filter((entry) => entry.cycle !== data.cycle);
        return [...filtered, ...data.results].sort((a, b) => {
          if (a.cycle !== b.cycle) {
            return a.cycle - b.cycle;
          }

          const phaseDelta = PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase];
          if (phaseDelta !== 0) {
            return phaseDelta;
          }

          return a.phasePosition - b.phasePosition;
        });
      });
      setLatestCycle(data.cycle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setResults([]);
    setLatestCycle(null);
    setError(null);
  }

  return {
    results,
    latestCycle,
    isLoading,
    error,
    call,
    reset,
  };
}

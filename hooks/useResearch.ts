import { useState } from "react";

export type ResearchPhase = "initial" | "feedback" | "final";

const PHASE_ORDER: Record<ResearchPhase, number> = {
  initial: 0,
  feedback: 1,
  final: 2,
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

type CallOptions = {
  conversation: string;
  researcherIds?: string[];
  cycle?: number;
};

type StreamResultEvent = {
  type: "result";
  payload: FulfilledResult | RejectedResult;
};

type StreamPhaseCompleteEvent = {
  type: "phaseComplete";
  cycle: number;
  phase: ResearchPhase;
};

type StreamCompleteEvent = {
  type: "complete";
  cycle: number;
};

type StreamErrorEvent = {
  type: "error";
  message: string;
  cycle?: number;
};

type StreamEvent =
  | StreamResultEvent
  | StreamPhaseCompleteEvent
  | StreamCompleteEvent
  | StreamErrorEvent;

export default function useResearch() {
  const [results, setResults] = useState<
    Array<FulfilledResult | RejectedResult>
  >([]);
  const [latestCycle, setLatestCycle] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call({ conversation, researcherIds, cycle = 1 }: CallOptions) {
    setIsLoading(true);
    setError(null);
    setResults((previous) => previous.filter((entry) => entry.cycle !== cycle));

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

      if (!response.body) {
        throw new Error("Response body is empty.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamError: string | null = null;

      const processLine = (line: string) => {
        if (line.trim().length === 0) {
          return;
        }

        const event = JSON.parse(line) as StreamEvent;

        if (event.type === "result") {
          const payload = event.payload;

          setResults((previous) => {
            const filtered = previous.filter(
              (entry) =>
                !(
                  entry.cycle === payload.cycle &&
                  entry.phase === payload.phase &&
                  entry.phasePosition === payload.phasePosition
                )
            );

            return [...filtered, payload].sort((a, b) => {
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

          setLatestCycle((previous) =>
            previous === null
              ? payload.cycle
              : Math.max(previous, payload.cycle)
          );
          return;
        }

        if (event.type === "complete") {
          setLatestCycle((previous) =>
            previous === null ? event.cycle : Math.max(previous, event.cycle)
          );
          return;
        }

        if (event.type === "error") {
          streamError = event.message;
          return;
        }
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        buffer = lines.pop() ?? "";

        for (const line of lines) {
          processLine(line);
          if (streamError) {
            break;
          }
        }

        if (streamError) {
          break;
        }
      }

      buffer += decoder.decode();

      if (buffer.trim().length > 0 && !streamError) {
        processLine(buffer);
      }

      if (streamError) {
        throw new Error(streamError);
      }
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

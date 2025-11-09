import { useCallback, useState } from "react";

import type {
  SynthesizerApiResponse,
  SynthesizerRequestBody,
  SynthesizerResult,
} from "@/types/synthesizer.types";

type CallOptions = Pick<
  SynthesizerRequestBody,
  "conversation" | "researcherResponses"
>;

export default function useSynthesizer() {
  const [syntheses, setSyntheses] = useState<Record<number, SynthesizerResult>>(
    {}
  );
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [loadingCycle, setLoadingCycle] = useState<number | null>(null);
  const [latestCycle, setLatestCycle] = useState<number | null>(null);
  const isLoading = loadingCycle !== null;

  type ExtendedCallOptions = CallOptions & { cycle?: number };

  const call = useCallback(
    async ({
      conversation,
      researcherResponses,
      cycle = 1,
    }: ExtendedCallOptions) => {
      setLoadingCycle(cycle);
      setErrors((previous) => {
        if (!(cycle in previous)) {
          return previous;
        }

        const next = { ...previous };
        delete next[cycle];
        return next;
      });

      try {
        const response = await fetch("/api/synthesizer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversation,
            researcherResponses,
            cycle,
          } satisfies SynthesizerRequestBody),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(
            typeof errorBody.error === "string"
              ? errorBody.error
              : `Synthesizer request failed with status ${response.status}`
          );
        }

        const data = (await response.json()) as SynthesizerApiResponse;

        if (data.status !== "fulfilled") {
          throw new Error(data.error);
        }

        setSyntheses((previous) => ({
          ...previous,
          [data.cycle ?? cycle]: data.result,
        }));
        setLatestCycle(data.cycle ?? cycle);
      } catch (err) {
        setErrors((previous) => ({
          ...previous,
          [cycle]:
            err instanceof Error ? err.message : "Unexpected synthesizer error",
        }));
      } finally {
        setLoadingCycle((current) => (current === cycle ? null : current));
      }
    },
    []
  );

  const reset = useCallback(() => {
    setSyntheses({});
    setErrors({});
    setLoadingCycle(null);
    setLatestCycle(null);
  }, []);

  return {
    syntheses,
    errors,
    loadingCycle,
    latestCycle,
    synthesis: latestCycle !== null ? syntheses[latestCycle] ?? null : null,
    isLoading,
    error: latestCycle !== null ? errors[latestCycle] ?? null : null,
    call,
    getSynthesis(cycle: number) {
      return syntheses[cycle] ?? null;
    },
    getError(cycle: number) {
      return errors[cycle] ?? null;
    },
    reset,
  };
}

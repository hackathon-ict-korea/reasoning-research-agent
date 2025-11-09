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
  const [clarifier, setClarifier] = useState<SynthesizerResult | null>(null);
  const [clarifierError, setClarifierError] = useState<string | null>(null);
  const [isClarifying, setIsClarifying] = useState(false);
  const isLoading = loadingCycle !== null || isClarifying;

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
            mode: "synthesis",
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
    setClarifier(null);
    setClarifierError(null);
    setIsClarifying(false);
  }, []);

  const clarify = useCallback(
    async ({ conversation }: { conversation: string }) => {
      setIsClarifying(true);
      setClarifierError(null);

      try {
        const response = await fetch("/api/synthesizer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversation,
            mode: "clarify",
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

        setClarifier(data.result);
      } catch (err) {
        setClarifierError(
          err instanceof Error ? err.message : "Unexpected synthesizer error"
        );
        setClarifier(null);
      } finally {
        setIsClarifying(false);
      }
    },
    []
  );

  return {
    syntheses,
    errors,
    loadingCycle,
    latestCycle,
    synthesis: latestCycle !== null ? syntheses[latestCycle] ?? null : null,
    isLoading,
    error: latestCycle !== null ? errors[latestCycle] ?? null : null,
    call,
    clarify,
    clarifier,
    clarifierError,
    isClarifying,
    getSynthesis(cycle: number) {
      return syntheses[cycle] ?? null;
    },
    getError(cycle: number) {
      return errors[cycle] ?? null;
    },
    reset,
  };
}

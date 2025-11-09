import { useState } from "react";

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
  const [synthesis, setSynthesis] = useState<SynthesizerResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call({ conversation, researcherResponses }: CallOptions) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/synthesizer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation,
          researcherResponses,
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

      setSynthesis(data.result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unexpected synthesizer error"
      );
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setSynthesis(null);
    setError(null);
  }

  return {
    synthesis,
    isLoading,
    error,
    call,
    reset,
  };
}

import { useState } from "react";

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

export default function useResearch() {
  const [results, setResults] = useState<ApiResponse["results"]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(conversation: string, researcherIds?: string[]) {
    try {
      const response = await fetch("/api/researchers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ conversation, researcherIds }),
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

  return {
    results,
    isLoading,
    error,
    call,
  };
}

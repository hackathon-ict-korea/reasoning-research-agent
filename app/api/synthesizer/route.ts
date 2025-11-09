import { NextRequest } from "next/server";

import { runSynthesizerAgent } from "../../../lib/agents/synthesizer";
import type {
  ResearcherSynthesisInput,
  SynthesizerApiResponse,
  SynthesizerRequestBody,
} from "@/types/synthesizer.types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SynthesizerRequestBody;
    const { conversation, researcherResponses } = body;

    const validationError = validateRequestBody(
      conversation,
      researcherResponses
    );
    if (validationError) {
      return new Response(
        JSON.stringify({
          status: "rejected",
          error: validationError,
        } satisfies SynthesizerApiResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const result = await runSynthesizerAgent({
      conversation: conversation.trim(),
      researcherResponses,
    });

    return new Response(
      JSON.stringify({
        status: "fulfilled",
        result,
      } satisfies SynthesizerApiResponse),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "rejected",
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while running synthesizer agent.",
      } satisfies SynthesizerApiResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

function validateRequestBody(
  conversation: unknown,
  researcherResponses: unknown
): string | null {
  if (typeof conversation !== "string" || conversation.trim().length === 0) {
    return "conversation must be a non-empty string.";
  }

  if (!Array.isArray(researcherResponses) || researcherResponses.length === 0) {
    return "researcherResponses must be a non-empty array.";
  }

  const invalidIndex = researcherResponses.findIndex(
    (entry: unknown) => !isValidResearcherResponse(entry)
  );

  if (invalidIndex >= 0) {
    return `researcherResponses[${invalidIndex}] is invalid.`;
  }

  return null;
}

function isValidResearcherResponse(
  entry: unknown
): entry is ResearcherSynthesisInput {
  if (!entry || typeof entry !== "object") {
    return false;
  }

  const { researcherId, answer, confidenceScore } = entry as {
    researcherId?: unknown;
    answer?: unknown;
    confidenceScore?: unknown;
  };

  if (typeof researcherId !== "string") {
    return false;
  }

  if (typeof answer !== "string" || answer.trim().length === 0) {
    return false;
  }

  if (
    typeof confidenceScore !== "undefined" &&
    !Number.isFinite(Number(confidenceScore))
  ) {
    return false;
  }

  return true;
}

import { NextRequest } from "next/server";

import { runSynthesizerAgent } from "../../../lib/agents/synthesizer";
import type {
  ResearcherSynthesisInput,
  SynthesizerApiResponse,
  SynthesizerRequestBody,
} from "@/types/synthesizer.types";

export async function POST(request: NextRequest) {
  let requestCycle: number | undefined;

  try {
    const body = (await request.json()) as SynthesizerRequestBody;
    const { conversation, researcherResponses, cycle } = body;
    requestCycle = typeof cycle === "number" ? cycle : undefined;

    const validationError = validateRequestBody(
      conversation,
      researcherResponses,
      cycle
    );
    if (validationError) {
      return new Response(
        JSON.stringify({
          status: "rejected",
          error: validationError,
          cycle,
        } satisfies SynthesizerApiResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const cycleNumber = typeof cycle === "number" ? cycle : 1;

    const result = await runSynthesizerAgent({
      conversation: conversation.trim(),
      researcherResponses,
    });

    return new Response(
      JSON.stringify({
        status: "fulfilled",
        result,
        cycle: cycleNumber,
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
        cycle: typeof requestCycle === "number" ? requestCycle : 1,
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
  researcherResponses: unknown,
  cycle: unknown
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

  if (
    typeof cycle !== "undefined" &&
    (typeof cycle !== "number" ||
      !Number.isInteger(cycle) ||
      cycle <= 0 ||
      cycle > Number.MAX_SAFE_INTEGER)
  ) {
    return "`cycle` must be a positive integer when provided.";
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

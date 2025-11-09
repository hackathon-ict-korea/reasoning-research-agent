import { NextRequest } from "next/server";

import {
  runSynthesizerAgent,
  runSynthesizerClarifierAgent,
} from "../../../lib/agents/synthesizer";
import type {
  ResearcherSynthesisInput,
  SynthesizerApiResponse,
  SynthesizerRequestBody,
  SynthesizerMode,
} from "@/types/synthesizer.types";

export async function POST(request: NextRequest) {
  let requestCycle: number | undefined;
  let requestMode: SynthesizerMode = "synthesis";

  try {
    const body = (await request.json()) as SynthesizerRequestBody;
    const { conversation, researcherResponses, cycle, mode } = body;
    requestCycle = typeof cycle === "number" ? cycle : undefined;
    requestMode = mode === "clarify" ? "clarify" : "synthesis";

    const validationError = validateRequestBody(
      conversation,
      researcherResponses,
      cycle,
      requestMode
    );
    if (validationError) {
      return new Response(
        JSON.stringify({
          status: "rejected",
          error: validationError,
          cycle,
          mode: requestMode,
        } satisfies SynthesizerApiResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const cycleNumber =
      typeof cycle === "number" ? cycle : requestMode === "clarify" ? 0 : 1;

    const trimmedConversation = conversation.trim();

    const result =
      requestMode === "clarify"
        ? await runSynthesizerClarifierAgent({
            conversation: trimmedConversation,
          })
        : await runSynthesizerAgent({
            conversation: trimmedConversation,
            researcherResponses: researcherResponses ?? [],
            cycle: cycleNumber,
          });

    return new Response(
      JSON.stringify({
        status: "fulfilled",
        result,
        cycle: cycleNumber,
        mode: requestMode,
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
        cycle:
          typeof requestCycle === "number"
            ? requestCycle
            : requestMode === "clarify"
            ? 0
            : 1,
        mode: requestMode,
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
  cycle: unknown,
  mode: SynthesizerMode
): string | null {
  if (typeof conversation !== "string" || conversation.trim().length === 0) {
    return "conversation must be a non-empty string.";
  }

  if (mode === "synthesis") {
    if (
      !Array.isArray(researcherResponses) ||
      researcherResponses.length === 0
    ) {
      return "researcherResponses must be a non-empty array.";
    }

    const invalidIndex = researcherResponses.findIndex(
      (entry: unknown) => !isValidResearcherResponse(entry)
    );

    if (invalidIndex >= 0) {
      return `researcherResponses[${invalidIndex}] is invalid.`;
    }
  } else if (
    typeof researcherResponses !== "undefined" &&
    researcherResponses !== null &&
    !Array.isArray(researcherResponses)
  ) {
    return "researcherResponses must be omitted or an array when mode is clarify.";
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

import { generateText } from "ai";

import {
  defaultGoogleProviderOptions,
  geminiFlash,
} from "../../app/clients/google";
import { getResearcherCritiquePrompt, getResearcherPrompt } from "../prompts";
import { PeerResearcherResponse, ResearcherId } from "@/types/researcher.types";

type ProviderOptions = NonNullable<
  Parameters<typeof generateText>[0]["providerOptions"]
>;

export type ResearcherAgentArgs = {
  researcherId: ResearcherId;
  conversation: string;
  /**
   * Optional per-invocation provider options to merge with defaults.
   * Use this to tweak safety settings or thinking config for specific researchers.
   */
  providerOptions?: ProviderOptions;
};

export type ResearcherAgentResult = {
  researcherId: ResearcherId;
  answer: string;
  confidenceScore: number;
  /**
   * Raw text returned by the model before JSON parsing.
   * Helpful for debugging or presenting fallback output.
   */
  rawText: string;
};

export async function runResearcherAgent({
  researcherId,
  conversation,
  providerOptions,
}: ResearcherAgentArgs): Promise<ResearcherAgentResult> {
  const prompt = getResearcherPrompt(conversation, researcherId);

  return executeResearcherModel({
    researcherId,
    prompt,
    providerOptions,
  });
}

export type ResearcherCritiqueAgentArgs = {
  researcherId: ResearcherId;
  conversation: string;
  peerResponses: PeerResearcherResponse[];
  providerOptions?: ProviderOptions;
};

export async function runResearcherCritiqueAgent({
  researcherId,
  conversation,
  peerResponses,
  providerOptions,
}: ResearcherCritiqueAgentArgs): Promise<ResearcherAgentResult> {
  const prompt = getResearcherCritiquePrompt(
    conversation,
    researcherId,
    peerResponses
  );

  return executeResearcherModel({
    researcherId,
    prompt,
    providerOptions,
  });
}

type ExecuteResearcherModelArgs = {
  researcherId: ResearcherId;
  prompt: string;
  providerOptions?: ProviderOptions;
};

async function executeResearcherModel({
  researcherId,
  prompt,
  providerOptions,
}: ExecuteResearcherModelArgs): Promise<ResearcherAgentResult> {
  const mergedProviderOptions = mergeProviderOptions(
    defaultGoogleProviderOptions,
    providerOptions
  );

  const { text } = await generateText({
    model: geminiFlash,
    prompt,
    providerOptions: mergedProviderOptions,
  });

  const parsed = parseResearcherResponse(text, researcherId);

  return {
    researcherId,
    answer: parsed.answer,
    confidenceScore: parsed.confidenceScore,
    rawText: text,
  };
}

function mergeProviderOptions(
  defaults: ProviderOptions,
  overrides?: ProviderOptions
): ProviderOptions {
  if (!overrides) {
    return defaults;
  }

  return {
    ...defaults,
    ...overrides,
    google: {
      ...(defaults.google ?? {}),
      ...(overrides.google ?? {}),
    },
  };
}

function parseResearcherResponse(rawText: string, researcherId: ResearcherId) {
  const normalized = normalizeJsonFence(rawText);

  try {
    return coerceResearcherPayload(JSON.parse(normalized));
  } catch (initialError) {
    try {
      const repaired = repairJsonString(normalized);
      return coerceResearcherPayload(JSON.parse(repaired));
    } catch {
      throw new Error(
        `Failed to parse researcher response (${researcherId}): ${
          initialError instanceof Error
            ? initialError.message
            : String(initialError)
        }\nRaw text: ${rawText}`
      );
    }
  }
}

function normalizeJsonFence(input: string): string {
  const trimmed = input.trim();

  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    const withoutOpeningFence = trimmed.replace(/^```[a-zA-Z]*\s*/, "");
    const withoutClosingFence = withoutOpeningFence.replace(/\s*```$/, "");
    return withoutClosingFence.trim();
  }

  return trimmed;
}

function repairJsonString(input: string): string {
  const answerKeyIndex = input.indexOf(`"answer"`);
  if (answerKeyIndex === -1) {
    return input;
  }

  const colonIndex = input.indexOf(":", answerKeyIndex);
  if (colonIndex === -1) {
    return input;
  }

  const valueStartIndex = input.indexOf(`"`, colonIndex);
  if (valueStartIndex === -1) {
    return input;
  }

  const valueEndIndex = input.lastIndexOf(`"`);
  if (valueEndIndex === -1 || valueEndIndex <= valueStartIndex) {
    return input;
  }

  const answerValue = input.slice(valueStartIndex + 1, valueEndIndex);
  const sanitizedAnswer = JSON.stringify(answerValue);

  return (
    input.slice(0, valueStartIndex) +
    sanitizedAnswer +
    input.slice(valueEndIndex + 1)
  );
}

function coerceResearcherPayload(raw: unknown) {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("answer" in raw) ||
    !("confidence_score" in raw)
  ) {
    throw new Error("Response must contain `answer` and `confidence_score`.");
  }

  const answer = (raw as { answer: unknown }).answer;
  if (typeof answer !== "string") {
    throw new Error("`answer` must be a string.");
  }

  const confidenceValue = (raw as { confidence_score: unknown })
    .confidence_score;
  const confidenceScore = Number(confidenceValue);
  if (!Number.isFinite(confidenceScore)) {
    throw new Error("`confidence_score` must be a finite number.");
  }

  return {
    answer,
    confidenceScore,
  };
}

import { generateText } from "ai";

import { defaultGoogleProviderOptions, geminiFlash } from "../clients/google";
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
  try {
    const payload = JSON.parse(normalizeJsonFence(rawText)) as {
      confidence_score: unknown;
      answer: unknown;
    };

    if (typeof payload.answer !== "string") {
      throw new Error("`answer` must be a string.");
    }

    const confidenceScore = Number(payload.confidence_score);
    if (!Number.isFinite(confidenceScore)) {
      throw new Error("`confidence_score` must be a finite number.");
    }

    return {
      answer: payload.answer,
      confidenceScore,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse researcher response (${researcherId}): ${
        error instanceof Error ? error.message : String(error)
      }\nRaw text: ${rawText}`
    );
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

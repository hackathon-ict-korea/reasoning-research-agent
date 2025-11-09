import { generateText } from "ai";

import { defaultGoogleProviderOptions, geminiFlash } from "../clients/google";
import { getSynthesizerPrompt } from "../prompts";
import type {
  ResearcherSynthesisInput,
  SynthesizerResult,
} from "@/types/synthesizer.types";

type ProviderOptions = NonNullable<
  Parameters<typeof generateText>[0]["providerOptions"]
>;

export type SynthesizerAgentArgs = {
  conversation: string;
  researcherResponses: ResearcherSynthesisInput[];
  providerOptions?: ProviderOptions;
};

export async function runSynthesizerAgent({
  conversation,
  researcherResponses,
  providerOptions,
}: SynthesizerAgentArgs): Promise<SynthesizerResult> {
  const prompt = getSynthesizerPrompt(
    conversation,
    JSON.stringify(researcherResponses, null, 2)
  );

  const mergedProviderOptions = mergeProviderOptions(
    defaultGoogleProviderOptions,
    providerOptions
  );

  const { text } = await generateText({
    model: geminiFlash,
    prompt,
    providerOptions: mergedProviderOptions,
  });

  return parseSynthesizerResponse(text);
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

function parseSynthesizerResponse(rawText: string): SynthesizerResult {
  try {
    const payload = JSON.parse(normalizeJsonFence(rawText)) as {
      summary: unknown;
      mediatorNotes: unknown;
      highlights: unknown;
      followUpQuestions: unknown;
      rawText?: unknown;
    };

    if (typeof payload.summary !== "string") {
      throw new Error("`summary` must be a string.");
    }

    if (
      payload.mediatorNotes !== null &&
      typeof payload.mediatorNotes !== "string"
    ) {
      throw new Error("`mediatorNotes` must be a string or null.");
    }

    const highlights = Array.isArray(payload.highlights)
      ? payload.highlights.map((entry, index) => {
          if (
            !entry ||
            typeof entry !== "object" ||
            typeof (entry as { title?: unknown }).title !== "string" ||
            typeof (entry as { detail?: unknown }).detail !== "string"
          ) {
            throw new Error(`Highlight at index ${index} is invalid.`);
          }

          return {
            title: (entry as { title: string }).title,
            detail: (entry as { detail: string }).detail,
          };
        })
      : [];

    if (
      !Array.isArray(payload.followUpQuestions) ||
      payload.followUpQuestions.length === 0 ||
      payload.followUpQuestions.some((item) => typeof item !== "string")
    ) {
      throw new Error(
        "`followUpQuestions` must be a non-empty array of strings."
      );
    }

    const normalizedFollowUps = payload.followUpQuestions.slice(0, 2);
    while (normalizedFollowUps.length < 2) {
      normalizedFollowUps.push("");
    }

    return {
      summary: payload.summary,
      mediatorNotes:
        payload.mediatorNotes === null ? undefined : payload.mediatorNotes,
      highlights,
      followUpQuestions: normalizedFollowUps,
      rawText:
        typeof payload.rawText === "string" ? payload.rawText : rawText,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse synthesizer response: ${
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


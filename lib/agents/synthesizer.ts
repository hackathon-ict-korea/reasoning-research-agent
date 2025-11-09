import { generateText } from "ai";

import { defaultGoogleProviderOptions, geminiFlash } from "../clients/google";
import {
  getSynthesizerClarifierPrompt,
  getSynthesizerPrompt,
} from "../prompts";
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

export type SynthesizerClarifierAgentArgs = {
  conversation: string;
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

export async function runSynthesizerClarifierAgent({
  conversation,
  providerOptions,
}: SynthesizerClarifierAgentArgs): Promise<SynthesizerResult> {
  const prompt = getSynthesizerClarifierPrompt(conversation);

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
  const normalized = normalizeJsonFence(rawText);
  const payload = safeParseSynthesizerPayload(normalized);

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
    typeof payload.followUpQuestion !== "string" &&
    payload.followUpQuestion !== null
  ) {
    throw new Error("`followUpQuestion` must be a string or null.");
  }

  return {
    summary: payload.summary,
    mediatorNotes:
      payload.mediatorNotes === null ? undefined : payload.mediatorNotes,
    highlights,
    followUpQuestion: payload.followUpQuestion ?? "",
    rawText: typeof payload.rawText === "string" ? payload.rawText : rawText,
  };
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

type SynthesizerPayload = {
  summary: unknown;
  mediatorNotes: unknown;
  highlights: unknown;
  followUpQuestion: unknown;
  rawText?: unknown;
};

function safeParseSynthesizerPayload(input: string): SynthesizerPayload {
  try {
    return JSON.parse(input) as SynthesizerPayload;
  } catch (primaryError) {
    const repaired = repairSynthesizerJson(input);

    if (repaired !== input) {
      try {
        return JSON.parse(repaired) as SynthesizerPayload;
      } catch (secondaryError) {
        throw createParseError(secondaryError, input);
      }
    }

    throw createParseError(primaryError, input);
  }
}

function repairSynthesizerJson(input: string): string {
  let output = input;

  output = output.replace(/("detail"\s*:\s*"[^"]*")\s*,\s*{/g, "$1 }, {");

  return output;
}

function createParseError(error: unknown, rawText: string) {
  return new Error(
    `Failed to parse synthesizer response: ${
      error instanceof Error ? error.message : String(error)
    }\nRaw text: ${rawText}`
  );
}

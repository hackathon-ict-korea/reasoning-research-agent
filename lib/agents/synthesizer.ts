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
  cycle?: number;
  providerOptions?: ProviderOptions;
};

export type SynthesizerClarifierAgentArgs = {
  conversation: string;
  providerOptions?: ProviderOptions;
};

export async function runSynthesizerAgent({
  conversation,
  researcherResponses,
  cycle,
  providerOptions,
}: SynthesizerAgentArgs): Promise<SynthesizerResult> {
  const prompt = getSynthesizerPrompt(
    conversation,
    JSON.stringify(researcherResponses, null, 2),
    { cycle }
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
  const escapedQuotes = escapeInnerQuotes(input);
  if (escapedQuotes !== input) {
    return escapedQuotes;
  }

  return input.replace(/("detail"\s*:\s*"[^"]*")\s*,\s*{/g, "$1 }, {");
}

function escapeInnerQuotes(input: string): string {
  let insideString = false;
  let result = "";

  for (let index = 0; index < input.length; index++) {
    const char = input[index]!;
    const previous = index > 0 ? input[index - 1] : undefined;

    if (char === '"' && previous !== "\\") {
      if (!insideString) {
        insideString = true;
        result += char;
        continue;
      }

      const nextNonWhitespaceIndex = findNextNonWhitespaceIndex(
        input,
        index + 1
      );
      const nextChar =
        nextNonWhitespaceIndex !== null ? input[nextNonWhitespaceIndex] : null;

      if (
        nextChar !== null &&
        nextChar !== "," &&
        nextChar !== "}" &&
        nextChar !== "]" &&
        nextChar !== "\n" &&
        nextChar !== "\r"
      ) {
        result += '\\"';
        continue;
      }

      insideString = false;
      result += char;
      continue;
    }

    result += char;
  }

  return result;
}

function findNextNonWhitespaceIndex(
  input: string,
  start: number
): number | null {
  for (let index = start; index < input.length; index++) {
    const char = input[index]!;
    if (char.trim() !== "") {
      return index;
    }
  }
  return null;
}

function createParseError(error: unknown, rawText: string) {
  return new Error(
    `Failed to parse synthesizer response: ${
      error instanceof Error ? error.message : String(error)
    }\nRaw text: ${rawText}`
  );
}

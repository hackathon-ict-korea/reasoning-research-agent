import type { ResearcherId } from "./researcher.types";

export type ResearcherSynthesisInput = {
  researcherId: ResearcherId | string;
  answer: string;
  confidenceScore?: number;
};

export type SynthesizerHighlight = {
  title: string;
  detail: string;
};

export type SynthesizerResult = {
  summary: string;
  mediatorNotes?: string;
  highlights?: SynthesizerHighlight[];
  followUpQuestion: string;
  rawText?: string;
};

export type SynthesizerFulfilledResponse = {
  status: "fulfilled";
  result: SynthesizerResult;
  cycle?: number;
};

export type SynthesizerRejectedResponse = {
  status: "rejected";
  error: string;
  cycle?: number;
};

export type SynthesizerApiResponse =
  | SynthesizerFulfilledResponse
  | SynthesizerRejectedResponse;

export type SynthesizerRequestBody = {
  conversation: string;
  researcherResponses: ResearcherSynthesisInput[];
  cycle?: number;
};

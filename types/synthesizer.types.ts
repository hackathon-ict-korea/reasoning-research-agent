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
  followUpQuestions: string[];
  rawText?: string;
};

export type SynthesizerFulfilledResponse = {
  status: "fulfilled";
  result: SynthesizerResult;
};

export type SynthesizerRejectedResponse = {
  status: "rejected";
  error: string;
};

export type SynthesizerApiResponse =
  | SynthesizerFulfilledResponse
  | SynthesizerRejectedResponse;

export type SynthesizerRequestBody = {
  conversation: string;
  researcherResponses: ResearcherSynthesisInput[];
};


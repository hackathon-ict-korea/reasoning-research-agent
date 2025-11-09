// Prompts Module Entry Point

import { getSummarizerPrompt } from "./personas/summarizer";
import { getSynthesizerPrompt } from "./personas/synthesizer";
import { getReviewerPrompt } from "./personas/reviewer";

export type AgentType = "summarizer" | "synthesizer" | "reviewer";

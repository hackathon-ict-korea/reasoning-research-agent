// Prompts Module Entry Point

import { getReviewerPrompt } from "./personas/reviewer";
import { getSynthesizerPrompt } from "./personas/synthesizer";
import { getResearcherPrompt } from "./personas/researcher";

export type AgentType = "reviewer" | "synthesizer" | "researcher";

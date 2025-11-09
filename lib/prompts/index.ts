// Prompts Module Entry Point

import { getReviewerPrompt } from "./personas/reviewer";
import { getSynthesizerPrompt } from "./personas/synthesizer";
import {
  getResearcherPrompt,
  listResearcherPersonas,
} from "./personas/researchers";

export type AgentType = "reviewer" | "synthesizer" | "researcher";

export { getReviewerPrompt, getSynthesizerPrompt, getResearcherPrompt };
export { listResearcherPersonas };

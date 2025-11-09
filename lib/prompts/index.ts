// Prompts Module Entry Point

import { getReviewerPrompt } from "./personas/reviewer";
import { getSynthesizerPrompt } from "./personas/synthesizer";
import {
  getResearcherPrompt,
  listResearcherPersonas,
  getResearcherCritiquePrompt,
} from "./personas/researchers";

export type AgentType = "reviewer" | "synthesizer" | "researcher";

export {
  getReviewerPrompt,
  getSynthesizerPrompt,
  getResearcherPrompt,
  getResearcherCritiquePrompt,
};
export { listResearcherPersonas };

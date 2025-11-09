// Prompts Module Entry Point

import { getReviewerPrompt } from "./personas/reviewer";
import { getSynthesizerPrompt } from "./personas/synthesizer";
import { getSynthesizerClarifierPrompt } from "./personas/synthesizerClarifier";
import {
  getResearcherPrompt,
  listResearcherPersonas,
  getResearcherCritiquePrompt,
} from "./personas/researchers";

export type AgentType = "reviewer" | "synthesizer" | "researcher";

export {
  getReviewerPrompt,
  getSynthesizerPrompt,
  getSynthesizerClarifierPrompt,
  getResearcherPrompt,
  getResearcherCritiquePrompt,
};
export { listResearcherPersonas };

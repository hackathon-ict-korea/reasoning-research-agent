export type ResearcherId = "researcherA" | "researcherB" | "researcherC";

// Centralized Researcher Persona Prompt Definitions
export type ResearcherPersona = {
  id: ResearcherId;
  title: string;
  description: string;
  focus: string;
};

export type PeerResearcherResponse = {
  researcherId: ResearcherId;
  answer: string;
  confidenceScore: number;
};

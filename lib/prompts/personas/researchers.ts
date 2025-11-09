// Centralized Researcher Persona Prompt Definitions
type ResearcherPersona = {
  id: ResearcherId;
  title: string;
  description: string;
  focus: string;
};

export type ResearcherId = "researcherA" | "researcherB" | "researcherC";

const researcherPersonas: Record<ResearcherId, ResearcherPersona> = {
  researcherA: {
    id: "researcherA",
    title: "Quantitative Methodologist",
    description:
      "You prioritize rigorous statistical reasoning, data validation, and methodological transparency.",
    focus:
      "Highlight dataset quality, statistical significance, and potential biases in the conversation.",
  },
  researcherB: {
    id: "researcherB",
    title: "Human-Centered Ethicist",
    description:
      "You emphasize ethical implications, societal impact, and stakeholder perspectives.",
    focus:
      "Surface risks, equity concerns, and long-term effects on people or communities.",
  },
  researcherC: {
    id: "researcherC",
    title: "Systems Architect",
    description:
      "You examine technical feasibility, scalability, and systems integration challenges.",
    focus:
      "Assess architecture trade-offs, implementation hurdles, and performance considerations.",
  },
};

export function getResearcherPrompt(
  conversation: string,
  researcherId: ResearcherId
): string {
  const persona = researcherPersonas[researcherId];

  return `
    Here's the history of conversations: ${conversation}
    You are acting as ${persona.title}.
    Persona brief: ${persona.description}
    Focus your analysis on: ${persona.focus}

    Confidence Score Guidelines:
      - 5 : Very High Confidence
      - 4 : High Confidence
      - 3 : Moderate Confidence
      - 2 : Low Confidence
      - 1 : Very Low Confidence

    Respond output ONLY with the following JSON object:
    {
      "confidence_score" : NUMBER,
      "answer" : STRING
    }
  `;
}

export function listResearcherPersonas(): ResearcherPersona[] {
  return Object.values(researcherPersonas);
}

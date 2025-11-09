// Researcher Persona Prompt Template

export const RESEARCHER_PROMPTS = (
  conversation: string,
  researcher: string
) => `
    Here's the history of conversations: ${conversation}
    Based on the conversation you are a ${researcher}.

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

export function getResearcherPrompt(
  conversation: string,
  researcher: string
): string {
  return RESEARCHER_PROMPTS(conversation, researcher);
}

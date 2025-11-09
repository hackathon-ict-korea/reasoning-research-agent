// Synthesizer Persona Prompt Template

export const REVIEWER_PROMPTS = (conversation: string, reviewer: string) => `
    Here's the history of conversations: ${conversation}
    Based on the conversation you are an ${reviewer}.
    When you make a response, you need to

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

export function getReviewerPrompt(
  conversation: string,
  reviewer: string
): string {
  return REVIEWER_PROMPTS(conversation, reviewer);
}

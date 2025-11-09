// Synthesizer Persona Prompt Template

export const SYNTHESIZER_PROMPTS = (conversation: string) => `
    You are a conversation summarizer and creative follow-up generator.
    
    # Task
    1. Summarize the previous discussion in 2-3 sentences.
    2. Identify an open or underexplored topic in that discussion.
    3. Generate one thought-provoking follow-up question that encourages deeper reasoning, critique, or application.
    
    Here's the history of conversations: ${conversation}
    
    Respond output ONLY with the following JSON object:
    {
      "question" : STRING
    }
`;

export function getSynthesizerPrompt(conversation: string): string {
  return SYNTHESIZER_PROMPTS(conversation);
}

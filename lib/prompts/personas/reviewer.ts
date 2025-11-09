// Reviewer Persona Prompt Template

export const REVIEWER_PROMPTS = (inputPapers: string[]) => `
    You are an expert research analyst specializing in academic paper summarization.
    Your task is to summarize the given input papers with precision and academic clarity.
    
    Length Control**
       - Produce a summary of approximately 250–300 words.  
    
    Here's the input papers : ${inputPapers}
    
    Respond output ONLY with the following JSON object:
    {{
      "summary" : ""
    }}
`;

export function getReviewerPrompt(inputPapers: string[]): string {
  return REVIEWER_PROMPTS(inputPapers);
}

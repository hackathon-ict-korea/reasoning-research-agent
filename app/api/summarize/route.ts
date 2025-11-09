import { generateText } from "ai";
import { geminiPro } from "@/lib/clients/google";

export const runtime = "edge";

const SUMMARIZER_SYSTEM_PROMPT = `You are an expert research analyst specializing in academic paper summarization.
    Your task is to summarize the given input papers with precision and academic clarity.

    Length Control : Produce a summary of approximately 250–300 words.

    Respond output ONLY with the following JSON object:
    {
      "summary" : STRING
    }
`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    console.log("messages", messages);

    const coreMessages = messages.map((msg: any) => {
      const content: any[] = [];

      for (const part of msg.parts) {
        if (part.type === "text") {
          content.push({ type: "text", text: part.text });
        } else if (part.type === "file") {
          // Handle image/pdf files
          const mimeType = part.mimeType || "image/jpeg";
          content.push({
            type: "image",
            image: part.data, // base64 data URL
            mimeType,
          });
        }
      }

      return {
        role: msg.role === "user" ? "user" : "assistant",
        content,
      };
    });

    const result = await generateText({
      model: geminiPro,
      system: SUMMARIZER_SYSTEM_PROMPT,
      messages: coreMessages,
    });

    return new Response(JSON.stringify({ text: result.text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Summarize API error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

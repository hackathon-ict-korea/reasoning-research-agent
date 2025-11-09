import { streamText } from "ai";
import { geminiPro } from "@/app/clients/google";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

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

    const result = streamText({
      model: geminiPro,
      messages: coreMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

import { NextRequest } from "next/server";

import { runResearcherAgent } from "../../../lib/agents/researchers";
import { listResearcherPersonas } from "../../../lib/prompts";

type RequestBody = {
  conversation: string;
  researcherIds?: string[];
};

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { conversation, researcherIds } = body;

    if (typeof conversation !== "string" || conversation.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: "conversation must be a non-empty string",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const availableResearchers = listResearcherPersonas().map(
      (persona) => persona.id
    );

    const targetResearchers = (researcherIds ?? availableResearchers).filter(
      (id): id is (typeof availableResearchers)[number] =>
        availableResearchers.includes(
          id as (typeof availableResearchers)[number]
        )
    );

    if (targetResearchers.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "No valid researcher IDs provided. Pass `researcherIds` with known IDs or leave empty to use all.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const results = await Promise.all(
      targetResearchers.map((researcherId) =>
        runResearcherAgent({
          researcherId,
          conversation,
        })
          .then((result) => ({ status: "fulfilled", result }))
          .catch((error: unknown) => ({
            status: "rejected" as const,
            error:
              error instanceof Error
                ? error.message
                : "Unknown researcher error",
            researcherId,
          }))
      )
    );

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while running researcher agents.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

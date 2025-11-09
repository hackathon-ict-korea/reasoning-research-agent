import { NextRequest } from "next/server";

import {
  runResearcherAgent,
  runResearcherCritiqueAgent,
} from "../../../lib/agents/researchers";
import { listResearcherPersonas } from "../../../lib/prompts";
import type { PeerResearcherResponse } from "@/types/researcher.types";

type RequestBody = {
  conversation: string;
  researcherIds?: string[];
};

type InitialAgentResult =
  | {
      status: "fulfilled";
      phase: "initial";
      result: Awaited<ReturnType<typeof runResearcherAgent>>;
    }
  | {
      status: "rejected";
      phase: "initial";
      error: string;
      researcherId: string;
    };

type FeedbackAgentResult =
  | {
      status: "fulfilled";
      phase: "feedback";
      result: Awaited<ReturnType<typeof runResearcherCritiqueAgent>>;
    }
  | {
      status: "rejected";
      phase: "feedback";
      error: string;
      researcherId: string;
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

    const initialResults: InitialAgentResult[] = await Promise.all(
      targetResearchers.map((researcherId) =>
        runResearcherAgent({
          researcherId,
          conversation,
        })
          .then((result) => ({
            status: "fulfilled" as const,
            phase: "initial" as const,
            result,
          }))
          .catch((error: unknown) => ({
            status: "rejected" as const,
            phase: "initial" as const,
            error:
              error instanceof Error
                ? error.message
                : "Unknown researcher error",
            researcherId,
          }))
      )
    );

    const fulfilledInitial = initialResults.filter(
      (entry): entry is Extract<InitialAgentResult, { status: "fulfilled" }> =>
        entry.status === "fulfilled"
    );

    const rejectedInitial = initialResults.filter(
      (entry): entry is Extract<InitialAgentResult, { status: "rejected" }> =>
        entry.status === "rejected"
    );

    fulfilledInitial.sort(
      (a, b) => b.result.confidenceScore - a.result.confidenceScore
    );

    const orderedInitialFulfilled = fulfilledInitial.map((entry, index) => ({
      ...entry,
      phasePosition: index + 1,
    }));

    const orderedInitialRejected = rejectedInitial.map((entry, index) => ({
      ...entry,
      phasePosition: orderedInitialFulfilled.length + index + 1,
    }));

    const peerResponses: PeerResearcherResponse[] = orderedInitialFulfilled.map(
      ({ result }) => ({
        researcherId: result.researcherId,
        answer: result.answer,
        confidenceScore: result.confidenceScore,
      })
    );

    const feedbackResults: FeedbackAgentResult[] =
      orderedInitialFulfilled.length === 0
        ? []
        : await Promise.all(
            orderedInitialFulfilled.map((entry) =>
              runResearcherCritiqueAgent({
                researcherId: entry.result.researcherId,
                conversation,
                peerResponses: peerResponses.filter(
                  (peer) => peer.researcherId !== entry.result.researcherId
                ),
              })
                .then((result) => ({
                  status: "fulfilled" as const,
                  phase: "feedback" as const,
                  result,
                }))
                .catch((error: unknown) => ({
                  status: "rejected" as const,
                  phase: "feedback" as const,
                  error:
                    error instanceof Error
                      ? error.message
                      : "Unknown researcher error",
                  researcherId: entry.result.researcherId,
                }))
            )
          );

    const fulfilledFeedback = feedbackResults.filter(
      (
        entry
      ): entry is Extract<
        (typeof feedbackResults)[number],
        { status: "fulfilled" }
      > => entry.status === "fulfilled"
    );

    const rejectedFeedback = feedbackResults.filter(
      (
        entry
      ): entry is Extract<
        (typeof feedbackResults)[number],
        { status: "rejected" }
      > => entry.status === "rejected"
    );

    const orderedFeedbackFulfilled = fulfilledFeedback.map((entry, index) => ({
      ...entry,
      phasePosition: index + 1,
    }));

    const orderedFeedbackRejected = rejectedFeedback.map((entry, index) => ({
      ...entry,
      phasePosition: orderedFeedbackFulfilled.length + index + 1,
    }));

    const orderedResults = [
      ...orderedInitialFulfilled,
      ...orderedInitialRejected,
      ...orderedFeedbackFulfilled,
      ...orderedFeedbackRejected,
    ];

    return new Response(JSON.stringify({ results: orderedResults }), {
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

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
  /**
   * Optional cycle marker so the client can run multiple rounds.
   * Defaults to 1 when omitted.
   */
  cycle?: number;
};

type ResearchPhase = "initial" | "feedback" | "final";

type StreamFulfilledResult = {
  status: "fulfilled";
  cycle: number;
  phase: ResearchPhase;
  phasePosition: number;
  result: Awaited<ReturnType<typeof runResearcherAgent>>;
};

type StreamRejectedResult = {
  status: "rejected";
  cycle: number;
  phase: ResearchPhase;
  phasePosition: number;
  researcherId: string;
  error: string;
};

type StreamResult = StreamFulfilledResult | StreamRejectedResult;

type StreamEvent =
  | { type: "result"; payload: StreamResult }
  | { type: "phaseComplete"; cycle: number; phase: ResearchPhase }
  | { type: "complete"; cycle: number }
  | { type: "error"; message: string; cycle?: number };

function buildConversationWithHistory(
  baseConversation: string,
  responses: Array<{ researcherId: string; answer: string }>
): string {
  if (responses.length === 0) {
    return baseConversation;
  }

  const responsesText = responses
    .map((r) => `"${r.researcherId}": "${r.answer}"`)
    .join("\n\n");

  return `${baseConversation}\n\n=== Previous Responses ===\n${responsesText}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { conversation, researcherIds, cycle } = body;

    if (
      typeof cycle !== "undefined" &&
      (typeof cycle !== "number" ||
        !Number.isInteger(cycle) ||
        cycle <= 0 ||
        cycle > Number.MAX_SAFE_INTEGER)
    ) {
      return new Response(
        JSON.stringify({
          error: "`cycle` must be a positive integer when provided.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const cycleNumber = typeof cycle === "number" ? cycle : 1;

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

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start: async (controller) => {
        const send = (event: StreamEvent) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        const closeWithError = (message: string) => {
          send({ type: "error", message, cycle: cycleNumber });
          controller.close();
        };

        try {
          let initialPosition = 1;
          const initialFulfilled: StreamFulfilledResult[] = [];

          await Promise.all(
            targetResearchers.map(async (researcherId) => {
              const phasePosition = initialPosition++;

              try {
                const result = await runResearcherAgent({
                  researcherId,
                  conversation,
                });

                const entry: StreamFulfilledResult = {
                  status: "fulfilled",
                  cycle: cycleNumber,
                  phase: "initial",
                  phasePosition,
                  result,
                };

                initialFulfilled.push(entry);
                send({ type: "result", payload: entry });
              } catch (error) {
                const entry: StreamRejectedResult = {
                  status: "rejected",
                  cycle: cycleNumber,
                  phase: "initial",
                  phasePosition,
                  researcherId,
                  error:
                    error instanceof Error
                      ? error.message
                      : "Unknown researcher error",
                };

                send({ type: "result", payload: entry });
              }
            })
          );

          send({ type: "phaseComplete", cycle: cycleNumber, phase: "initial" });

          if (initialFulfilled.length === 0) {
            send({ type: "complete", cycle: cycleNumber });
            controller.close();
            return;
          }

          const peerResponses: PeerResearcherResponse[] = initialFulfilled.map(
            ({ result }) => ({
              researcherId: result.researcherId,
              answer: result.answer,
              confidenceScore: result.confidenceScore,
            })
          );

          // Build conversation with initial responses
          const conversationWithInitial = buildConversationWithHistory(
            conversation,
            peerResponses.map((p) => ({
              researcherId: p.researcherId,
              answer: p.answer,
            }))
          );

          let feedbackBest: StreamFulfilledResult | null = null;
          let feedbackErrorPosition = 2;

          await Promise.all(
            targetResearchers.map(async (researcherId) => {
              try {
                const result = await runResearcherCritiqueAgent({
                  researcherId,
                  conversation: conversationWithInitial,
                  peerResponses: peerResponses.filter(
                    (peer) => peer.researcherId !== researcherId
                  ),
                });

                if (
                  feedbackBest === null ||
                  result.confidenceScore > feedbackBest.result.confidenceScore
                ) {
                  const entry: StreamFulfilledResult = {
                    status: "fulfilled",
                    cycle: cycleNumber,
                    phase: "feedback",
                    phasePosition: 1,
                    result,
                  };

                  feedbackBest = entry;
                  send({ type: "result", payload: entry });
                }
              } catch (error) {
                const entry: StreamRejectedResult = {
                  status: "rejected",
                  cycle: cycleNumber,
                  phase: "feedback",
                  phasePosition: feedbackErrorPosition++,
                  researcherId,
                  error:
                    error instanceof Error
                      ? error.message
                      : "Unknown researcher error",
                };

                send({ type: "result", payload: entry });
              }
            })
          );

          send({
            type: "phaseComplete",
            cycle: cycleNumber,
            phase: "feedback",
          });

          if (feedbackBest === null) {
            send({ type: "complete", cycle: cycleNumber });
            controller.close();
            return;
          }

          const feedbackWinner = feedbackBest as StreamFulfilledResult;

          const peerResponsesWithFeedback: PeerResearcherResponse[] = [
            ...peerResponses,
            {
              researcherId: feedbackWinner.result.researcherId,
              answer: feedbackWinner.result.answer,
              confidenceScore: feedbackWinner.result.confidenceScore,
            },
          ];

          // Build conversation with all responses so far
          const conversationWithFeedback = buildConversationWithHistory(
            conversation,
            peerResponsesWithFeedback.map((p) => ({
              researcherId: p.researcherId,
              answer: p.answer,
            }))
          );

          let finalBest: StreamFulfilledResult | null = null;
          let finalErrorPosition = 2;

          await Promise.all(
            targetResearchers
              .filter(
                (researcherId) =>
                  researcherId !== feedbackWinner.result.researcherId
              )
              .map(async (researcherId) => {
                try {
                  const result = await runResearcherCritiqueAgent({
                    researcherId,
                    conversation: conversationWithFeedback,
                    peerResponses: peerResponsesWithFeedback.filter(
                      (peer) => peer.researcherId !== researcherId
                    ),
                  });

                  if (
                    finalBest === null ||
                    result.confidenceScore > finalBest.result.confidenceScore
                  ) {
                    const entry: StreamFulfilledResult = {
                      status: "fulfilled",
                      cycle: cycleNumber,
                      phase: "final",
                      phasePosition: 1,
                      result,
                    };

                    finalBest = entry;
                    send({ type: "result", payload: entry });
                  }
                } catch (error) {
                  const entry: StreamRejectedResult = {
                    status: "rejected",
                    cycle: cycleNumber,
                    phase: "final",
                    phasePosition: finalErrorPosition++,
                    researcherId,
                    error:
                      error instanceof Error
                        ? error.message
                        : "Unknown researcher error",
                  };

                  send({ type: "result", payload: entry });
                }
              })
          );

          send({
            type: "phaseComplete",
            cycle: cycleNumber,
            phase: "final",
          });

          send({ type: "complete", cycle: cycleNumber });
          controller.close();
        } catch (error) {
          closeWithError(
            error instanceof Error
              ? error.message
              : "Unexpected error while running researcher agents."
          );
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/jsonl; charset=utf-8",
        "Cache-Control": "no-store",
      },
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

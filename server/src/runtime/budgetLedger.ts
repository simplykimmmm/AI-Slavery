import type { PrismaClient } from "@prisma/client";
import type { ModelUsage } from "../ai/modelClient.js";

export const recordModelUsage = async (
  prisma: PrismaClient,
  input: { taskId: string; agentId: string; usage: ModelUsage },
) => {
  const totalTokens = input.usage.inputTokens + input.usage.outputTokens;
  await prisma.$transaction([
    prisma.costLedgerEntry.create({
      data: {
        taskId: input.taskId,
        agentId: input.agentId,
        provider: input.usage.provider,
        model: input.usage.model,
        inputTokens: input.usage.inputTokens,
        outputTokens: input.usage.outputTokens,
        estimatedCost: input.usage.estimatedCost,
      },
    }),
    prisma.agent.update({
      where: { id: input.agentId },
      data: {
        totalTokensSpent: { increment: totalTokens },
        totalCost: { increment: input.usage.estimatedCost },
      },
    }),
  ]);
};

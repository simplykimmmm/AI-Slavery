import { Router } from "express";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";

const jsonArray = z.array(z.unknown()).default([]);
const createSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().default(""),
  type: z.string().default("CUSTOM"),
  doctrine: z.string().default("BALANCED"),
  riskLevel: z.string().default("STANDARD"),
  status: z.string().default("DRAFT"),
  objectives: jsonArray,
  missions: jsonArray,
  reports: jsonArray,
});
const patchSchema = createSchema.partial().extend({ startedAt: z.coerce.date().nullable().optional(), completedAt: z.coerce.date().nullable().optional() });

export const campaignsRouter = (prisma: PrismaClient) => {
  const router = Router();
  router.get("/", async (_request, response) => response.json(await prisma.campaign.findMany({ orderBy: { createdAt: "desc" } })));
  router.post("/", async (request, response) => {
    const data = createSchema.parse(request.body);
    response.status(201).json(await prisma.campaign.create({ data: {
      ...data,
      objectives: data.objectives as Prisma.InputJsonValue,
      missions: data.missions as Prisma.InputJsonValue,
      reports: data.reports as Prisma.InputJsonValue,
    } }));
  });
  router.patch("/:id", async (request, response) => {
    const data = patchSchema.parse(request.body);
    response.json(await prisma.campaign.update({ where: { id: request.params.id }, data: data as Prisma.CampaignUpdateInput }));
  });
  return router;
};

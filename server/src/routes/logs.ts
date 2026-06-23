import { Router } from "express";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";

export const logsRouter = (prisma: PrismaClient) => {
  const router = Router();
  router.get("/", async (request, response) => {
    const limit = z.coerce.number().int().min(1).max(500).default(150).parse(request.query.limit);
    response.json(await prisma.logEntry.findMany({ orderBy: { timestamp: "desc" }, take: limit }));
  });
  return router;
};

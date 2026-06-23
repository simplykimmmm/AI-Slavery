import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { calculateStats } from "../runtime/stateGraph.js";

export const statsRouter = (prisma: PrismaClient) => {
  const router = Router();
  router.get("/", async (_request, response) => response.json(await calculateStats(prisma)));
  return router;
};

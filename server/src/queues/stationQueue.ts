import { Queue } from "bullmq";
import { redisConnection } from "./connection.js";

export const QUEUE_NAMES = {
  stationTick: "station-tick",
  taskExecution: "task-execution",
  qualityReview: "quality-review",
  externalAction: "external-action",
} as const;

const defaults = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 1_000 },
  removeOnComplete: 250,
  removeOnFail: 500,
};

export const stationTickQueue = new Queue(QUEUE_NAMES.stationTick, { connection: redisConnection, defaultJobOptions: defaults });
export const taskExecutionQueue = new Queue(QUEUE_NAMES.taskExecution, { connection: redisConnection, defaultJobOptions: defaults });
export const qualityReviewQueue = new Queue(QUEUE_NAMES.qualityReview, { connection: redisConnection, defaultJobOptions: defaults });
export const externalActionQueue = new Queue(QUEUE_NAMES.externalAction, { connection: redisConnection, defaultJobOptions: defaults });

export const closeQueues = async () => {
  await Promise.all([
    stationTickQueue.close(),
    taskExecutionQueue.close(),
    qualityReviewQueue.close(),
    externalActionQueue.close(),
  ]);
};

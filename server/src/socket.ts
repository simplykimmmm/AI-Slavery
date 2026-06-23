import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./env.js";
import { runtimeBus } from "./runtime/events.js";
import { db } from "./db.js";
import { getStateSnapshot } from "./runtime/stateGraph.js";

export const createSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim()), credentials: true },
  });

  io.on("connection", async (socket) => {
    socket.emit("state:snapshot", await getStateSnapshot(db));
  });

  const events = ["state:snapshot", "agent:updated", "task:updated", "log:created", "stats:updated", "runtime:event"];
  for (const event of events) {
    runtimeBus.on(event, (payload) => io.emit(event, payload));
  }
  return io;
};

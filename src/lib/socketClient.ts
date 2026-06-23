import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "./apiClient";

let socket: Socket | null = null;

export const getStationSocket = () => {
  if (!socket) {
    socket = io(API_BASE_URL || window.location.origin, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 8_000,
      timeout: 3_000,
    });
  }
  return socket;
};

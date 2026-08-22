import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../../shared/types/SocketEvents.ts";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  "http://localhost:3000",
  {
    autoConnect: false,
    transports: ["websocket"],
  },
);

socket.on("connect", () => {
  console.log("Socket conectado:", socket.id);
});

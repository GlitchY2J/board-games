import { io } from "socket.io-client";

const roomCode = process.argv[2];
if (!roomCode) {
  console.error(
    "Por favor, especifica el código de la sala. Ej: node test-guest.js ABCD",
  );
  process.exit(1);
}

const socket = io("http://localhost:3000", {
  transports: ["websocket"],
  autoConnect: false,
});

socket.on("connect", async () => {
  console.log("Socket conectado con ID:", socket.id);

  // Unirse a la sala via HTTP
  try {
    const response = await fetch("http://localhost:3000/rooms/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomCode: roomCode,
        playerName: "Invitado_" + Math.floor(Math.random() * 1000),
        socketId: socket.id,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Error uniendo a sala HTTP:", errText);
      socket.disconnect();
      return;
    }

    const data = await response.json();
    console.log("Unido via HTTP con éxito:", data);

    // Ahora emitir join-room por socket
    console.log("Emitiendo join-room por socket...");
    socket.emit("join-room", {
      roomCode: roomCode,
      playerName: data.room.players.find((p) => p.id === data.playerId).name,
    });
  } catch (err) {
    console.error("Error:", err);
    socket.disconnect();
  }
});

socket.on("room-updated", (room) => {
  console.log(
    "EVENTO room-updated recibido en el invitado:",
    JSON.stringify(room, null, 2),
  );
});

socket.on("game-started", (gameState) => {
  console.log("EVENTO game-started recibido en el invitado!", gameState);
});

socket.on("game-error", (err) => {
  console.error("EVENTO game-error recibido:", err);
});

socket.connect();

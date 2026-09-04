const chatMessageAudio = new Audio('/sounds/chat-message.wav');
chatMessageAudio.volume = 0.3;

export function playChatMessageSound(): void {
  chatMessageAudio.currentTime = 0;
  chatMessageAudio.play().catch(() => {
    // El navegador puede bloquear audio hasta que exista interacción.
  });
}

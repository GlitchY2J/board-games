const pendingPlayAudio = new Audio('/sounds/pending-play.wav');
pendingPlayAudio.volume = 0.35;

export function playPendingPlaySound(): void {
  pendingPlayAudio.currentTime = 0;
  pendingPlayAudio.play().catch(() => {
    // El navegador puede bloquear audio hasta que exista interacción.
  });
}

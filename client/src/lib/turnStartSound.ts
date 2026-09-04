const turnStartAudio = new Audio('/sounds/turn-start.wav');
turnStartAudio.volume = 0.35;

export function playTurnStartSound(): void {
  turnStartAudio.currentTime = 0;
  turnStartAudio.play().catch(() => {
    // El navegador puede bloquear audio hasta que exista interacción.
  });
}

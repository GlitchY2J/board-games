const hoverAudio = new Audio('/sounds/hover-card.wav');
hoverAudio.volume = 0.2;

export function playCardHoverSound(): void {
  hoverAudio.currentTime = 0;
  hoverAudio.play().catch(() => {
    // El navegador puede bloquear audio hasta que exista interacción.
  });
}

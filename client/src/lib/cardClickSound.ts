const clickAudio = new Audio('/sounds/card-click.wav');
clickAudio.volume = 0.3;

export function playCardClickSound(): void {
  clickAudio.currentTime = 0;
  clickAudio.play().catch(() => {
    // El navegador puede bloquear audio hasta que exista interacción.
  });
}

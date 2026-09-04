const confirmAudio = new Audio('/sounds/button-confirm.wav');
const cancelAudio = new Audio('/sounds/button-cancel.wav');
confirmAudio.volume = 0.25;
cancelAudio.volume = 0.22;

export function playButtonSound(kind: 'confirm' | 'cancel'): void {
  const audio = kind === 'confirm' ? confirmAudio : cancelAudio;
  audio.currentTime = 0;
  audio.play().catch(() => {
    // El navegador puede bloquear audio hasta que exista interacción.
  });
}

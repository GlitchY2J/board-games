export const KEYBOARD_HINTS_STORAGE_KEY = 'show-keyboard-hints';
export const KEYBOARD_HINTS_EVENT = 'keyboard-hints-changed';

export function getKeyboardHintsEnabled(): boolean {
  return localStorage.getItem(KEYBOARD_HINTS_STORAGE_KEY) === 'true';
}

export function setKeyboardHintsEnabled(enabled: boolean): void {
  localStorage.setItem(KEYBOARD_HINTS_STORAGE_KEY, String(enabled));
  document.documentElement.dataset.keyboardHints = String(enabled);
  window.dispatchEvent(new Event(KEYBOARD_HINTS_EVENT));
}

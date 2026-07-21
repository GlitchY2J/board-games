type Listener = (...args: any[]) => void;

export class EventManager {
  private listeners = new Map<string, Listener[]>();

  on(event: string, callback: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event);

    if (!callbacks) return;

    callbacks.forEach((cb) => cb(...args));
  }
}

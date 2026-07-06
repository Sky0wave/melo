export class EventEmitter<Events extends Record<string, (...args: any[]) => void>> {
  private listeners: { [K in keyof Events]?: Events[K][] } = {};

  on<K extends keyof Events>(event: K, callback: Events[K]): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);
  }

  off<K extends keyof Events>(event: K, callback: Events[K]): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter(cb => cb !== callback);
  }

  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): void {
    const list = this.listeners[event];
    if (!list) return;
    for (const cb of list) {
      try {
        cb(...args);
      } catch (err) {
        console.error(`Error in event listener for event "${String(event)}":`, err);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}

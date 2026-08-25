type Listener = () => void;

let visible = false;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function requestSaveSubscriptionPrompt(): void {
  visible = true;
  notify();
}

export function dismissSaveSubscriptionPrompt(): void {
  visible = false;
  notify();
}

export function subscribeSaveSubscriptionPrompt(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isSaveSubscriptionPromptVisible(): boolean {
  return visible;
}

import type { WizardSnapshot } from "./db";
const key = (id: string) => `lang-trang-draft:${id}`;
// Synchronous write-ahead copy prevents a refresh interrupting an IndexedDB
// draft write between an input event and the next React effect.
export function writeDraftJournal(snapshot: WizardSnapshot) {
  localStorage.setItem(key(snapshot.id), JSON.stringify(snapshot));
}
export function removeDraftJournal(id: string) {
  localStorage.removeItem(key(id));
}
export function readDraftJournal(id: string): WizardSnapshot | undefined {
  const raw = localStorage.getItem(key(id));
  if (!raw) return;
  const parsed: unknown = JSON.parse(raw);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("id" in parsed) ||
    parsed.id !== id ||
    !("config" in parsed) ||
    !("counts" in parsed) ||
    !("step" in parsed)
  )
    throw new Error("Bản nháp cục bộ không hợp lệ.");
  return parsed as WizardSnapshot;
}

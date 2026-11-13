import { saveAttendance, saveMeal } from "./api";
import type { Status } from "./types";

export interface OfflineAction {
  id: string;
  type: "attendance" | "meal";
  timestamp: number;
  payload: any;
}

const STORAGE_KEY = "sf_offline_actions";

export function getOfflineQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineAttendanceDraft(date: string, schoolId: number, entries: Array<{ student_id: number; status: Status }>) {
  const queue = getOfflineQueue().filter((a) => !(a.type === "attendance" && a.payload.date === date));
  queue.push({
    id: "att_" + date + "_" + Date.now(),
    type: "attendance",
    timestamp: Date.now(),
    payload: { date, school_id: schoolId, entries },
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("sf_offline_change"));
}

export function saveOfflineMealDraft(date: string, qty: number, menu: string, notes = "", schoolId?: number) {
  const queue = getOfflineQueue().filter((a) => !(a.type === "meal" && a.payload.date === date));
  queue.push({
    id: "meal_" + date + "_" + Date.now(),
    type: "meal",
    timestamp: Date.now(),
    payload: { date, qty, menu, notes, school_id: schoolId },
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("sf_offline_change"));
}

export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0 };
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: OfflineAction[] = [];

  for (const action of queue) {
    try {
      if (action.type === "attendance") {
        await saveAttendance(action.payload);
      } else if (action.type === "meal") {
        await saveMeal(action.payload);
      }
      synced++;
    } catch (e) {
      console.warn("Failed to sync offline action:", action, e);
      failed++;
      remaining.push(action);
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  window.dispatchEvent(new Event("sf_offline_change"));
  return { synced, failed };
}

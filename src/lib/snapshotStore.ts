// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import { writable, get } from "svelte/store";
import type {
  Point,
  Line,
  SequenceItem,
  Shape,
  Settings,
} from "../types";
import {
  startPointStore,
  linesStore,
  shapesStore,
  sequenceStore,
  settingsStore,
  ensureSequenceConsistency
} from "./projectStore";
import { makeId } from "../utils/nameGenerator";

export interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  data: {
    startPoint: Point;
    lines: Line[];
    sequence: SequenceItem[];
    shapes: Shape[];
    settings: Settings;
  };
}

function createSnapshotStore() {
  const { subscribe, set, update } = writable<Snapshot[]>([]);

  // Load from localStorage on init
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("pedro_snapshots");
      if (stored) {
        set(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load snapshots from localStorage", e);
    }
  }

  // Persist to localStorage whenever changed
  subscribe((val) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pedro_snapshots", JSON.stringify(val));
      } catch (e) {
        console.warn("Failed to save snapshots to localStorage", e);
      }
    }
  });

  return {
    subscribe,
    create: (name: string) => {
      const data = {
        startPoint: JSON.parse(JSON.stringify(get(startPointStore))),
        lines: JSON.parse(JSON.stringify(get(linesStore))),
        sequence: JSON.parse(JSON.stringify(get(sequenceStore))),
        shapes: JSON.parse(JSON.stringify(get(shapesStore))),
        settings: JSON.parse(JSON.stringify(get(settingsStore))),
      };

      const snapshot: Snapshot = {
        id: makeId(),
        name: name || `Snapshot ${new Date().toLocaleTimeString()}`,
        timestamp: Date.now(),
        data,
      };

      update((snapshots) => [snapshot, ...snapshots]);
    },
    restore: (id: string) => {
      const snapshots = get(snapshotStore);
      const snapshot = snapshots.find((s) => s.id === id);
      if (snapshot) {
        startPointStore.set(JSON.parse(JSON.stringify(snapshot.data.startPoint)));
        linesStore.set(JSON.parse(JSON.stringify(snapshot.data.lines)));
        sequenceStore.set(JSON.parse(JSON.stringify(snapshot.data.sequence)));
        shapesStore.set(JSON.parse(JSON.stringify(snapshot.data.shapes)));
        settingsStore.set(JSON.parse(JSON.stringify(snapshot.data.settings)));

        // Ensure consistency after restore
        ensureSequenceConsistency();
      }
    },
    delete: (id: string) => {
      update((snapshots) => snapshots.filter((s) => s.id !== id));
    },
    rename: (id: string, newName: string) => {
      update((snapshots) =>
        snapshots.map((s) => (s.id === id ? { ...s, name: newName } : s))
      );
    },
    clear: () => set([]),
  };
}

export const snapshotStore = createSnapshotStore();

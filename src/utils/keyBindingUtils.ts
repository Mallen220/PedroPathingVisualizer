// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.

/**
 * Checks if a keyboard event matches a given key binding string.
 * Supports modifiers (ctrl, cmd, shift, alt) and multiple bindings separated by comma.
 * Example binding: "ctrl+s, cmd+s"
 */
export function checkKeyMatches(e: KeyboardEvent, binding: string): boolean {
  if (!binding) return false;

  const combos = binding.split(",").map((s) => s.trim().toLowerCase());

  for (const combo of combos) {
    const parts = combo.split("+").map((s) => s.trim());
    let key = parts.pop(); // The last part is the key
    const modifiers = parts;

    if (!key) continue;

    // Check modifiers
    const ctrl = modifiers.includes("ctrl");
    const meta = modifiers.includes("cmd") || modifiers.includes("meta"); // cmd is alias for meta
    const shift = modifiers.includes("shift");
    const alt = modifiers.includes("alt");

    // Match modifiers
    if (e.ctrlKey !== ctrl) continue;
    if (e.metaKey !== meta) continue;
    if (e.shiftKey !== shift) continue;
    if (e.altKey !== alt) continue;

    // Match key
    // Normalize event key
    const eventKey = e.key.toLowerCase();

    // Map some common keys if needed
    if (key === "space") key = " ";
    if (key === "escape") key = "escape";
    if (key === "esc") key = "escape";
    if (key === "return") key = "enter";
    if (key === "del") key = "delete";
    if (key === "ins") key = "insert";

    if (eventKey === key) return true;
  }

  return false;
}

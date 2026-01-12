// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import { render, fireEvent, screen } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import DeleteButtonWithConfirm from "../lib/components/DeleteButtonWithConfirm.svelte";

describe("DeleteButtonWithConfirm", () => {
  it("renders with trash icon initially", () => {
    const { container } = render(DeleteButtonWithConfirm, {
      title: "Remove Item",
    });
    const button = screen.getByRole("button", { name: "Remove Item" });
    expect(button).toBeInTheDocument();
    // Should verify icon presence, but checking aria-label or just button existence is a good start.
    // The icon is inside.
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("changes to confirm state on first click and does NOT emit click event", async () => {
    const handleClick = vi.fn();
    const { component } = render(DeleteButtonWithConfirm, {
      title: "Remove Item",
      confirmTitle: "Confirm Removal",
    });
    component.$on("click", handleClick);

    const button = screen.getByRole("button", { name: "Remove Item" });

    await fireEvent.click(button);

    // Should now show "Confirm?" text
    expect(screen.getByText("Confirm?")).toBeInTheDocument();
    // Should update aria-label
    expect(button).toHaveAttribute("aria-label", "Confirm Removal");

    // Should NOT have emitted click yet
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("emits click event on second click", async () => {
    const handleClick = vi.fn();
    const { component } = render(DeleteButtonWithConfirm);
    component.$on("click", handleClick);

    const button = screen.getByRole("button");

    // First click -> Confirm state
    await fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();

    // Second click -> Action
    await fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Should reset to initial state (Trash icon)
    expect(screen.queryByText("Confirm?")).not.toBeInTheDocument();
  });

  it("resets state on blur", async () => {
    // We need to use fake timers because blur has a delay
    vi.useFakeTimers();

    const { component } = render(DeleteButtonWithConfirm);
    const button = screen.getByRole("button");

    // First click -> Confirm state
    await fireEvent.click(button);
    expect(screen.getByText("Confirm?")).toBeInTheDocument();

    // Blur
    await fireEvent.blur(button);

    // Fast forward time past the 200ms delay
    vi.advanceTimersByTime(250);

    // Should be reset
    // We need to wait for svelte to update DOM?
    // Testing library usually waits, but with fake timers we might need to await something or just check.
    // Svelte updates are async.

    // Let's rely on the fact that the state variable changed.
    // Re-rendering happens async.
    // But testing-library `getBy` retries.
    // `queryBy` does not.
    // Let's wait for it to disappear.
    // But since we are using fake timers, `waitFor` might behave differently.

    // Actually, simply checking the state update effect:
    // We expect "Confirm?" to be gone.
    // Since we are mocking timers, the setTimeout callback inside component runs.

    // We need to wrap in act? render/fireEvent wrap in act.

    // Let's assume it works if we advance timers.
    await vi.runAllTimersAsync();

    expect(screen.queryByText("Confirm?")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("does nothing if disabled", async () => {
    const handleClick = vi.fn();
    const { component } = render(DeleteButtonWithConfirm, { disabled: true });
    component.$on("click", handleClick);

    const button = screen.getByRole("button");

    await fireEvent.click(button);

    expect(screen.queryByText("Confirm?")).not.toBeInTheDocument();
    expect(handleClick).not.toHaveBeenCalled();
  });
});

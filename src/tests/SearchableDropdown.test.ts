// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
import { render, fireEvent, screen } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import SearchableDropdown from "../lib/components/common/SearchableDropdown.svelte";

describe("SearchableDropdown", () => {
  const options = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];

  it("renders correctly with combobox role", () => {
    render(SearchableDropdown, { options });
    const input = screen.getByRole("combobox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
  });

  it("shows dropdown and options on focus", async () => {
    render(SearchableDropdown, { options });
    const input = screen.getByRole("combobox");

    await fireEvent.focus(input);

    expect(input).toHaveAttribute("aria-expanded", "true");

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();

    const listItems = screen.getAllByRole("option");
    expect(listItems).toHaveLength(options.length);
  });

  it("filters options based on input", async () => {
    render(SearchableDropdown, { options });
    const input = screen.getByRole("combobox");

    await fireEvent.input(input, { target: { value: "Ban" } });

    const listItems = screen.getAllByRole("option");
    expect(listItems).toHaveLength(1);
    expect(listItems[0]).toHaveTextContent("Banana");
  });

  it("selects an option on click", async () => {
    const { component } = render(SearchableDropdown, { options });
    const mockChangeHandler = vi.fn();
    component.$on("change", mockChangeHandler);

    const input = screen.getByRole("combobox");
    await fireEvent.focus(input);

    const option = screen.getByText("Banana");
    await fireEvent.mouseDown(option); // We switched to mousedown

    expect(mockChangeHandler).toHaveBeenCalledWith(
      expect.objectContaining({ detail: "Banana" }),
    );
    expect(input).toHaveValue("Banana");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("navigates with arrow keys", async () => {
    render(SearchableDropdown, { options });
    const input = screen.getByRole("combobox");

    await fireEvent.focus(input);

    // Initial state: no selection
    expect(input).not.toHaveAttribute("aria-activedescendant");

    // Arrow Down -> Select first
    await fireEvent.keyDown(input, { key: "ArrowDown" });
    const optionsList = screen.getAllByRole("option");
    expect(optionsList[0]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", optionsList[0].id);

    // Arrow Down -> Select second
    await fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(optionsList[1]).toHaveAttribute("aria-selected", "true");
    expect(optionsList[0]).toHaveAttribute("aria-selected", "false");

    // Arrow Up -> Back to first
    await fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(optionsList[0]).toHaveAttribute("aria-selected", "true");
  });

  it("selects with Enter key", async () => {
    const { component } = render(SearchableDropdown, { options });
    const mockChangeHandler = vi.fn();
    component.$on("change", mockChangeHandler);

    const input = screen.getByRole("combobox");
    await fireEvent.focus(input);

    // Select "Banana" (index 1)
    await fireEvent.keyDown(input, { key: "ArrowDown" });
    await fireEvent.keyDown(input, { key: "ArrowDown" });

    await fireEvent.keyDown(input, { key: "Enter" });

    expect(mockChangeHandler).toHaveBeenCalledWith(
      expect.objectContaining({ detail: "Banana" }),
    );
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape", async () => {
    render(SearchableDropdown, { options });
    const input = screen.getByRole("combobox");
    await fireEvent.focus(input);
    expect(input).toHaveAttribute("aria-expanded", "true");

    await fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveAttribute("aria-expanded", "false");
  });
});

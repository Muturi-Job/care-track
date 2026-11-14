import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TOAST_DURATION_MS, Toast } from "./toast";

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("offers Undo and takes itself away after ten seconds", () => {
    const onDismiss = vi.fn();
    const onUndo = vi.fn();

    render(
      <Toast
        toast={{ text: "Moved Patient A to Preparing.", action: { label: "Undo", onClick: onUndo } }}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByRole("status").textContent).toContain("Moved Patient A to Preparing.");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledTimes(1);

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("can be dismissed sooner", () => {
    const onDismiss = vi.fn();

    render(<Toast toast={{ text: "Flag cleared." }} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders nothing without a message", () => {
    const { container } = render(<Toast toast={null} onDismiss={vi.fn()} />);

    expect(container.textContent).toBe("");
  });
});

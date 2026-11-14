import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FeedbackPrompt } from "./feedback-prompt";

describe("FeedbackPrompt", () => {
  it("asks one question with three answers", () => {
    render(<FeedbackPrompt code="ABCDEFGHJK" onAnswer={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Did this page help you feel informed?" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Somewhat" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "No" })).toBeTruthy();
  });

  it("sends the chosen answer with the tracking code and thanks the person", async () => {
    const onAnswer = vi.fn(async () => {});

    render(<FeedbackPrompt code="ABCDEFGHJK" onAnswer={onAnswer} />);

    fireEvent.click(screen.getByRole("button", { name: "Somewhat" }));

    expect(onAnswer).toHaveBeenCalledWith("ABCDEFGHJK", "somewhat");
    expect((await screen.findByRole("status")).textContent).toContain("Thank you.");
    expect(screen.queryByRole("button", { name: "Yes" })).toBeNull();
  });

  it("keeps the question when the answer cannot be saved", async () => {
    const onAnswer = vi.fn(async () => {
      throw new Error("offline");
    });

    render(<FeedbackPrompt code="ABCDEFGHJK" onAnswer={onAnswer} />);

    fireEvent.click(screen.getByRole("button", { name: "No" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "We could not save your answer.",
    );
    expect(screen.getByRole("button", { name: "No" })).toBeTruthy();
  });
});

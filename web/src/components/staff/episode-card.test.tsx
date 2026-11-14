import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeEpisode } from "@/test/fixtures";
import type { StaffEpisode } from "@/lib/staff/types";

import { EpisodeCard } from "./episode-card";

const FAMILY_URL = "http://localhost:3000/f/ABCDEFGHJK";

function renderCard(overrides: Partial<StaffEpisode> = {}) {
  const handlers = {
    onAdvance: vi.fn(),
    onDelay: vi.fn(),
    onCallCareTeam: vi.fn(),
    onClearFlag: vi.fn(),
  };

  render(<EpisodeCard episode={makeEpisode(overrides)} familyUrl={FAMILY_URL} {...handlers} />);

  return handlers;
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("EpisodeCard", () => {
  it("shows the patient, procedure, stage and time in stage", () => {
    renderCard();

    expect(screen.getByRole("heading", { name: "Patient A" })).toBeTruthy();
    expect(screen.getByText("Ward 3, Bed 2 · Day Surgery")).toBeTruthy();
    expect(screen.getByText("Preparing")).toBeTruthy();
    expect(screen.getByText(/12 min in this stage/)).toBeTruthy();
    expect(screen.getByText(/usually about 45 min/)).toBeTruthy();
  });

  it("advances with one tap on the button that names the next stage", () => {
    const handlers = renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Advance to: Heading to theatre" }));

    expect(handlers.onAdvance).toHaveBeenCalledTimes(1);
    expect(handlers.onAdvance.mock.calls[0][0]).toMatchObject({ id: "episode-1" });
  });

  it("highlights an overdue episode", () => {
    renderCard({ minutesOverdue: 25 });

    expect(screen.getByText("Overdue by 25 min")).toBeTruthy();
  });

  it("shows the delay reason on the card", () => {
    renderCard({ statusFlag: "delayed", delayReason: "awaiting_bed" });

    expect(screen.getByText("Delayed: Waiting for a bed")).toBeTruthy();
  });

  it("offers delayed, call the care team, and only clear when flagged", () => {
    const handlers = renderCard();

    fireEvent.change(screen.getByLabelText("Reason for delay"), {
      target: { value: "awaiting_team" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Mark as delayed" }));
    expect(handlers.onDelay).toHaveBeenCalledWith(
      expect.objectContaining({ id: "episode-1" }),
      "awaiting_team",
    );

    fireEvent.click(screen.getByRole("button", { name: "Call the care team" }));
    expect(handlers.onCallCareTeam).toHaveBeenCalledTimes(1);

    expect(screen.queryByRole("button", { name: "Clear flag" })).toBeNull();
  });

  it("can clear a flag once one is set", () => {
    const handlers = renderCard({ statusFlag: "call_care_team" });

    expect(screen.getByText("Call the care team", { selector: "p" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear flag" }));
    expect(handlers.onClearFlag).toHaveBeenCalledTimes(1);
  });

  it("cannot advance past the final stage", () => {
    const handlers = renderCard({
      isFinalStage: true,
      nextStageLabel: null,
      stageLabel: "Recovering",
    });

    const button = screen.getByRole("button", { name: "Final stage reached" }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(handlers.onAdvance).not.toHaveBeenCalled();
  });

  it("links to WhatsApp with a friendly message and the family URL prefilled", () => {
    renderCard();

    const link = screen.getByRole("link", { name: /Share on WhatsApp/ });
    const href = link.getAttribute("href") ?? "";

    expect(href.startsWith("https://wa.me/?text=")).toBe(true);

    const message = decodeURIComponent(href.slice("https://wa.me/?text=".length));
    expect(message).toContain("Patient A");
    expect(message).toContain(FAMILY_URL);
  });

  it("copies the family link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Copy family link" }));

    expect(await screen.findByText("Link copied")).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(FAMILY_URL);
  });

  it("says so when the clipboard is unavailable", async () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Copy family link" }));

    expect(await screen.findByText("Could not copy. Please try again.")).toBeTruthy();
  });
});

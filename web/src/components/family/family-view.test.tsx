import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeFamilyPayload } from "@/test/fixtures";

import { FamilyView } from "./family-view";

const NOW = Date.parse("2026-11-14T10:00:00Z");

describe("FamilyView", () => {
  it("leads with the patient, the procedure and the stage they are at", () => {
    render(<FamilyView payload={makeFamilyPayload()} now={NOW} />);

    expect(screen.getByRole("heading", { level: 1, name: "Patient A" })).toBeTruthy();
    expect(screen.getByText("Day Surgery")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Preparing" })).toBeTruthy();
    expect(screen.getByText("The team gets things ready.")).toBeTruthy();
  });

  it("explains what happens next and how long it usually takes", () => {
    render(<FamilyView payload={makeFamilyPayload()} now={NOW} />);

    expect(screen.getByRole("heading", { name: "What happens next" })).toBeTruthy();
    expect(screen.getByText("You will go to the theatre area.")).toBeTruthy();
    expect(screen.getByText("Usually about 20 to 30 minutes.")).toBeTruthy();
  });

  it("shows every stage with its state written out", () => {
    render(<FamilyView payload={makeFamilyPayload()} now={NOW} />);

    const timeline = within(screen.getByRole("list"));

    expect(timeline.getByText("Arriving")).toBeTruthy();
    expect(timeline.getByText("Done")).toBeTruthy();
    expect(timeline.getAllByText("Preparing").length).toBeGreaterThan(0);
    expect(timeline.getByText("Now")).toBeTruthy();
    expect(timeline.getByText("Heading to theatre")).toBeTruthy();
    expect(timeline.getByText("Coming up")).toBeTruthy();
  });

  it("says when the page was last updated", () => {
    render(<FamilyView payload={makeFamilyPayload()} now={NOW} />);

    expect(screen.getByText(/Last updated/)).toBeTruthy();
    expect(document.querySelector("time")?.getAttribute("datetime")).toBe(
      "2026-11-14T09:41:00Z",
    );
  });

  it("gives a quiet card with the ward number and visiting information", () => {
    render(<FamilyView payload={makeFamilyPayload()} now={NOW} />);

    expect(screen.getByRole("heading", { name: "Who to contact" })).toBeTruthy();
    expect(screen.getByText("The care team can be reached through the ward.")).toBeTruthy();
    expect(screen.getByText("Visiting is arranged with the ward. Please call before you visit.")).toBeTruthy();

    const call = screen.getByRole("link", { name: "Call 0000 000 000" });

    expect(call.getAttribute("href")).toBe("tel:0000000000");
  });

  it("keeps a delay quiet and does not add a call button beyond the usual one", () => {
    render(
      <FamilyView
        payload={makeFamilyPayload({
          specialStatus: {
            kind: "delayed",
            message: "The team is running a little behind schedule. We will keep updating this page.",
          },
        })}
        now={NOW}
      />,
    );

    expect(
      screen.getByText(
        "The team is running a little behind schedule. We will keep updating this page.",
      ),
    ).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Call 0000 000 000" })).toHaveLength(1);
  });

  it("makes the call button prominent when the care team has asked for a call", () => {
    render(
      <FamilyView
        payload={makeFamilyPayload({
          specialStatus: { kind: "call_care_team", message: "Please call the care team on the number below." },
        })}
        now={NOW}
      />,
    );

    expect(screen.getByText("Please call the care team on the number below.")).toBeTruthy();

    const calls = screen.getAllByRole("link", { name: "Call 0000 000 000" });

    expect(calls).toHaveLength(2);
    expect(calls[0].getAttribute("href")).toBe("tel:0000000000");
  });

  it("falls back to the approved sentence for a stage it cannot explain", () => {
    render(
      <FamilyView
        payload={makeFamilyPayload({
          currentStage: {
            label: "Please call the care team.",
            explanation: "Please call the care team.",
            state: "current",
          },
          expectedDuration: null,
        })}
        now={NOW}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Please call the care team." }),
    ).toBeTruthy();
    expect(screen.queryByText(/Usually about/)).toBeNull();
  });

  it("keeps the last known status on screen when polling fails, and offers a refresh", () => {
    const onRefresh = vi.fn();

    render(
      <FamilyView
        payload={makeFamilyPayload()}
        now={NOW}
        stale
        lastCheckedAt={NOW - 2 * 60_000}
        onRefresh={onRefresh}
        refreshing={false}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Preparing" })).toBeTruthy();
    expect(screen.getByText("We could not refresh just now. Last checked 2 minutes ago.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("says the page is refreshing so the button cannot be tapped twice", () => {
    render(
      <FamilyView
        payload={makeFamilyPayload()}
        now={NOW}
        stale
        lastCheckedAt={NOW}
        onRefresh={() => {}}
        refreshing
      />,
    );

    const button = screen.getByRole("button", { name: "Refreshing…" }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
  });
});

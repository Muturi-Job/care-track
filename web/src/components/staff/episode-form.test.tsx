import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StaffRequestError } from "@/lib/staff/client";
import type { ProcedureOption } from "@/lib/staff/types";
import { makeEpisode } from "@/test/fixtures";

import { EpisodeForm } from "./episode-form";

const ORIGIN = "http://localhost:3000";
const PROCEDURES: ProcedureOption[] = [
  { id: "template-1", name: "Day Surgery", active: true },
  { id: "template-2", name: "Orthopaedic Surgery", active: true },
];

function renderForm(onCreate = vi.fn(), procedures = PROCEDURES) {
  render(<EpisodeForm procedures={procedures} origin={ORIGIN} onCreate={onCreate} />);

  return onCreate;
}

function fillIn(alias = "Patient B", bed = "Ward 1, Bed 1") {
  fireEvent.change(screen.getByLabelText("Patient alias or first name"), {
    target: { value: alias },
  });
  fireEvent.change(screen.getByLabelText("Ward or bed"), { target: { value: bed } });
}

describe("EpisodeForm", () => {
  it("starts on the first procedure, so creating takes two taps", () => {
    renderForm();

    expect((screen.getByLabelText("Procedure") as HTMLSelectElement).value).toBe("template-1");
  });

  it("validates the alias and bed before creating", async () => {
    const onCreate = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Create episode" }));

    expect(await screen.findByText("Enter the patient's alias or first name")).toBeTruthy();
    expect(await screen.findByText("Enter the ward or bed")).toBeTruthy();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("creates the episode and shows the family link with the sharing reminder", async () => {
    const onCreate = renderForm(
      vi.fn().mockResolvedValue(
        makeEpisode({ alias: "Patient B", familyPath: "/p/NEWCODE234" }),
      ),
    );

    fillIn();
    fireEvent.change(screen.getByLabelText("Procedure"), { target: { value: "template-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Create episode" }));

    expect(await screen.findByRole("heading", { name: "Episode created" })).toBeTruthy();
    expect(onCreate).toHaveBeenCalledWith({
      alias: "Patient B",
      bed: "Ward 1, Bed 1",
      procedureTemplateId: "template-2",
    });
    expect(screen.getByText(`${ORIGIN}/p/NEWCODE234`)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Share on WhatsApp/ })).toBeTruthy();
    expect(screen.getByText("Only share with people the patient has agreed to.")).toBeTruthy();
  });

  it("shows the API's calm message when creating fails", async () => {
    renderForm(
      vi.fn().mockRejectedValue(new StaffRequestError("Alias, procedure and bed are required.", 400)),
    );

    fillIn();
    fireEvent.click(screen.getByRole("button", { name: "Create episode" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Alias, procedure and bed are required.");
  });

  it("says when no procedures are set up, and cannot submit", () => {
    renderForm(vi.fn(), []);

    expect(screen.getByText("No procedures are available yet.")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Create episode" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeEpisode } from "@/test/fixtures";

import { InquirySheet } from "./inquiry-sheet";

describe("InquirySheet", () => {
  it("logs the selected channel in one tap and closes", async () => {
    const episode = makeEpisode();
    const onLog = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<InquirySheet episodes={[episode]} initialEpisode={episode} onLog={onLog} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Phone" }));

    await waitFor(() => {
      expect(onLog).toHaveBeenCalledWith(episode, "phone");
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it("keeps the sheet open when logging fails", async () => {
    const episode = makeEpisode();
    const onLog = vi.fn().mockRejectedValue(new Error("failed"));
    const onClose = vi.fn();

    render(<InquirySheet episodes={[episode]} initialEpisode={episode} onLog={onLog} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Ward" }));

    await waitFor(() => expect(onLog).toHaveBeenCalledOnce());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { TrackingCodeForm } from "./tracking-code-form";

beforeEach(() => {
  push.mockClear();
});

describe("TrackingCodeForm", () => {
  it("uppercases and strips characters other than letters and numbers", () => {
    render(<TrackingCodeForm />);

    const input = screen.getByRole("textbox", { name: "Tracking code" });
    fireEvent.change(input, { target: { value: "k7-m2!qx9pab" } });

    expect(input).toHaveProperty("value", "K7M2QX9PAB");
  });

  it("extracts a tracking code from a pasted family link", () => {
    render(<TrackingCodeForm />);

    const input = screen.getByRole("textbox", { name: "Tracking code" });
    fireEvent.change(input, {
      target: { value: "https://caretrack.example/f/k7m2qx9pab?source=ward" },
    });

    expect(input).toHaveProperty("value", "K7M2QX9PAB");
  });

  it("shows a calm inline error for a code outside the API alphabet", () => {
    render(<TrackingCodeForm />);

    const input = screen.getByRole("textbox", { name: "Tracking code" });
    fireEvent.change(input, { target: { value: "K7M2QX9P0B" } });
    fireEvent.click(screen.getByRole("button", { name: "View progress" }));

    const error = screen.getByRole("alert");
    expect(error.textContent).toBe(
      "That code doesn't look right. Codes have 10 letters and numbers.",
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates to the family page after submitting a valid code with Enter", () => {
    render(<TrackingCodeForm />);

    const input = screen.getByRole("textbox", { name: "Tracking code" });
    fireEvent.change(input, { target: { value: "k7m2qx9pab" } });
    fireEvent.submit(input.closest("form")!);

    expect(push).toHaveBeenCalledWith("/f/K7M2QX9PAB");
  });
});

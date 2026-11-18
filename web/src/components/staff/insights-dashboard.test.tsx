import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Heatmap, Kpi } from "./insights-dashboard";

describe("insights components", () => {
  it("renders a KPI card label and value", () => {
    render(<Kpi label="Episodes" value="28" detail="Last 30 days" />);

    expect(screen.getByText("Episodes")).toBeTruthy();
    expect(screen.getByText("28")).toBeTruthy();
    expect(screen.getByText("Last 30 days")).toBeTruthy();
  });

  it("labels suppressed heatmap cells as not enough data", () => {
    render(<Heatmap cells={[{ weekday: 1, hour: 14, insufficient_data: true }]} />);

    expect(screen.getByRole("button", { name: /Mon 14:00: Not enough data yet/ })).toBeTruthy();
  });

  it("shows overrun values as text in the heatmap cell", () => {
    render(<Heatmap cells={[{ weekday: 1, hour: 14, count: 8, average_overrun_minutes: 12.5 }]} />);

    expect(screen.getByRole("button", { name: /Mon 14:00: 12.5 average minutes over expected, 8 episodes/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Mon 14:00/ }).textContent).toBe("12.5");
  });
});

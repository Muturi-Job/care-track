import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Banner } from "./banner";

describe("Banner", () => {
  it("shows the prototype notice (CLAUDE.md rule 7)", () => {
    render(<Banner />);

    expect(screen.getByText("CareTrack prototype - demo data only")).toBeTruthy();
  });
});

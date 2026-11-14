import { describe, expect, it } from "vitest";

import { familyShareMessage, familyUrl, whatsappShareUrl } from "./share";

describe("familyUrl", () => {
  it("joins the origin and the family path", () => {
    expect(familyUrl("http://localhost:3000", "/p/CODE")).toBe("http://localhost:3000/p/CODE");
    expect(familyUrl("https://care.example/", "/p/CODE")).toBe("https://care.example/p/CODE");
    expect(familyUrl("", "/p/CODE")).toBe("/p/CODE");
  });
});

describe("whatsappShareUrl", () => {
  it("prefills a short, friendly message with the family link", () => {
    const message = familyShareMessage("Patient A", "https://care.example/p/CODE");
    const url = whatsappShareUrl(message);

    expect(url.startsWith("https://wa.me/?text=")).toBe(true);

    const text = decodeURIComponent(url.slice("https://wa.me/?text=".length));
    expect(text).toContain("Patient A");
    expect(text).toContain("https://care.example/p/CODE");
    expect(text.toLowerCase()).not.toContain("diagnos");
  });
});

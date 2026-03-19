import { describe, expect, it } from "vitest";
import { createApp } from "../../src/index";

describe("workspace smoke", () => {
  it("creates an app with a health route", async () => {
    const app = createApp();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

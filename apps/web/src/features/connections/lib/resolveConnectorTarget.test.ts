import { describe, expect, it } from "vitest";

import { resolveConnectorTarget } from "./resolveConnectorTarget";

describe("resolveConnectorTarget", () => {
  it("uses the desktop localhost connector when no override is saved", () => {
    expect(resolveConnectorTarget({ aiTargetBaseUrl: null }, null)).toEqual({
      baseUrl: "http://127.0.0.1:4318",
      source: "desktop_default",
      isOverride: false,
    });
  });

  it("prefers the saved settings override over the desktop default", () => {
    expect(
      resolveConnectorTarget(
        { aiTargetBaseUrl: "http://127.0.0.1:5317" },
        { baseUrl: "http://127.0.0.1:5317" },
      ),
    ).toEqual({
      baseUrl: "http://127.0.0.1:5317",
      source: "settings_override",
      isOverride: true,
    });
  });

  it("uses cached override when settings are not loaded yet", () => {
    expect(resolveConnectorTarget(undefined, { baseUrl: "http://127.0.0.1:6317" })).toEqual({
      baseUrl: "http://127.0.0.1:6317",
      source: "settings_override",
      isOverride: true,
    });
  });
});


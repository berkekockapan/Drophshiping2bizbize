// @vitest-environment node

import type { ConfigEnv } from "vite";
import { describe, expect, it } from "vitest";

import createConfig from "./vite.config";

describe("vite preview config", () => {
  it("allows remote preview hosts for ngrok cloud sharing", async () => {
    const config = await (createConfig as unknown as (env: ConfigEnv) => any)({
      command: "serve",
      mode: "production",
      isPreview: true,
      isSsrBuild: false,
    });

    expect(config.preview).toMatchObject({
      allowedHosts: true,
    });
  });
});

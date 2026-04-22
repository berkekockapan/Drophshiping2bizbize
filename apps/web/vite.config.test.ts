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

  it("enables dev proxy routes when a local API proxy target exists", async () => {
    const config = await (createConfig as unknown as (env: ConfigEnv) => any)({
      command: "serve",
      mode: "development",
      isPreview: false,
      isSsrBuild: false,
    });

    const ownersProxy = config.server.proxy["/owners"];
    const healthProxy = config.server.proxy["/health"];

    expect(ownersProxy).toMatchObject({
      target: "http://127.0.0.1:8788",
      changeOrigin: true,
    });
    expect(healthProxy).toMatchObject({
      target: "http://127.0.0.1:8788",
      changeOrigin: true,
    });

    expect(
      ownersProxy.bypass(
        {
          headers: {
            "sec-fetch-dest": "document",
            accept: "text/html",
          },
          url: "/owners/berke/products",
        },
        undefined,
        ownersProxy,
      ),
    ).toBe("/owners/berke/products");

    expect(
      ownersProxy.bypass(
        {
          headers: {
            "sec-fetch-dest": "empty",
            accept: "application/json",
          },
          url: "/owners/berke/products",
        },
        undefined,
        ownersProxy,
      ),
    ).toBeUndefined();
  });
});

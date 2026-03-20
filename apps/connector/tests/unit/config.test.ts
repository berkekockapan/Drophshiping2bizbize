import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfig, loadDotEnvFile } from "../../src/config";

describe("config", () => {
  it("loads .env values without overriding explicit env entries", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-config-"));
    const envPath = join(dir, ".env");

    await writeFile(
      envPath,
      [
        "CONNECTOR_HOST=127.0.0.2",
        "CONNECTOR_PORT=5321",
        "CONNECTOR_PROVIDER=chatgpt-web",
        "CONNECTOR_STATE_DIR=.local-state",
      ].join("\n"),
      "utf8",
    );

    const env: NodeJS.ProcessEnv = {
      CONNECTOR_HOST: "127.0.0.1",
    };

    const loadResult = loadDotEnvFile(envPath, env);
    expect(loadResult.loaded).toBe(true);
    expect(loadResult.keys).toEqual(
      expect.arrayContaining(["CONNECTOR_PORT", "CONNECTOR_PROVIDER", "CONNECTOR_STATE_DIR"]),
    );
    expect(env.CONNECTOR_HOST).toBe("127.0.0.1");

    const config = loadConfig(env);
    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(5321);
    expect(config.provider).toBe("chatgpt-web");
  });
});


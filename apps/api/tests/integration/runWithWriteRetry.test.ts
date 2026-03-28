import { describe, expect, it, vi } from "vitest";

import { runWithWriteRetry } from "../../src/db/runWithWriteRetry";

describe("runWithWriteRetry", () => {
  it("retries retryable D1 write failures up to the next successful attempt", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    let attempts = 0;

    const result = await runWithWriteRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("Network connection lost");
        }

        return "ok";
      },
      { sleep, maxAttempts: 3 },
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 50);
    expect(sleep).toHaveBeenNthCalledWith(2, 100);
  });

  it("does not retry non-retryable validation errors", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      runWithWriteRetry(async () => {
        throw new Error("UNIQUE constraint failed");
      }, { sleep }),
    ).rejects.toThrow("UNIQUE constraint failed");

    expect(sleep).not.toHaveBeenCalled();
  });
});

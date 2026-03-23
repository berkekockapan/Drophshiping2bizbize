function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "İşlem tamamlanamadı.";
}

async function parseResponseError(response: Response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }

  const fallbackText = await response.text().catch(() => "");
  const message = fallbackText.trim().slice(0, 180);
  throw new Error(message || `Request failed (${response.status})`);
}

export async function readNdjsonStream<T>(
  response: Response,
  options: { onEvent?: (event: T) => void } = {},
): Promise<T[]> {
  if (!response.ok) {
    await parseResponseError(response);
  }

  if (!response.body) {
    throw new Error("Stream içeriği bulunamadı.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events: T[] = [];
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }

        const event = JSON.parse(trimmed) as T;
        events.push(event);
        options.onEvent?.(event);
      }
    }

    const remaining = `${buffer}${decoder.decode()}`.trim();
    if (remaining) {
      const event = JSON.parse(remaining) as T;
      events.push(event);
      options.onEvent?.(event);
    }

    return events;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  } finally {
    reader.releaseLock();
  }
}

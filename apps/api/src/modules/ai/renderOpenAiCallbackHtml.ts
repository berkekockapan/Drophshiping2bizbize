function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

export function renderOpenAiCallbackHtml(input: {
  ok: boolean;
  title: string;
  message: string;
}) {
  const color = input.ok ? "#0f766e" : "#be123c";
  const fallbackMessage = input.ok
    ? "Bu sekmeyi kapatıp uygulamaya dönebilirsiniz."
    : "AI Bağlantıları sayfasına dönüp tekrar deneyin.";
  const autoCloseScript = input.ok
    ? `
    <script>
      window.addEventListener("load", () => {
        window.close();
      });
    </script>`
    : "";

  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; }
      main { max-width: 680px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
      h1 { margin: 0 0 12px; font-size: 24px; color: ${color}; }
      p { margin: 0; line-height: 1.6; }
      .fallback { margin-top: 12px; color: #475569; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(input.title)}</h1>
      <p>${escapeHtml(input.message)}</p>
      <p class="fallback">${escapeHtml(fallbackMessage)}</p>
    </main>${autoCloseScript}
  </body>
</html>`;
}

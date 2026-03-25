import { describe, expect, it } from "vitest";

import { renderOpenAiCallbackHtml } from "../../src/modules/ai/renderOpenAiCallbackHtml";

describe("renderOpenAiCallbackHtml", () => {
  it("success durumunda window.close scripti ve başarı fallback metnini içerir", () => {
    const html = renderOpenAiCallbackHtml({
      ok: true,
      title: "OpenAI <hesabı> bağlandı",
      message: "Bağlantı & doğrulama tamamlandı.",
    });

    expect(html).toContain("window.close()");
    expect(html).toContain("Bu sekmeyi kapatıp uygulamaya dönebilirsiniz.");
    expect(html).toContain("OpenAI &lt;hesabı&gt; bağlandı");
    expect(html).toContain("Bağlantı &amp; doğrulama tamamlandı.");
  });

  it("hata durumunda window.close scripti içermez ve tekrar deneme fallback metnini içerir", () => {
    const html = renderOpenAiCallbackHtml({
      ok: false,
      title: "OpenAI hesabı bağlanamadı",
      message: 'Bağlantı "yeniden" denenmeli.',
    });

    expect(html).not.toContain("window.close()");
    expect(html).toContain("AI Bağlantıları sayfasına dönüp tekrar deneyin.");
    expect(html).toContain("Bağlantı &quot;yeniden&quot; denenmeli.");
  });
});

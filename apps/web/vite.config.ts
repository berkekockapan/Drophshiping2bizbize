import { defineConfig, loadEnv } from "vite";

const apiProxyRoutes = [
  "/health",
  "/owners",
  "/tracking",
  "/products",
  "/drafts",
  "/ai-profiles",
  "/notifications",
  "/settings",
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = (env.VITE_API_BASE_URL ?? "").trim();
  const apiProxyTarget = env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8787";
  const shouldUseApiProxy = apiBaseUrl.length === 0;

  return {
    esbuild: {
      jsx: "automatic",
    },
    server: {
      allowedHosts: true,
      host: "127.0.0.1",
      ...(shouldUseApiProxy
        ? {
            proxy: Object.fromEntries(
              apiProxyRoutes.map((route) => [
                route,
                {
                  // Lokal geliştirmede VITE_API_BASE_URL boşsa /owners vb. istekleri 127.0.0.1:8787'ye proxy et.
                  // Cloud modda VITE_API_BASE_URL doluysa proxy devre dışı kalır ve tarayıcı doğrudan Worker'a gider.
                  target: apiProxyTarget,
                  changeOrigin: true,
                },
              ]),
            ),
          }
        : {}),
    },
    preview: {
      // ngrok gibi uzak host adlari preview sunucusu tarafindan reddedilmesin.
      allowedHosts: true,
    },
    test: {
      environment: "jsdom",
      globals: true,
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/cypress/**",
        "**/.{idea,git,cache,output,temp}/**",
        "**/{karma,rollup,webpack,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
        "tests/e2e/**",
        "**/tests/e2e/**",
      ],
    },
  };
});

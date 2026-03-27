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
  const apiProxyTarget = env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8787";

  return {
    esbuild: {
      jsx: "automatic",
    },
    server: {
      allowedHosts: true,
      host: "127.0.0.1",
      proxy: Object.fromEntries(
        apiProxyRoutes.map((route) => [
          route,
          {
            // Lokal geliştirmede VITE_API_BASE_URL boşsa /owners vb. istekleri 127.0.0.1:8787'ye proxy et.
            // Production'da Pages build'i VITE_API_BASE_URL ile doğrudan Worker'a gider.
            target: apiProxyTarget,
            changeOrigin: true,
          },
        ]),
      ),
    },
    test: {
      environment: "jsdom",
      globals: true,
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/cypress/**",
        "**/.{idea,git,cache,output,temp}/**",
        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
        "tests/e2e/**",
        "**/tests/e2e/**",
      ],
    },
  };
});

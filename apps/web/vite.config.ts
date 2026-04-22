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
  const apiProxyTarget = env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8788";
  const shouldUseApiProxy = apiProxyTarget.trim().length > 0;

  return {
    esbuild: {
      jsx: "automatic",
    },
    server: {
      allowedHosts: true,
      host: "127.0.0.1",
      port: 5174,
      strictPort: true,
      ...(shouldUseApiProxy
        ? {
            proxy: Object.fromEntries(
              apiProxyRoutes.map((route) => [
                route,
                {
                  // Lokal geliştirmede uygulama runtime'i bazen relative /owners vb. istekleri kullanir.
                  // Bu durumda VITE_API_BASE_URL dolu olsa bile dev server ilgili istekleri lokal API'ye proxy etmelidir.
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
      port: 4175,
      strictPort: true,
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

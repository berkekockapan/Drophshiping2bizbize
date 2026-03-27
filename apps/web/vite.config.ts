import { defineConfig } from "vite";

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8787";

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

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  server: {
    host: "127.0.0.1",
    proxy: Object.fromEntries(
      apiProxyRoutes.map((route) => [
        route,
        {
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
});

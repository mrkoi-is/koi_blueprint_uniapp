import { defineConfig } from "@playwright/test";

const port = 4188;
const url = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/smoke",
  use: { baseURL: url },
  webServer: {
    command: `vite preview --outDir dist/build/h5 --host 127.0.0.1 --port ${port} --strictPort`,
    url,
  },
});

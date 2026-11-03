import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  define: {
    __FRONT_VERSION__: JSON.stringify(
      process.env.COMMIT_REF?.slice(0, 7) || "dev",
    ),
  },
  server: {
    proxy: { "/api": { target: "http://localhost:8000", changeOrigin: true } },
  },
});

// split-money-app/vite.config.mjs
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  // Không cần setting server.headers nữa vì Electron đã xử lý rồi
});

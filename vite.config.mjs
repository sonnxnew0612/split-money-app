import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Tách các thư viện nặng ra file riêng để trình duyệt tải song song
            if (id.includes("framer-motion")) return "vendor-framer";
            if (id.includes("firebase")) return "vendor-firebase";
            if (id.includes("lucide-react")) return "vendor-icons";
            return "vendor"; // Các thư viện còn lại
          }
        },
      },
    },
  },
});

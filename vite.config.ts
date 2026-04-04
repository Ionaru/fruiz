import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "src",
  build: {
    outDir: "../_fresh",
    emptyOutDir: true,
  },
  plugins: [fresh(), tailwindcss()],
  server: {
    watch: {
      ignored: [
        /quiz\.db/,
      ],
    },
  },
});

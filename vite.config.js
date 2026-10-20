import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
export default defineConfig({
  plugins: [vue()],
  base: "./",
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vue-vendor": ["vue", "vue-router"],
          "ui-vendor": ["naive-ui"],
          "table-vendor": ["vxe-table", "vxe-pc-ui"],
          "flow-vendor": [
            "@vue-flow/core",
            "@vue-flow/background",
            "@vue-flow/controls",
          ],
        },
      },
    },
  },
});

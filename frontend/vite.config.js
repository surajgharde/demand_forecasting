import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        include: ["xlsx"],
    },
    resolve: {
        alias: {
            fs: path.resolve(__dirname, "node_modules/rollup-plugin-node-polyfills/polyfills/empty.js"),
        },
    },
    server: {
        port: 5173,
    },
});

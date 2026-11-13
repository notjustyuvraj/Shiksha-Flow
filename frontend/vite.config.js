import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Dev proxy forwards /api to the FastAPI backend, so the app and API share an origin.
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/api": "http://127.0.0.1:8000",
        },
    },
});

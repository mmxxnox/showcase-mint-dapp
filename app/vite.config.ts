import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { securityHeaders } from "./security-headers.mjs";

export default defineConfig({
  plugins: [react()],
  preview: { headers: securityHeaders },
  test: { environment: "node" },
});

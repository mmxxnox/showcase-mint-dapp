import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { securityHeaders } from "../security-headers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "public"), { recursive: true });

const netlify = "/*\n" + Object.entries(securityHeaders).map(([k, v]) => `  ${k}: ${v}`).join("\n") + "\n";
writeFileSync(join(root, "public", "_headers"), netlify);

const vercel = { headers: [{ source: "/(.*)", headers: Object.entries(securityHeaders).map(([key, value]) => ({ key, value })) }] };
writeFileSync(join(root, "vercel.json"), JSON.stringify(vercel, null, 2) + "\n");
console.log("wrote public/_headers and vercel.json");

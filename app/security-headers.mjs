// Single source for the response headers this static site should be served with.
// `npm run headers` writes them to public/_headers (Netlify, Cloudflare Pages) and vercel.json (Vercel);
// `vite preview` serves the same set, so the policy can be tested before deploying.
//
// connect-src allows any https/wss origin because the RPC and indexer URLs are chosen per deployment.
// Tighten it to your exact RPC and indexer origins once they are fixed (see README).
// WalletConnect's modal needs extra img-src/frame-src entries; add them only if you enable it.
export const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https: wss:",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join("; "),
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

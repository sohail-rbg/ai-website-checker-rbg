function normalizeOrigin(value, defaultProtocol = "https:") {
  const input = String(value || "").trim();
  if (!input) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `${defaultProtocol}//${input}`);
    const hostname = url.hostname.toLowerCase();
    if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "::1") return "";
    return url.origin;
  } catch {
    return "";
  }
}

export function resolvePublicOrigin(request, env = process.env) {
  const forwardedHost = request?.headers?.get?.("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProtocol = request?.headers?.get?.("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const vercelProductionHost = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  const candidates = [
    env.NEXT_PUBLIC_SITE_URL,
    env.SITE_URL,
    vercelProductionHost ? `https://${vercelProductionHost}` : "",
    request?.headers?.get?.("origin"),
    forwardedHost ? `${forwardedProtocol}://${forwardedHost}` : "",
    request?.url,
    "https://scansiteai.com",
  ];
  return candidates.map((value) => normalizeOrigin(value)).find(Boolean) || "https://scansiteai.com";
}

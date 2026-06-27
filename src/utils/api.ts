/**
 * API Endpoint Resolver for FormFlow Pro
 * Ensures absolute path or backend-pointing URL resolves correctly
 * on static servers like GitHub Pages or Cloudflare Pages.
 */
export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // 1. Check if custom VITE_API_URL is configured
  const envApiUrl = (import.meta as any).env.VITE_API_URL;
  if (envApiUrl && envApiUrl.trim() !== "") {
    const base = envApiUrl.replace(/\/$/, "");
    return `${base}${cleanPath}`;
  }

  // 2. Automatically detect if hosted on a static Pages provider (GitHub Pages or Cloudflare Pages)
  const isStaticHosting =
    window.location.hostname.includes("github.io") ||
    window.location.hostname.includes("pages.dev");

  if (isStaticHosting) {
    // Fallback to the live Cloud Run preview instance of FormFlow Pro
    const fallbackUrl = "https://ais-pre-ixobjdjporlnsynydz35s5-534973624148.asia-southeast1.run.app";
    return `${fallbackUrl}${cleanPath}`;
  }

  // 3. Fallback to same host (for local dev or fully independent containers)
  return cleanPath;
};

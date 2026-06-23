import { env } from "../env.js";

export interface PublicPageSignal {
  url: string;
  title: string;
  description: string;
  textSummary: string;
  checkedAt: string;
}

let lastRequestAt = 0;

const isPrivateHost = (hostname: string) => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (/^(127|10|0)\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  const match = host.match(/^172\.(\d{1,2})\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
};

export const watchPublicUrl = async (urlValue: string): Promise<PublicPageSignal> => {
  if (!env.ENABLE_WATCHERS) {
    throw new Error("Public URL watchers are disabled by configuration.");
  }
  const url = new URL(urlValue);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || isPrivateHost(url.hostname)) {
    throw new Error("Only unauthenticated public HTTP(S) URLs are supported.");
  }
  const waitFor = Math.max(0, 2_000 - (Date.now() - lastRequestAt));
  if (waitFor > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitFor));
  }
  lastRequestAt = Date.now();
  const response = await fetch(url, { headers: { "user-agent": "AI-Slavery-Public-Watcher/1.0" } });
  if (!response.ok) {
    throw new Error(`Public page returned ${response.status}.`);
  }
  const html = (await response.text()).slice(0, 500_000);
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? url.hostname;
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1]?.trim() ?? "";
  const textSummary = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1_000);
  return { url: url.toString(), title, description, textSummary, checkedAt: new Date().toISOString() };
};

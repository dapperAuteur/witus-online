import "server-only";
import { XMLParser } from "fast-xml-parser";

export type ParsedEpisode = {
  guid: string;
  title: string;
  showNotes: string;
  showNotesExcerpt: string;
  artworkUrl: string;
  disctopiaUrl: string;
  pubDate: Date | null;
  itunesEpisode: number | null;
  itunesSeason: number | null;
};

export type ParsedFeed = {
  channelTitle: string;
  channelLink: string;
  channelImageUrl: string;
  episodes: ParsedEpisode[];
};

const EXCERPT_MAX = 580;
const FETCH_TIMEOUT_MS = 20_000;

/** Fetch a Disctopia (or any iTunes/podcast-namespace) RSS feed and normalize. */
export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Feed URL must start with http:// or https://");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept:
          "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
        "User-Agent": "witus.online-rss-importer/1.0",
      },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`Feed fetch failed: HTTP ${res.status}`);
  }
  const xml = await res.text();
  return parseFeed(xml);
}

export function parseFeed(xml: string): ParsedFeed {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true,
    parseAttributeValue: false,
    parseTagValue: false,
    cdataPropName: "#cdata",
    textNodeName: "#text",
  });

  const doc: unknown = parser.parse(xml);
  const channel = pickChannel(doc);
  if (!channel) throw new Error("RSS document has no <channel>");

  const channelTitle = readText(channel.title) ?? "Untitled feed";
  const channelLink = readText(channel.link) ?? "";
  const channelImageUrl =
    readAttr(channel["itunes:image"], "@_href") ??
    readText(channel.image?.url) ??
    "";

  const rawItems = Array.isArray(channel.item)
    ? channel.item
    : channel.item
      ? [channel.item]
      : [];

  const episodes: ParsedEpisode[] = [];
  for (const item of rawItems) {
    const guid = readGuid(item.guid);
    if (!guid) continue;
    const title = (readText(item.title) ?? "Untitled episode").trim();
    const showNotes = (
      readText(item.description) ??
      readText(item["itunes:summary"]) ??
      ""
    ).trim();
    const showNotesExcerpt = truncate(showNotes, EXCERPT_MAX);
    const artworkUrl =
      readAttr(item["itunes:image"], "@_href") || channelImageUrl;
    const link = readText(item.link) ?? channelLink;
    const pubDate = parseDate(readText(item.pubDate));
    const itunesEpisode = parseIntOrNull(readText(item["itunes:episode"]));
    const itunesSeason = parseIntOrNull(readText(item["itunes:season"]));

    episodes.push({
      guid,
      title,
      showNotes,
      showNotesExcerpt,
      artworkUrl,
      disctopiaUrl: link,
      pubDate,
      itunesEpisode,
      itunesSeason,
    });
  }

  return { channelTitle, channelLink, channelImageUrl, episodes };
}

function pickChannel(doc: unknown): RssChannel | null {
  if (!doc || typeof doc !== "object") return null;
  const rss = (doc as { rss?: { channel?: RssChannel } }).rss;
  if (!rss?.channel) return null;
  return rss.channel;
}

type RssNode =
  | string
  | { "#text"?: string; "#cdata"?: string; [k: string]: unknown }
  | undefined
  | null;

type RssChannel = {
  title?: RssNode;
  link?: RssNode;
  image?: { url?: RssNode };
  "itunes:image"?: { "@_href"?: string };
  item?: RssItem | RssItem[];
  [k: string]: unknown;
};

type RssItem = {
  title?: RssNode;
  link?: RssNode;
  description?: RssNode;
  guid?: RssNode | { "#text"?: string; "@_isPermaLink"?: string };
  pubDate?: RssNode;
  "itunes:summary"?: RssNode;
  "itunes:image"?: { "@_href"?: string };
  "itunes:episode"?: RssNode;
  "itunes:season"?: RssNode;
  [k: string]: unknown;
};

function readText(node: RssNode): string | null {
  if (node == null) return null;
  if (typeof node === "string") return node;
  if (typeof node === "object") {
    const cdata = (node as { "#cdata"?: string })["#cdata"];
    if (typeof cdata === "string") return cdata;
    const text = (node as { "#text"?: string })["#text"];
    if (typeof text === "string") return text;
  }
  return null;
}

function readAttr(node: unknown, attr: string): string | null {
  if (!node || typeof node !== "object") return null;
  const v = (node as Record<string, unknown>)[attr];
  return typeof v === "string" ? v : null;
}

function readGuid(node: RssNode | { "#text"?: string }): string | null {
  if (node == null) return null;
  if (typeof node === "string") return node.trim() || null;
  if (typeof node === "object") {
    const text = (node as { "#text"?: string })["#text"];
    if (typeof text === "string") return text.trim() || null;
  }
  return null;
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseIntOrNull(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const slice = s.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return cut + "…";
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BlogPost {
  title: string;
  url: string;
  published: string;
  summary: string;
  thumbnail: string | null;
  categories: string[];
  id: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractImage(content: string): string | null {
  const match = content.match(/<img[^>]+src="([^"]+)"/);
  if (match) return match[1];
  const match2 = content.match(/<img[^>]+src='([^']+)'/);
  if (match2) return match2[1];
  return null;
}

async function fetchAllBlogPosts(): Promise<{ posts: BlogPost[]; total: number }> {
  const allPosts: BlogPost[] = [];
  let startIndex = 1;
  const maxResults = 150;
  const baseUrl = "https://noveltylibrary.blogspot.com/feeds/posts/default";

  while (startIndex <= maxResults) {
    const url = `${baseUrl}?start-index=${startIndex}&max-results=50&alt=json`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "NoveltyLibrary/1.0" },
      });
      if (!res.ok) break;
      const json = await res.json();

      const entries = json.feed?.entry;
      if (!entries || !Array.isArray(entries) || entries.length === 0) break;

      for (const entry of entries) {
        const title = entry.title?.$t || "Untitled";
        const link = (entry.link || []).find(
          (l: { rel: string }) => l.rel === "alternate"
        )?.href;
        const published = entry.published?.$t || "";
        const updated = entry.updated?.$t || "";
        const content = entry.content?.$t || entry.summary?.$t || "";
        const summary = stripHtml(content).slice(0, 300);
        const thumbnail = extractImage(content);
        const categories = (entry.category || []).map(
          (c: { term: string }) => c.term
        );
        const id = entry.id?.$t || `${startIndex}-${Math.random()}`;

        if (link) {
          allPosts.push({
            title,
            url: link,
            published,
            summary,
            thumbnail,
            categories,
            id,
          });
        }
      }

      if (entries.length < 50) break;
      startIndex += 50;
    } catch {
      break;
    }
  }

  return { posts: allPosts, total: allPosts.length };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { posts, total } = await fetchAllBlogPosts();

    return new Response(
      JSON.stringify({
        posts,
        total,
        favicon: "https://noveltylibrary.blogspot.com/favicon.ico",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, posts: [], total: 0 }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

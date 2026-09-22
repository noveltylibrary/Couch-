import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { title, author, reviewer, rating } = await req.json();

    const svg = `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d9488"/>
      <stop offset="100%" stop-color="#0c4a6e"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <rect x="60" y="60" width="960" height="1800" rx="40" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>

  <text x="540" y="300" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="rgba(255,255,255,0.6)" letter-spacing="8">NOVELTY LIBRARY</text>

  <text x="540" y="700" text-anchor="middle" font-family="Georgia, serif" font-size="72" font-weight="600" fill="white">${escapeXml(title)}</text>

  <text x="540" y="820" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="rgba(255,255,255,0.7)">by ${escapeXml(author)}</text>

  ${rating ? `<circle cx="540" cy="1000" r="80" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/><text x="540" y="1020" text-anchor="middle" font-family="Georgia, serif" font-size="64" font-weight="700" fill="white">${rating}/10</text>` : ''}

  <line x1="340" y1="1300" x2="740" y2="1300" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>

  ${reviewer ? `<text x="540" y="1380" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="rgba(255,255,255,0.8)">Reviewed by</text><text x="540" y="1430" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="600" fill="white">${escapeXml(reviewer)}</text>` : ''}

  <text x="540" y="1750" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="rgba(255,255,255,0.4)">noveltylibrary.blogspot.com</text>
</svg>`;

    return new Response(JSON.stringify({ svg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

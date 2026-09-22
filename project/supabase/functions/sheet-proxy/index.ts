const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/14PSrS1Jve37kI_3eNEr-9IojbzhyaLFEU3iqMRtiI-Q/export?format=csv";

interface MasterRow {
  review_no: string;
  timestamp: string;
  name: string;
  email: string;
  contact_required: string;
  instagram: string;
  website: string;
  book_title: string;
  author: string;
  genre: string;
  series: string;
  book_number: string;
  language: string;
  translated_in: string;
  reviewers_rating: string;
  goodreads_rating: string;
  amazon_rating: string;
  traits: string;
  book_cover: string;
  review: string;
  amazon_link: string;
  review_date: string;
  heard_from: string;
  agreement: string;
  form_rating: string;
  suggestions: string;
  status: string;
  blogger_draft: string;
}

function parseCSV(text: string): MasterRow[] {
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }

    if (char === "\r") {
      i++;
      continue;
    }

    if (char === "\n") {
      row.push(field);
      field = "";
      records.push(row);
      row = [];
      i++;
      continue;
    }

    field += char;
    i++;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  const rows: MasterRow[] = [];
  for (let r = 1; r < records.length; r++) {
    const v = records[r];
    if (!v.some((x) => x.trim())) continue;
    rows.push({
      review_no: v[0]?.trim() || "",
      timestamp: v[1]?.trim() || "",
      name: v[2]?.trim() || "",
      email: v[3]?.trim() || "",
      contact_required: v[4]?.trim() || "",
      instagram: v[5]?.trim() || "",
      website: v[6]?.trim() || "",
      book_title: v[7]?.trim() || "",
      author: v[8]?.trim() || "",
      genre: v[9]?.trim() || "",
      series: v[10]?.trim() || "",
      book_number: v[11]?.trim() || "",
      language: v[12]?.trim() || "",
      translated_in: v[13]?.trim() || "",
      reviewers_rating: v[14]?.trim() || "",
      goodreads_rating: v[15]?.trim() || "",
      amazon_rating: v[16]?.trim() || "",
      traits: v[17]?.trim() || "",
      book_cover: v[18]?.trim() || "",
      review: v[19]?.trim() || "",
      amazon_link: v[20]?.trim() || "",
      review_date: v[21]?.trim() || "",
      heard_from: v[22]?.trim() || "",
      agreement: v[23]?.trim() || "",
      form_rating: v[24]?.trim() || "",
      suggestions: v[25]?.trim() || "",
      status: v[26]?.trim() || "",
      blogger_draft: v[27]?.trim() || "",
    });
  }
  return rows;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "csv";

  try {
    if (action === "import") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const res = await fetch(SHEET_CSV_URL, {
        headers: { "User-Agent": "NoveltyLibrary/1.0" },
      });
      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: `Google Sheets returned ${res.status}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await res.text();
      const rows = parseCSV(text);

      const insertRes = await fetch(`${supabaseUrl}/rest/v1/master_list`, {
        method: "POST",
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify(rows),
      });

      if (!insertRes.ok) {
        const errBody = await insertRes.text();
        return new Response(
          JSON.stringify({ error: `Insert failed: ${errBody}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ imported: rows.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: return CSV
    const res = await fetch(SHEET_CSV_URL, {
      headers: { "User-Agent": "NoveltyLibrary/1.0" },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Google Sheets returned ${res.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const text = await res.text();

    return new Response(text, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

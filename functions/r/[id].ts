export const onRequestGet: PagesFunction<{ RECIPES_BUCKET: R2Bucket }> = async (ctx) => {
  const id = (ctx.params.id as string) || "";
  const key = `sharedRecipes/${id}.json`;

  // Fetch the object once; we may need it for both paths
  const obj = await ctx.env.RECIPES_BUCKET.get(key);
  if (!obj) return new Response("Not found", { status: 404 });

  const accept = (ctx.request.headers.get("accept") || "").toLowerCase();
  const forceHtml = new URL(ctx.request.url).searchParams.get("view") === "html";

  // If an unfurler/browser is asking for HTML (or ?view=html), render a tiny page with OG tags
  if (forceHtml || accept.includes("text/html")) {
    // Safely parse JSON to extract a title (fallbacks if missing)
    let title = "Nutmeg Recipe";
    try {
      const data = await obj.json<any>();
      if (data && typeof data.title === "string" && data.title.trim().length) {
        title = data.title.trim();
      }
    } catch {
      // ignore parse errors; keep default title
    }

    const canonical = `https://nutmegrecipes.app/r/${encodeURIComponent(id)}`;

    // Your repo-root icon file (URL-encoded spaces)
    const ogImage =
      "https://nutmegrecipes.app/20250405_1822_Happy%20Nutmeg%20Slice_remix_01jr4b2pm2fa88reyf1f05jf60-modified.png";

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} • Nutmeg</title>
<link rel="canonical" href="${canonical}">
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:site_name" content="Nutmeg">
<meta property="og:description" content="Open in Nutmeg to import this recipe.">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="Open in Nutmeg to import this recipe.">
<meta name="twitter:image" content="${ogImage}">

<style>
  :root { color-scheme: light dark }
  body { margin: 0; font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif; }
  .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
  .card { max-width: 560px; text-align: center; padding: 24px; border-radius: 16px; background: rgba(0,0,0,.05); }
  img.icon { width: 88px; height: 88px; border-radius: 20px; display: block; margin: 0 auto 16px; }
  h1 { margin: 0 0 8px; font-size: 22px; }
  p  { margin: 0 16px 16px; opacity: .7; }
  a.btn { display: inline-block; padding: 10px 16px; border-radius: 999px; background: #34c759; color: #000; text-decoration: none; font-weight: 600; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <img class="icon" src="${ogImage}" alt="Nutmeg">
      <h1>${escapeHtml(title)}</h1>
      <p>Open in Nutmeg to import this recipe.</p>
      <a class="btn" href="${canonical}">Open in Nutmeg</a>
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Small cache so scrapers can re-scrape occasionally; adjust to taste
        "cache-control": "public, max-age=300"
      }
    });
  }

  // Default: serve raw JSON for the app
  return new Response(obj.body, {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
};

export const onRequestHead: PagesFunction<{ RECIPES_BUCKET: R2Bucket }> = async (ctx) => {
  const id = (ctx.params.id as string) || "";
  const key = `sharedRecipes/${id}.json`;

  const head = await ctx.env.RECIPES_BUCKET.head(key);
  if (!head) return new Response(null, { status: 404 });

  // Keep HEAD matching the JSON semantics for diagnostics/tools
  return new Response(null, {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
};

// ---------- utils ----------

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

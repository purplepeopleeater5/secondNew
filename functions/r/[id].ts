export const onRequestGet: PagesFunction<{ RECIPES_BUCKET: R2Bucket }> = async (ctx) => {
  const id = (ctx.params.id as string) || "";
  const key = `sharedRecipes/${id}.json`;
  const obj = await ctx.env.RECIPES_BUCKET.get(key);
  if (!obj) return new Response("Not found", { status: 404 });

  const url = new URL(ctx.request.url);
  const accept = (ctx.request.headers.get("accept") || "").toLowerCase();
  const ua = (ctx.request.headers.get("user-agent") || "").toLowerCase();
  const format = url.searchParams.get("format"); // ?format=json to force JSON

  // Decide JSON vs HTML:
  // - JSON if client explicitly asks for it
  // - otherwise HTML (so iMessage/preview bots see OG tags)
  const wantsJson =
    format === "json" ||
    accept.includes("application/json");

  if (!wantsJson) {
    const text = await obj.text();
    const count = countRecipesInText(text);
    const firstTitle = extractFirstTitle(text);

    const canonical = `https://nutmegrecipes.app/r/${encodeURIComponent(id)}`;
    const ogImage =
      "https://nutmegrecipes.app/20250405_1822_Happy%20Nutmeg%20Slice_remix_01jr4b2pm2fa88reyf1f05jf60-modified.png";

    const title =
      count > 1
        ? `Download ${count} recipes`
        : (firstTitle?.trim().length ? `Download “${firstTitle.trim()}”` : "Download this recipe");

    const description =
      count > 1
        ? `You’ve been sent ${count} recipes. Tap to open in Nutmeg.`
        : `You’ve been sent a recipe. Tap to open in Nutmeg.`;

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
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:alt" content="Nutmeg app icon">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
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
      <p>${escapeHtml(description)}</p>
      <a class="btn" href="${canonical}">Open in Nutmeg</a>
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300"
      }
    });
  }

  // JSON path (for the app)
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
  return new Response(null, {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
};

/* ----------------- utils ----------------- */

function countRecipesInText(text: string): number {
  if (!text) return 0;
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === "object") return 1;
  } catch { /* fall through */ }
  let count = 0, depth = 0, inString = false, escape = false;
  for (const ch of text) {
    if (inString) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = false; }
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") {
      if (depth > 0) depth--;
      if (depth === 0) count++;
    }
  }
  return count || 0;
}

function extractFirstTitle(text: string): string | null {
  if (!text) return null;
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj.title === "string") return obj.title;
  } catch {
    const first = extractFirstJsonObject(text);
    if (first) {
      try {
        const obj = JSON.parse(first);
        if (obj && typeof obj.title === "string") return obj.title;
      } catch { /* ignore */ }
    }
  }
  return null;
}

function extractFirstJsonObject(text: string): string | null {
  let start = -1, depth = 0, inString = false, escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = false; }
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      if (depth > 0) depth--;
      if (depth === 0 && start >= 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

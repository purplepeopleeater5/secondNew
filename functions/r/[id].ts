export const onRequestGet: PagesFunction<{
  RECIPES_BUCKET: R2Bucket
}> = async (ctx) => {
  const id = (ctx.params.id as string) || "";
  const key = `sharedRecipes/${id}.json`;

  const obj = await ctx.env.RECIPES_BUCKET.get(key);
  if (!obj) return new Response("Not found", { status: 404 });

  // If request prefers HTML (browser), show a tiny landing page
  const accept = ctx.request.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    const appStore = "https://apps.apple.com/app/idYOUR_APP_STORE_ID"; // TODO: set
    const host = new URL(ctx.request.url).host;
    return new Response(`<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nutmeg Recipe</title></head>
<body>
  <h1>Open in Nutmeg</h1>
  <p><a href="https://${host}/r/${id}">Try opening again</a></p>
  <p><a href="${appStore}">Get Nutmeg</a></p>
</body></html>`, { headers: { "content-type": "text/html" } });
  }

  // App fetch: return raw JSON
  return new Response(await obj.text(), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
};

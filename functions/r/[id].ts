export const onRequestGet: PagesFunction<{ RECIPES_BUCKET: R2Bucket }> = async (ctx) => {
  const id = (ctx.params.id as string) || "";
  const key = `sharedRecipes/${id}.json`;

  const obj = await ctx.env.RECIPES_BUCKET.get(key);
  if (!obj) return new Response("Not found", { status: 404 });

  // Always return JSON for now (keeps Universal Link import path simple)
  return new Response(obj.body, {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
};

// (Optional) HEAD handler so `curl -I` returns the same headers
export const onRequestHead: PagesFunction<{ RECIPES_BUCKET: R2Bucket }> = async (ctx) => {
  const id = (ctx.params.id as string) || "";
  const key = `sharedRecipes/${id}.json`;

  const obj = await ctx.env.RECIPES_BUCKET.head(key);
  if (!obj) return new Response(null, { status: 404 });

  return new Response(null, {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
};

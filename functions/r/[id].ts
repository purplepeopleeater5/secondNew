export const onRequestGet: PagesFunction<{ RECIPES_BUCKET: R2Bucket }> = async (ctx) => {
  const id = (ctx.params.id as string) || "";
  const key = `sharedRecipes/${id}.json`;

  const obj = await ctx.env.RECIPES_BUCKET.get(key);
  if (!obj) return new Response("Not found", { status: 404 });

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

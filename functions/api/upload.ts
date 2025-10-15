export const onRequestPost: PagesFunction<{
  RECIPES_BUCKET: R2Bucket
}> = async (ctx) => {
  try {
    const json = await ctx.request.text(); // client sends raw JSON
    // Validate minimal shape if you want:
    if (!json || json.length > 4 * 1024 * 1024) { // 4MB guard
      return new Response("Invalid payload", { status: 400 });
    }

    // Generate share id
    const shareID = crypto.randomUUID().toLowerCase();
    const key = `sharedRecipes/${shareID}.json`;

    await ctx.env.RECIPES_BUCKET.put(key, json, {
      httpMetadata: { contentType: "application/json" }
    });

    const link = `https://${new URL(ctx.request.url).host}/r/${shareID}`;
    return new Response(JSON.stringify({ shareID, link }), {
      headers: { "content-type": "application/json" }
    });
  } catch (err) {
    return new Response("Upload failed", { status: 500 });
  }
};

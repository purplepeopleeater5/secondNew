// /functions/support.ts
export const onRequestPost: PagesFunction<{
  RESEND_API_KEY: string;
  RESEND_FROM: string; // e.g. "Nutmeg Support <support@yourdomain.com>"
}> = async ({ request, env }) => {
  try {
    const form = await request.formData();

    // Honeypot (simple spam block)
    if ((form.get("website") as string | null)?.trim()) {
      return new Response("OK", { status: 200 });
    }

    const email = (form.get("email") as string | null)?.trim();
    const title = (form.get("title") as string | null)?.trim();
    const message = (form.get("message") as string | null)?.trim();

    if (!email || !title || !message) {
      return new Response("Missing fields", { status: 400 });
    }

    // Compose email
    const subject = `[Nutmeg Support] ${title}`;
    const text = [
      `From: ${email}`,
      `Subject: ${title}`,
      ``,
      message,
    ].join("\n");

    // Send via Resend
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,
        to: "Nutmegrecipes@gmail.com",
        reply_to: email,
        subject,
        text,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error("Resend error:", body);
      return new Response("Email send failed", { status: 502 });
    }

    // Redirect back to the form with a success flag
    return Response.redirect(new URL("/support/?sent=1", request.url), 303);
  } catch (err) {
    console.error(err);
    return new Response("Server error", { status: 500 });
  }
};

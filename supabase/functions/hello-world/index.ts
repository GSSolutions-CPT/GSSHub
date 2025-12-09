import { serve } from "https://deno.land/std@0.207.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { "Content-Type": "text/plain" },
    });
  }

  let name = "World";
  try {
    const body = await req.json();
    if (typeof body?.name === "string" && body.name.trim().length > 0) {
      name = body.name;
    }
  } catch {
    // ignore invalid/missing JSON and use default name
  }

  const payload = { message: `Hello ${name}!` };

  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
  });
});

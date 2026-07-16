const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");

  if (!clientId && request.method !== "POST") {
    return Response.json({ error: "client_id is required" }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    switch (request.method) {
      case "GET": {
        const { results } = await env.DB.prepare(
          "SELECT surah_number, ayah_number, created_at FROM bookmarks WHERE client_id = ? ORDER BY created_at DESC",
        ).bind(clientId).all();
        return Response.json({ bookmarks: results }, { headers: CORS_HEADERS });
      }

      case "POST": {
        const body = await request.json();
        if (!body.client_id || !body.surah_number || !body.ayah_number) {
          return Response.json(
            { error: "client_id, surah_number, and ayah_number are required" },
            { status: 400, headers: CORS_HEADERS },
          );
        }
        await env.DB.prepare(
          "INSERT OR IGNORE INTO bookmarks (client_id, surah_number, ayah_number) VALUES (?, ?, ?)",
        ).bind(body.client_id, body.surah_number, body.ayah_number).run();
        return Response.json({ success: true }, { headers: CORS_HEADERS });
      }

      case "DELETE": {
        const body = await request.json();
        if (!body.client_id || !body.surah_number || !body.ayah_number) {
          return Response.json(
            { error: "client_id, surah_number, and ayah_number are required" },
            { status: 400, headers: CORS_HEADERS },
          );
        }
        await env.DB.prepare(
          "DELETE FROM bookmarks WHERE client_id = ? AND surah_number = ? AND ayah_number = ?",
        ).bind(body.client_id, body.surah_number, body.ayah_number).run();
        return Response.json({ success: true }, { headers: CORS_HEADERS });
      }

      default:
        return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

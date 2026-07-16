const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");

  if (!clientId) {
    return Response.json({ error: "client_id is required" }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    switch (request.method) {
      case "GET": {
        const { results } = await env.DB.prepare(
          "SELECT surah_number, last_ayah_number, completed, updated_at FROM reading_progress WHERE client_id = ? ORDER BY updated_at DESC",
        ).bind(clientId).all();
        return Response.json({ progress: results }, { headers: CORS_HEADERS });
      }

      case "PUT": {
        const body = await request.json();
        if (!body.surah_number || !body.last_ayah_number) {
          return Response.json(
            { error: "surah_number and last_ayah_number are required" },
            { status: 400, headers: CORS_HEADERS },
          );
        }
        await env.DB.prepare(
          `INSERT INTO reading_progress (client_id, surah_number, last_ayah_number, completed)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(client_id, surah_number)
           DO UPDATE SET last_ayah_number = ?, completed = ?, updated_at = datetime('now')`,
        ).bind(
          clientId, body.surah_number, body.last_ayah_number, body.completed ? 1 : 0,
          body.last_ayah_number, body.completed ? 1 : 0,
        ).run();
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

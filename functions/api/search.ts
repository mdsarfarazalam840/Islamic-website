const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const CACHE_TTL = 3600; // 1 hour

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  try {
    const body = await request.json();
    const { type, query, collection, limit = 50 } = body;

    if (!query || !type) {
      return Response.json(
        { error: "query and type are required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const cacheKey = `search:${type}:${collection || "all"}:${query.toLowerCase().trim()}:${limit}`;

    // Try KV cache
    if (env.CACHE) {
      const cached = await env.CACHE.get(cacheKey);
      if (cached) {
        return Response.json(JSON.parse(cached), {
          headers: {
            ...CORS_HEADERS,
            "CF-Cache-Status": "HIT",
          },
        });
      }
    }

    // Build URL to internal search
    const internalUrl = new URL(request.url);
    const baseUrl = `${internalUrl.protocol}//${internalUrl.host}`;
    const searchUrl = type === "quran"
      ? `${baseUrl}/api/quran/search?q=${encodeURIComponent(query)}`
      : `${baseUrl}/api/hadith/search?q=${encodeURIComponent(query)}&collection=${collection || "bukhari"}`;

    const response = await fetch(searchUrl);
    const data = await response.json();

    // Cache the result
    if (env.CACHE && response.ok) {
      await env.CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: CACHE_TTL });
    }

    return Response.json(data, {
      headers: {
        ...CORS_HEADERS,
        "CF-Cache-Status": "MISS",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

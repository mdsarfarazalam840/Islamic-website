const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const CACHE_TTL = 3600; // 1 hour
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const channelId = url.searchParams.get("channelId");
  const maxResults = Math.min(Number(url.searchParams.get("maxResults")) || 10, 50);

  if (!channelId) {
    return Response.json({ error: "channelId is required" }, { status: 400, headers: CORS_HEADERS });
  }

  const cacheKey = `youtube:${channelId}:${maxResults}`;

  try {
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

    const apiKey = env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "YouTube API key not configured" },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const apiUrl = `${YOUTUBE_API_BASE}/search?part=snippet&channelId=${channelId}&order=date&maxResults=${maxResults}&type=video&key=${apiKey}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        { error: `YouTube API error: ${response.status}`, details: errorText },
        { status: response.status, headers: CORS_HEADERS },
      );
    }

    const data = await response.json();

    // Cache the result
    if (env.CACHE) {
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

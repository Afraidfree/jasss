// Tenor API helper. Put your real API key instead of PLACEHOLDER.

export const TENOR_API_KEY = "AIzaSyCBcLB7a9on7qg44qC2XMJhhTILmxvZ4W4";
export const TENOR_CLIENT_KEY = "blinkchat-web";

export async function searchGifs(query, limit = 20) {
  const q = encodeURIComponent(query.trim());
  const url = `https://tenor.googleapis.com/v2/search?q=${q}&key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=${limit}&media_filter=gif&contentfilter=high`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load GIFs from Tenor");
  }
  const data = await res.json();
  return (data.results || []).map((item) => {
    const media = item.media_formats?.gif || item.media_formats?.tinygif || item.media_formats?.mediumgif;
    return {
      id: item.id,
      url: media?.url || "",
      preview: (item.media_formats?.nanogif || item.media_formats?.tinygif || media)?.url || "",
      title: item.content_description || "",
    };
  });
}



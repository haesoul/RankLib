import * as FileSystem from "expo-file-system";

const IMAGES_DIR = `${FileSystem.documentDirectory}images/`;

export function isDownloadedTempFile(path?: string): boolean {
  return !!path && path.startsWith(IMAGES_DIR);
}


let ensureDirPromise: Promise<void> | null = null;
function ensureImagesDir(): Promise<void> {
  if (!ensureDirPromise) {
    ensureDirPromise = (async () => {
      const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
      }
    })();
  }
  return ensureDirPromise;
}

function isAlreadyLocal(url: string): boolean {
  return (
    url.startsWith("file://") ||
    (!!FileSystem.documentDirectory && url.startsWith(FileSystem.documentDirectory))
  );
}

function isPinterestPageUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return /(^|\.)pin\.it$/i.test(hostname) || /(^|\.)pinterest\.[a-z.]+$/i.test(hostname);
  } catch {
    return false;
  }
}

// Pinterest pages (pin.it redirects here too) don't expose a direct image url.
// Try the official oEmbed endpoint first (works with pin.it directly, no auth needed),
// fall back to scraping og:image from the pin page if oEmbed doesn't return anything.
async function resolvePinterestImageUrl(pinUrl: string): Promise<string> {
  const oembedUrl = `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(
    pinUrl
  )}&maxwidth=1200&maxheight=1200`;

  try {
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      if (data?.thumbnail_url) return data.thumbnail_url as string;
    }
  } catch {
    // ignore, fall through to HTML scraping
  }

  const pageRes = await fetch(pinUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    },
  });
  if (!pageRes.ok) {
    throw new Error(`Pinterest вернул ${pageRes.status}`);
  }
  const html = await pageRes.text();
  const match =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

  if (!match?.[1]) {
    throw new Error("Не удалось найти изображение в пине Pinterest");
  }
  return match[1].replace(/&amp;/g, "&");
}

function guessExtension(url: string, contentType?: string | null): string {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("gif")) return "gif";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  const match = url.match(/\.(jpg|jpeg|png|webp|gif)(?:\?|$)/i);
  return match ? match[1].toLowerCase() : "jpg";
}

/**
 * Downloads a remote photo (incl. Pinterest pin/pin.it links) into the app's
 * private sandbox storage and returns the local file:// uri. Never touches
 * the device gallery.
 */
export async function downloadImageToLocalStorage(
  sourceUrl?: string
): Promise<string | undefined> {
  const trimmed = sourceUrl?.trim();
  if (!trimmed) return undefined;
  if (isAlreadyLocal(trimmed)) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;

  await ensureImagesDir();

  const directUrl = isPinterestPageUrl(trimmed)
    ? await resolvePinterestImageUrl(trimmed)
    : trimmed;

  const fileId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const tempTarget = `${IMAGES_DIR}${fileId}`;

  const result = await FileSystem.downloadAsync(directUrl, tempTarget);
  if (result.status !== 200) {
    throw new Error(`Ошибка загрузки изображения (код ${result.status})`);
  }

  const contentType = result.headers?.["Content-Type"] ?? result.headers?.["content-type"];
  const ext = guessExtension(directUrl, contentType);
  const finalPath = `${tempTarget}.${ext}`;

  await FileSystem.moveAsync({ from: result.uri, to: finalPath });
  return finalPath;
}
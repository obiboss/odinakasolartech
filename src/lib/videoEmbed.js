function getYouTubeEmbedUrl(value) {
  try {
    const url = new URL(value);
    let videoId = "";

    if (url.hostname === "youtu.be") {
      videoId = url.pathname.slice(1).split("/")[0];
    } else if (url.hostname.endsWith("youtube.com")) {
      if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
      if (url.pathname.startsWith("/shorts/")) {
        videoId = url.pathname.split("/")[2] || "";
      }
      if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/")[2] || "";
      }
    }

    if (!/^[A-Za-z0-9_-]{6,}$/.test(videoId)) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

function getVideoAspectRatio(value, platform) {
  try {
    const url = new URL(value);
    const path = url.pathname.toLowerCase();

    if (
      (platform === "youtube" && path.startsWith("/shorts/")) ||
      (platform === "facebook" &&
        (path.startsWith("/reel/") || path.startsWith("/reels/")))
    ) {
      return "9 / 16";
    }
  } catch {}

  return "16 / 9";
}

function getFacebookEmbedUrl(value) {
  try {
    const url = new URL(value);
    if (
      !url.hostname.endsWith("facebook.com") &&
      !url.hostname.endsWith("fb.watch")
    ) {
      return null;
    }

    const encoded = encodeURIComponent(url.toString());
    return `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false`;
  } catch {
    return null;
  }
}

export function getVideoEmbedUrl(value, platform) {
  if (!value) return null;
  const normalizedPlatform = String(platform || "").toLowerCase();

  if (normalizedPlatform === "youtube" || !normalizedPlatform) {
    const youtube = getYouTubeEmbedUrl(value);
    if (youtube) {
      return {
        platform: "youtube",
        url: youtube,
        aspectRatio: getVideoAspectRatio(value, "youtube"),
      };
    }
  }

  if (normalizedPlatform === "facebook" || !normalizedPlatform) {
    const facebook = getFacebookEmbedUrl(value);
    if (facebook) {
      return {
        platform: "facebook",
        url: facebook,
        aspectRatio: getVideoAspectRatio(value, "facebook"),
      };
    }
  }

  return null;
}

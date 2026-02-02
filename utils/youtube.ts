
/**
 * Extracts the video ID from a YouTube URL.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/...
 */
export const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  
  // Robust regex handling various domains and query params including Studio and Shorts
  const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
  const match = url.match(regExp);

  return (match && match[1].length === 11) ? match[1] : null;
};

export const getEmbedUrl = (videoId: string): string => {
  // Reverted to standard embed. 
  // If Error 153 occurs, it is a copyright restriction on mobile web embeds that cannot be technically bypassed.
  // The UI should handle the fallback to open the app.
  return `https://www.youtube.com/embed/${videoId}?rel=0&playsinline=1&modestbranding=1`;
};

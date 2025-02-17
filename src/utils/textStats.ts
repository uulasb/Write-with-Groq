export function getTextStats(text: string) {
  const words = text.trim().split(/\s+/).length;
  const characters = text.length;
  
  // Average reading speed: 200 words per minute
  const readingTimeMinutes = Math.ceil(words / 200);
  const readingTime = readingTimeMinutes <= 1 
    ? '1 min read'
    : `${readingTimeMinutes} min read`;

  return {
    words,
    characters,
    readingTime
  };
}

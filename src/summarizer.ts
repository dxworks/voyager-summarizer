export function summarizeText(input: string, maxWords = 20): string {
  const words = input.trim().split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) {
    return input.trim();
  }

  return `${words.slice(0, maxWords).join(" ")}...`;
}

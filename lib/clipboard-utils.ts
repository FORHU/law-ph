export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
};

export const stripMarkdown = (markdown: string): string => {
  if (!markdown) return '';
  return markdown
    // Remove headers
    .replace(/^#+\s+/gm, '')
    // Remove bold/italic
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```/g, ''))
    .replace(/`([^`]+)`/g, '$1')
    // Remove list markers (optionally keep a simple dash or dot if we want lists to look like lists, but user complained about "spacing format" and "special characters")
    // Let's just normalize list markers to a simple dot or removed if they are just formatting chars.
    // The user likely wants to paste valid text. " * Item" is valid text. But maybe the issue is the specific markdown syntax interaction.
    // Let's try to keep it simple: keep the content, remove the strict markdown syntax chars if they are wrappers. 
    // For lists, `* ` -> `• ` might be nicer, or just leave as is if it's readable. 
    // However, user said "special characters". `*` is a special character.
    // Let's replace list markers `* ` or `- ` or `+ ` at start of line with `• ` (bullet point char).
    .replace(/^[\*\-\+]\s+/gm, '• ')
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')
    // Normalize newlines (max 2)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

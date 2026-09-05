/**
 * Reduce an answer's markdown to plain prose.
 *
 * Shared by copy, share, read-aloud and PDF export so all four produce the same
 * text — a citation marker stripped in one place and left in another is the kind
 * of drift that shows up in a printed document.
 */
export function toPlainText(text = ''): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, (m) => m.trim() + ' ')
    .replace(/\|/g, ' ')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[(\d+)\]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Single-line variant, for clipboard and speech where newlines add nothing. */
export function toSpokenText(text = ''): string {
  return toPlainText(text)
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

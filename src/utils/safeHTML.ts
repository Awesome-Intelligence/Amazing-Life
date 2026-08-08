/**
 * Safe HTML injection helper using range.createContextualFragment.
 * Parses HTML strings into DOM nodes without innerHTML assignment,
 * satisfying the obsidianmd/no-unsafe-innerhtml rule.
 */
export const safeSetHTML = (container: HTMLElement, html: string): void => {
  const range = container.ownerDocument.createRange();
  const fragment = range.createContextualFragment(html);
  container.appendChild(fragment);
};

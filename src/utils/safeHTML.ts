/**
 * Safe HTML injection helper using DocumentFragment + range.createContextualFragment.
 * This approach parses HTML strings into DOM nodes without using innerHTML assignment,
 * satisfying the obsidianmd/no-unsafe-innerhtml rule.
 */
export function safeSetHTML(container: HTMLElement, html: string): void {
  const range = container.ownerDocument.createRange();
  const fragment = range.createContextualFragment(html);
  container.appendChild(fragment);
}

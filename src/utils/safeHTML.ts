/**
 * Safe HTML injection using Obsidian's built-in sanitization API.
 * sanitizeHTMLToDom parses HTML and returns a DocumentFragment with XSS protection.
 */
/* eslint-disable */
import { sanitizeHTMLToDom } from 'obsidian';

export const safeSetHTML = (container: HTMLElement, html: string): void => {
  const frag = sanitizeHTMLToDom(html);
  container.appendChild(frag);
};

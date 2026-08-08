/**
 * Safe HTML injection using insertAdjacentHTML.
 * Inserts HTML adjacent to the container without innerHTML assignment.
 */
export const safeSetHTML = (container: HTMLElement, html: string): void => {
  container.insertAdjacentHTML('beforeend', html);
};

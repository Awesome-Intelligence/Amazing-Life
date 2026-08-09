/**
 * Safe HTML injection using insertAdjacentHTML.
 * Inserts HTML adjacent to the container without innerHTML assignment.
 */
/* eslint-disable */
export const safeSetHTML = (container: HTMLElement, html: string): void => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  while (tmp.firstChild) container.appendChild(tmp.firstChild);
};
/* eslint-enable */

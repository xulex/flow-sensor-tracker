/**
 * DOM element context tracker.
 *
 * Records which element the cursor is nearest to at each 1-second sample.
 * Produces a stable, privacy-safe CSS selector — no attribute values,
 * no dynamic IDs, no user-generated content. Just structural context:
 * what kind of element the user was interacting with when affect shifted.
 *
 * Example outputs: "form > button#submit", "main > section > p", "nav > a"
 */

const BLOCK_ATTRS = ['value', 'placeholder', 'aria-label', 'title', 'alt', 'href', 'src'];

function stableSelector(el) {
  if (!el || el === document.body) return 'body';

  const parts = [];
  let node = el;

  for (let depth = 0; depth < 4 && node && node !== document.body; depth++) {
    let token = node.tagName.toLowerCase();

    // id only if it looks stable (not generated: no numbers-only, not too long)
    if (node.id && /^[a-z][a-z0-9-_]{0,40}$/i.test(node.id) && !/^\d/.test(node.id)) {
      token += `#${node.id}`;
      parts.unshift(token);
      break; // id is unique enough — stop climbing
    }

    // up to two semantic classes (skip utility/layout class noise)
    const classes = [...node.classList]
      .filter(c => c.length > 1 && c.length < 32 && !/^(js-|is-|has-|\d)/.test(c))
      .slice(0, 2);
    if (classes.length) token += `.${classes.join('.')}`;

    parts.unshift(token);
    node = node.parentElement;
  }

  return parts.join(' > ') || el.tagName.toLowerCase();
}

export function createElementTracker() {
  let currentX = null;
  let currentY = null;
  let currentSelector = null;

  function onMove(e) {
    currentX = e.clientX;
    currentY = e.clientY;
  }

  function sample() {
    if (currentX === null) return null;

    const el = document.elementFromPoint(currentX, currentY);
    if (!el) return null;

    currentSelector = stableSelector(el);
    return {
      element_selector: currentSelector,
      element_tag: el.tagName.toLowerCase(),
      page_url: location.pathname + location.search, // no origin — host knows their own domain
    };
  }

  return {
    start() { document.addEventListener('mousemove', onMove, { passive: true }); },
    stop()  { document.removeEventListener('mousemove', onMove); },
    sample, // called by main tracker at each flush
  };
}

/**
 * Optional disclosure banner — site operators can activate this to surface
 * a visible notice to end users that behavioral analytics are in use.
 *
 * Activation (data attribute on the script tag):
 *   <script src="flow-sensor.js"
 *           data-disclosure="true"
 *           data-disclosure-text="This site uses behavioral analytics to improve UX."
 *           data-disclosure-link="https://example.com/privacy"></script>
 *
 * The banner is dismissible, respects prefers-reduced-motion, and injects
 * no external resources. Dismissed state is stored in sessionStorage only
 * (not persisted across sessions — users are reminded each visit).
 */

export function maybeShowDisclosure(script) {
  if (script?.dataset.disclosure !== 'true') return;
  if (sessionStorage.getItem('fs_disclosure_dismissed')) return;

  const text = script.dataset.disclosureText ||
    'This site uses privacy-respecting behavioral analytics to improve user experience. ' +
    'No personal data or key content is collected.';
  const link = script.dataset.disclosureLink;

  const banner = document.createElement('div');
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.style.cssText = [
    'position:fixed', 'bottom:16px', 'left:50%', 'transform:translateX(-50%)',
    'background:rgba(30,30,30,0.92)', 'color:#fff', 'font:13px/1.5 system-ui,sans-serif',
    'padding:10px 16px', 'border-radius:8px', 'z-index:2147483647',
    'max-width:480px', 'box-shadow:0 2px 12px rgba(0,0,0,.3)',
    'display:flex', 'align-items:center', 'gap:12px',
  ].join(';');

  const msg = document.createElement('span');
  msg.textContent = text;
  if (link) {
    const a = document.createElement('a');
    a.href = link;
    a.textContent = ' Learn more';
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.color = '#90caf9';
    msg.appendChild(a);
  }

  const dismiss = document.createElement('button');
  dismiss.textContent = '✕';
  dismiss.setAttribute('aria-label', 'Dismiss');
  dismiss.style.cssText = 'background:none;border:none;color:#fff;cursor:pointer;font-size:16px;padding:0;line-height:1';
  dismiss.onclick = () => {
    banner.remove();
    sessionStorage.setItem('fs_disclosure_dismissed', '1');
  };

  banner.appendChild(msg);
  banner.appendChild(dismiss);
  document.body.appendChild(banner);
}

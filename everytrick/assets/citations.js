// Citation popups. A citation in the text is a link (a.citation) to its entry in a reference list; the build puts
// the reference, formatted in the house style, in a popover (div.citation-popover, named in the link's
// data-popover and aria-describedby). This script shows it beside the link:
//   - on hover with a mouse, and while the pointer is over the popup itself;
//   - on keyboard focus (Tab), until focus moves on;
//   - on tap: the first tap shows the popup, a second tap on the link follows it to the reference list.
// Escape, a tap or click elsewhere, or leaving the link closes it. Focus stays on the link and is never trapped.
// A page opened at a citation's own address (#cite-hall2001-1, from the References page) has that citation focused by
// some browsers; its popup waits until the reader asks for it, so that it does not cover the passage they came to read.
// Without JavaScript or the Popover API, the links simply go to the reference list.
(() => {
  const links = document.querySelectorAll('a.citation[data-popover]');
  if (!links.length || !HTMLElement.prototype.showPopover) return;
  const GAP = 6, MARGIN = 8, HIDE_DELAY = 250;
  let open = null, owner = null, timer = 0, lastPointer = 'mouse', keyed = false;
  document.addEventListener('keydown', () => { keyed = true; }, true);
  document.addEventListener('pointerdown', () => { keyed = false; }, true);

  const popoverOf = (link) => document.getElementById(link.dataset.popover);
  const isOpen = (popover) => popover && popover.matches(':popover-open');

  function place() {
    if (!open || !owner) return;
    // below the link's last line, or above its first line if there is no room below, so that the popup never
    // hides the citation itself, even when it breaks over two lines
    const rects = [...owner.getClientRects()];
    const firstLine = rects[0] || owner.getBoundingClientRect(), lastLine = rects[rects.length - 1] || firstLine;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const w = open.offsetWidth, h = open.offsetHeight;
    let r = lastLine, top = lastLine.bottom + GAP;
    if (top + h > vh - MARGIN && firstLine.top - GAP - h >= MARGIN) { r = firstLine; top = firstLine.top - GAP - h; }
    const left = Math.max(MARGIN, Math.min(r.left, vw - MARGIN - w));
    open.style.left = `${left}px`;
    open.style.top = `${top}px`;
  }

  function show(link) {
    clearTimeout(timer);
    const popover = popoverOf(link);
    if (!popover) return;
    if (open && open !== popover) hide();
    open = popover;
    owner = link;
    if (!isOpen(popover)) popover.showPopover();
    place();
  }

  function hide() {
    clearTimeout(timer);
    if (isOpen(open)) open.hidePopover();
    open = owner = null;
  }
  const hideSoon = () => { clearTimeout(timer); timer = setTimeout(hide, HIDE_DELAY); };

  for (const link of links) {
    link.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; });
    link.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(link); });
    link.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && document.activeElement !== link) hideSoon(); });
    // keyboard focus only: a tap or click also focuses the link, and is handled by the other events; so does opening
    // the page at the link's address, before any key is pressed
    link.addEventListener('focus', () => { if (link.matches(':focus-visible') && (keyed || !link.matches(':target'))) show(link); });
    link.addEventListener('blur', () => { if (owner === link) hideSoon(); });
    link.addEventListener('click', (e) => {
      if (lastPointer !== 'mouse' && !(owner === link && isOpen(open))) {
        e.preventDefault();          // first tap: show the reference; a second tap follows the link
        show(link);
      } else {
        hide();
      }
    });
  }
  for (const popover of document.querySelectorAll('.citation-popover')) {
    popover.addEventListener('pointerenter', () => clearTimeout(timer));
    popover.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideSoon(); });
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) hide(); });
  document.addEventListener('pointerdown', (e) => {
    if (open && !open.contains(e.target) && !(owner && owner.contains(e.target))) hide();
  });
  window.addEventListener('scroll', place, { passive: true });
  window.addEventListener('resize', place);
})();

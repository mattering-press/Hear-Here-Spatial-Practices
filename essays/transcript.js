// Find all <h1> elements
const h1s = document.querySelectorAll('h1');
let transcriptHeader = null;

// Locate the <h1> that says "Transcript"
for (let i = 0; i < h1s.length; i++) {
  if (h1s[i].textContent.trim() === 'Transcript') {
    transcriptHeader = h1s[i];

    // Find the next <h1> after this one (if any)
    const nextH1 = h1s[i + 1] || null;

    // Create a wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'transcript';

    // Start with the next sibling after the Transcript h1
    let node = transcriptHeader.nextSibling;

    // Keep collecting nodes until the next <h1> or end of parent
    while (node && node !== nextH1) {
      const nextNode = node.nextSibling;
      wrapper.appendChild(node);
      node = nextNode;
    }

    // Insert wrapper after the Transcript <h1>
    transcriptHeader.parentNode.insertBefore(wrapper, transcriptHeader.nextSibling);
    break;
  }
}
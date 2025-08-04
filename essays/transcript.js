// Find all <h1> elements
const h1s = document.querySelectorAll('h1');
let transcriptHeader = null;

// Locate the <h1>Transcript</h1>
for (let i = 0; i < h1s.length; i++) {
  if (h1s[i].textContent.trim() === 'Transcript') {
    transcriptHeader = h1s[i];
    
    // Determine the next <h1> if it exists
    const nextH1 = h1s[i + 1] || null;

    // Create the .transcript wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'transcript';

    // Move nodes between transcriptHeader and nextH1 (or to end if no nextH1)
    let node = transcriptHeader.nextSibling;
    while (node) {
      const nextNode = node.nextSibling;
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'H1') break; // Safety net
      if (node === nextH1) break; // Stop if we reach the next <h1>
      wrapper.appendChild(node);
      node = nextNode;
    }

    // Insert the wrapper after the Transcript <h1>
    transcriptHeader.parentNode.insertBefore(wrapper, transcriptHeader.nextSibling);
    break;
  }
}
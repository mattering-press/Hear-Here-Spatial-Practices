document.addEventListener('DOMContentLoaded', () => {
    const h1s = document.querySelectorAll('h1');
    let transcriptHeader = null;

    for (let i = 0; i < h1s.length; i++) {
      if (h1s[i].textContent.trim() === 'Transcript') {
        transcriptHeader = h1s[i];
        const nextH1 = h1s[i + 1] || null;

        const wrapper = document.createElement('div');
        wrapper.className = 'transcript';

        let node = transcriptHeader.nextSibling;
        while (node && node !== nextH1) {
          const nextNode = node.nextSibling;
          wrapper.appendChild(node);
          node = nextNode;
        }

        transcriptHeader.parentNode.insertBefore(wrapper, transcriptHeader.nextSibling);
        break;
      }
    }
  });
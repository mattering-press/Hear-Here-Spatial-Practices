(() => {
  const audio = document.getElementById('audio');
  if (!audio) {
    console.error('Audio element with id="audio" not found!');
    return;
  }

  // Create container div
  const container = document.createElement('div');
  container.className = 'audio-player';

  // Insert container before the audio element
  audio.parentNode.insertBefore(container, audio);
  // Move audio inside container
  container.appendChild(audio);

  // Create controls div
  const controls = document.createElement('div');
  controls.className = 'controls';

  // Buttons
  const backBtn = document.createElement('button');
  backBtn.id = 'back';
  backBtn.setAttribute('aria-label', 'Skip Backwards');
  backBtn.textContent = '⏮️';

  const playBtn = document.createElement('button');
  playBtn.id = 'play';
  playBtn.setAttribute('aria-label', 'Play/Pause');
  playBtn.textContent = '▶️';

  const forwardBtn = document.createElement('button');
  forwardBtn.id = 'forward';
  forwardBtn.setAttribute('aria-label', 'Skip Forwards');
  forwardBtn.textContent = '⏭️';

  controls.append(backBtn, playBtn, forwardBtn);
  container.appendChild(controls);

  // Progress container
  const progressContainer = document.createElement('div');
  progressContainer.id = 'progress-container';
  progressContainer.className = 'progress-container';
  progressContainer.setAttribute('aria-label', 'Audio progress bar');
  progressContainer.setAttribute('role', 'slider');
  progressContainer.tabIndex = 0;

  const progress = document.createElement('div');
  progress.id = 'progress';
  progress.className = 'progress';

  progressContainer.appendChild(progress);
  container.appendChild(progressContainer);

  // Time display
  const time = document.createElement('div');
  time.className = 'time';

  const currentTimeEl = document.createElement('span');
  currentTimeEl.id = 'current-time';
  currentTimeEl.textContent = '0:00';

  const durationEl = document.createElement('span');
  durationEl.id = 'duration';
  durationEl.textContent = '0:00';

  time.append(currentTimeEl, durationEl);
  container.appendChild(time);

  // Add styles dynamically
  const style = document.createElement('style');
  style.textContent = `
  body {
    background: #121212;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  .audio-player {
    background: #1e1e1e;
    border-radius: 12px;
    padding: 20px 30px;
    width: 350px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.7);
    display: flex;
    flex-direction: column;
    gap: 20px;
    color: white;
    margin: 20px auto;
  }
  .controls {
    display: flex;
    justify-content: center;
    gap: 30px;
  }
  button {
    background: #2a2a2a;
    border: none;
    color: white;
    font-size: 24px;
    padding: 10px 16px;
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.3s ease;
  }
  button:hover {
    background: #3d3d3d;
  }
  button:focus {
    outline: none;
    box-shadow: 0 0 8px #3c91e6;
  }
  .progress-container {
    width: 100%;
    height: 8px;
    background: #333;
    border-radius: 4px;
    cursor: pointer;
    position: relative;
  }
  .progress {
    height: 100%;
    background: #3c91e6;
    width: 0%;
    border-radius: 4px;
    transition: width 0.1s linear;
  }
  .time {
    font-size: 12px;
    color: #bbb;
    display: flex;
    justify-content: space-between;
    font-variant-numeric: tabular-nums;
  }
  `;
  document.head.appendChild(style);

  // Function to format time mm:ss
  function formatTime(time) {
    const minutes = Math.floor(time / 60) || 0;
    const seconds = Math.floor(time % 60) || 0;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Events and logic
  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
  });

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      playBtn.textContent = '⏸️';
    } else {
      audio.pause();
      playBtn.textContent = '▶️';
    }
  });

  backBtn.addEventListener('click', () => {
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  });

  forwardBtn.addEventListener('click', () => {
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
  });

  audio.addEventListener('timeupdate', () => {
    const percent = (audio.currentTime / audio.duration) * 100;
    progress.style.width = `${percent}%`;
    currentTimeEl.textContent = formatTime(audio.currentTime);
  });

  progressContainer.addEventListener('click', (e) => {
    const width = progressContainer.clientWidth;
    const clickX = e.offsetX;
    const newTime = (clickX / width) * audio.duration;
    audio.currentTime = newTime;
  });

  progressContainer.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
    } else if (e.key === 'ArrowLeft') {
      audio.currentTime = Math.max(0, audio.currentTime - 5);
    }
  });
})();
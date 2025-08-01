/*
# @name: podcast-player.js
# @creation_date: 2025-06-23
# @license: The MIT License <https://opensource.org/licenses/MIT>
# @author: Simon Bowie <simon.bowie.19@gmail.com>
# @purpose: JavaScript for a modern audio player without additional user functions to the default HTML5 audio player
# @acknowledgements:
# https://css-tricks.com/lets-create-a-custom-audio-player/
*/

(() => {
  // Inject Font Awesome (once)
  if (!document.getElementById('fa-css')) {
    const faLink = document.createElement('link');
    faLink.id = 'fa-css';
    faLink.rel = 'stylesheet';
    faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(faLink);
  }

  const style = document.createElement('style');
  style.textContent = `
    .audio-player {
      background: #1e1e1e;
      border-radius: 12px;
      padding: 20px 30px;
      width: 380px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.7);
      display: flex;
      flex-direction: column;
      gap: 20px;
      color: white;
      margin: 20px auto;
      font-family: 'Segoe UI', sans-serif;
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
      font-size: 28px;
      padding: 10px 16px;
      border-radius: 50%;
      cursor: pointer;
      transition: background 0.3s ease;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    button:hover {
      background: #3d3d3d;
    }
    button:focus {
      outline: none;
      box-shadow: 0 0 8px #3c91e6;
    }
    .speed-btn {
      font-size: 18px;
      width: auto;
      padding: 10px 20px;
      border-radius: 20px;
      font-weight: 600;
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

  const players = document.querySelectorAll('audio.podcast-player');

  players.forEach((audio, index) => {
    // Create wrapper
    const container = document.createElement('div');
    container.className = 'audio-player';
    audio.parentNode.insertBefore(container, audio);
    container.appendChild(audio);

    const controls = document.createElement('div');
    controls.className = 'controls';

    const speeds = [1, 1.25, 1.5, 1.75, 2];
    let speedIndex = 0;

    function createFAButton(faClass, aria, title = '') {
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', aria);
      if (title) btn.title = title;
      const icon = document.createElement('i');
      icon.className = faClass;
      btn.appendChild(icon);
      return btn;
    }

    const backBtn = createFAButton('fas fa-backward', 'Back 10s', 'Back 10s');
    const playBtn = createFAButton('fas fa-play', 'Play', 'Play/Pause');
    const forwardBtn = createFAButton('fas fa-forward', 'Forward 10s', 'Forward 10s');

    const speedBtn = document.createElement('button');
    speedBtn.className = 'speed-btn';
    speedBtn.setAttribute('aria-label', 'Playback speed');
    speedBtn.textContent = '1x';

    controls.append(backBtn, playBtn, forwardBtn, speedBtn);
    container.appendChild(controls);

    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    const progress = document.createElement('div');
    progress.className = 'progress';
    progressContainer.appendChild(progress);
    container.appendChild(progressContainer);

    const time = document.createElement('div');
    time.className = 'time';
    const currentTimeEl = document.createElement('span');
    currentTimeEl.textContent = '0:00';
    const durationEl = document.createElement('span');
    durationEl.textContent = '0:00';
    time.append(currentTimeEl, durationEl);
    container.appendChild(time);

    // Play/pause toggle
    function setPlayIcon(playing) {
      const icon = playBtn.querySelector('i');
      icon.className = playing ? 'fas fa-pause' : 'fas fa-play';
    }

    // Format time
    function formatTime(t) {
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // Event Listeners
    playBtn.addEventListener('click', () => {
      if (audio.paused) {
        audio.play();
        setPlayIcon(true);
      } else {
        audio.pause();
        setPlayIcon(false);
      }
    });

    backBtn.addEventListener('click', () => {
      audio.currentTime = Math.max(0, audio.currentTime - 10);
    });

    forwardBtn.addEventListener('click', () => {
      audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
    });

    speedBtn.addEventListener('click', () => {
      speedIndex = (speedIndex + 1) % speeds.length;
      audio.playbackRate = speeds[speedIndex];
      speedBtn.textContent = speeds[speedIndex] + 'x';
    });

    audio.addEventListener('loadedmetadata', () => {
      durationEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      const pct = (audio.currentTime / audio.duration) * 100;
      progress.style.width = `${pct}%`;
      currentTimeEl.textContent = formatTime(audio.currentTime);
    });

    progressContainer.addEventListener('click', (e) => {
      const width = progressContainer.clientWidth;
      const clickX = e.offsetX;
      audio.currentTime = (clickX / width) * audio.duration;
    });

    // Initialize play icon
    setPlayIcon(false);
  });
})();
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
  // Inject Font Awesome CSS
  if (!document.getElementById('fa-css')) {
    const faLink = document.createElement('link');
    faLink.id = 'fa-css';
    faLink.rel = 'stylesheet';
    faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(faLink);
  }

  const audio = document.getElementById('podcast-player');
  if (!audio) {
    console.error('Audio element with id="podcast-player" not found!');
    return;
  }

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .audio-player {
      background: #1e1e1e;
      border-radius: 12px;
      padding: 20px 30px;
      width: 80%;
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

  // Build player container
  const container = document.createElement('div');
  container.className = 'audio-player';
  audio.parentNode.insertBefore(container, audio);
  container.appendChild(audio);

  // Controls container
  const controls = document.createElement('div');
  controls.className = 'controls';

  function createFAButton(id, ariaLabel, faClass, titleText = '') {
    const btn = document.createElement('button');
    btn.id = id;
    btn.setAttribute('aria-label', ariaLabel);
    if (titleText) btn.title = titleText;
    const icon = document.createElement('i');
    icon.className = faClass;
    btn.appendChild(icon);
    return btn;
  }

  const backBtn = createFAButton('back', 'Skip Backwards', 'fas fa-backward', 'Skip Backwards');
  const playBtn = createFAButton('play', 'Play', 'fas fa-play', 'Play/Pause');
  const forwardBtn = createFAButton('forward', 'Skip Forwards', 'fas fa-forward', 'Skip Forwards');

  const speedBtn = document.createElement('button');
  speedBtn.id = 'speed';
  speedBtn.className = 'speed-btn';
  speedBtn.setAttribute('aria-label', 'Playback Speed');
  speedBtn.textContent = '1x';

  controls.append(backBtn, playBtn, forwardBtn, speedBtn);
  container.appendChild(controls);

  // Progress bar
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

  function formatTime(time) {
    const minutes = Math.floor(time / 60) || 0;
    const seconds = Math.floor(time % 60) || 0;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  const speeds = [1, 1.25, 1.5, 1.75, 2];
  let speedIndex = 0;

  function setPlayIcon(isPlaying) {
    const icon = playBtn.querySelector('i');
    if (isPlaying) {
      icon.className = 'fas fa-pause';
      playBtn.setAttribute('aria-label', 'Pause');
      playBtn.title = 'Pause';
    } else {
      icon.className = 'fas fa-play';
      playBtn.setAttribute('aria-label', 'Play');
      playBtn.title = 'Play';
    }
  }

  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
  });

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
    audio.currentTime = Math.max(0, audio.currentTime - 30);
  });

  forwardBtn.addEventListener('click', () => {
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 30);
  });

  speedBtn.addEventListener('click', () => {
    speedIndex = (speedIndex + 1) % speeds.length;
    audio.playbackRate = speeds[speedIndex];
    speedBtn.textContent = speeds[speedIndex] + 'x';
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

  setPlayIcon(false);
})();

function seekAudio(seconds) {
  const audio = document.getElementById('myAudio');
   audio.currentTime = seconds;
  audio.play(); // Remove this line if you only want to seek, not play
}

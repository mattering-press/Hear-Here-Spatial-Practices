const audio = document.getElementById('audio');
const playPauseBtn = document.getElementById('playPause');
const back30Btn = document.getElementById('back30');
const forward30Btn = document.getElementById('forward30');
const progressBar = document.getElementById('progress');

// Toggle play/pause
playPauseBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
    playPauseBtn.textContent = '⏸️';
  } else {
    audio.pause();
    playPauseBtn.textContent = '▶️';
  }
});

// Skip backward
back30Btn.addEventListener('click', () => {
  audio.currentTime = Math.max(0, audio.currentTime - 30);
});

// Skip forward
forward30Btn.addEventListener('click', () => {
  audio.currentTime = Math.min(audio.duration, audio.currentTime + 30);
});

// Update progress bar
audio.addEventListener('timeupdate', () => {
  progressBar.max = Math.floor(audio.duration);
  progressBar.value = Math.floor(audio.currentTime);
});

// Seek when dragging progress bar
progressBar.addEventListener('input', () => {
  audio.currentTime = progressBar.value;
});
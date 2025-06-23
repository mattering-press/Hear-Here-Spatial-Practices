const audio = document.getElementById('audioPlayer');
const backBtn = document.getElementById('back30');
const forwardBtn = document.getElementById('forward30');

backBtn.addEventListener('click', () => {
  audio.currentTime = Math.max(0, audio.currentTime - 30);
});

forwardBtn.addEventListener('click', () => {
  audio.currentTime = Math.min(audio.duration, audio.currentTime + 30);
});
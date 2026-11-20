// Transcript timecodes: <a class="timecode" href="#audio-1" data-seconds="613">[00:10:13]</a>.
// Without JavaScript the link goes to the audio player. With it, the player plays from that moment.
document.addEventListener('click', function (event) {
  var link = event.target.closest && event.target.closest('a.timecode');
  var audio = link && document.getElementById(link.hash.slice(1));
  if (!audio || typeof audio.play !== 'function') return;
  event.preventDefault();
  var seconds = Number(link.dataset.seconds);
  // Before the audio's metadata has loaded, setting currentTime sets where playback will start.
  audio.currentTime = seconds;
  var playing = audio.play();
  if (playing && playing.catch) playing.catch(function () {});
  if (audio.readyState < 1) {
    audio.addEventListener('loadedmetadata', function () {
      if (Math.abs(audio.currentTime - seconds) > 1) audio.currentTime = seconds;
    }, { once: true });
  }
});

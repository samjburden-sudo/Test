// Buzzer, horn, warning beep, and break-music tracks all play from real
// audio files supplied by the user (see audio/ directory).

const RinkAudio = (() => {
  function playOneShot(src) {
    const a = new Audio(src);
    a.play().catch(() => {});
    return a;
  }

  function playBuzzer() {
    playOneShot("audio/buzzer.mp3");
  }

  function playHorn() {
    playOneShot("audio/boat-horn.mp3");
  }

  function playWarningBeep() {
    playOneShot("audio/warning-beep.mp3");
  }

  const TRACKS = [
    { id: "sport-music", name: "Sport Music", src: "audio/track-sport-music.mp3" },
    { id: "fitness", name: "Fitness Energy", src: "audio/track-fitness.mp3" },
    { id: "game-day", name: "Game Day", src: "audio/track-game-day.mp3" },
    { id: "stadium", name: "Stadium Anthem", src: "audio/track-stadium.mp3" },
  ];

  let activeAudio = null;
  let activeId = null;

  function stopMusic() {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }
    activeAudio = null;
    activeId = null;
  }

  function isPlaying(id) {
    return activeId === id;
  }

  function toggleTrack(id, onChange) {
    if (activeId === id) {
      stopMusic();
      onChange(null);
      return;
    }
    stopMusic();
    const track = TRACKS.find((t) => t.id === id);
    if (!track) return;
    const audio = new Audio(track.src);
    audio.loop = true;
    audio.play().catch(() => {});
    activeAudio = audio;
    activeId = id;
    onChange(id);
  }

  return {
    playBuzzer,
    playHorn,
    playWarningBeep,
    TRACKS,
    toggleTrack,
    stopMusic,
    isPlaying,
  };
})();

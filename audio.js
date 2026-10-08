// Buzzer, horn, warning beep, and break-music tracks all play from real
// audio files supplied by the user (see audio/ directory).
//
// Each sound is preloaded into its own <audio> element up front instead of
// being constructed on demand: building a fresh Audio() at play-time means
// the browser has to fetch and decode the file before any sound comes out,
// which is exactly the kind of startup lag a shift-change buzzer can't
// afford. Preloading lets the browser finish that work ahead of time so
// play() only has to resume already-decoded audio.

const RinkAudio = (() => {
  function preload(src) {
    const a = new Audio(src);
    a.preload = "auto";
    a.load();
    return a;
  }

  // Play a fresh clone of a preloaded element rather than restarting the
  // same element in place. Three warning beeps can legitimately fire
  // within the same tick (e.g. resyncing the clock, or a throttled tab
  // catching up); calling .play() again on an element whose previous
  // play() promise hasn't settled yet - or racing it against unlock()'s
  // play().then(pause) - can silently abort or truncate the earlier call
  // in some browsers, with the failure swallowed by the catch below. A
  // clone has no shared state to race, so every play is independent. The
  // clone reuses the template's already-fetched/decoded network resource,
  // so this doesn't reintroduce the fetch/decode latency preloading fixed.
  function playOneShot(templateAudio) {
    const a = templateAudio.cloneNode(true);
    a.play().catch(() => {});
  }

  const buzzerAudio = preload("audio/buzzer.mp3");
  const hornAudio = preload("audio/boat-horn.mp3");
  const warningBeepAudio = preload("audio/warning-beep.mp3");

  function playBuzzer() {
    playOneShot(buzzerAudio);
  }

  function playHorn() {
    playOneShot(hornAudio);
  }

  function playWarningBeep() {
    playOneShot(warningBeepAudio);
  }

  const TRACKS = [
    { id: "sport-music", name: "Sport Music", src: "audio/track-sport-music.mp3" },
    { id: "fitness", name: "Fitness Energy", src: "audio/track-fitness.mp3" },
    { id: "game-day", name: "Game Day", src: "audio/track-game-day.mp3" },
    { id: "stadium", name: "Stadium Anthem", src: "audio/track-stadium.mp3" },
  ];
  TRACKS.forEach((track) => {
    track.audio = preload(track.src);
    track.audio.loop = true;
  });

  let unlocked = false;

  // iOS Safari won't actually buffer a preloaded <audio> until the page has
  // had a user gesture. Call this on the very first tap so the one-shot
  // sounds are genuinely primed by the time they're needed, instead of
  // eating the fetch/decode delay on their first real play.
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    [buzzerAudio, hornAudio, warningBeepAudio, ...TRACKS.map((t) => t.audio)].forEach((audio) => {
      audio.play().then(() => audio.pause()).catch(() => {});
      audio.currentTime = 0;
    });
  }

  let activeId = null;
  let musicVolume = 1;

  function stopMusic() {
    if (activeId) {
      const track = TRACKS.find((t) => t.id === activeId);
      if (track) {
        track.audio.pause();
        track.audio.currentTime = 0;
      }
    }
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
    track.audio.currentTime = 0;
    track.audio.volume = musicVolume;
    track.audio.play().catch(() => {});
    activeId = id;
    onChange(id);
  }

  // Applies live, so dragging the slider fades the currently playing
  // track in/out, and also sets the level new tracks will start at.
  function setMusicVolume(v) {
    musicVolume = Math.max(0, Math.min(1, v));
    TRACKS.forEach((track) => {
      track.audio.volume = musicVolume;
    });
  }

  return {
    unlock,
    playBuzzer,
    playHorn,
    playWarningBeep,
    TRACKS,
    toggleTrack,
    stopMusic,
    isPlaying,
    setMusicVolume,
  };
})();

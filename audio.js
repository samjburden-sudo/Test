// All sounds are synthesized in-browser with the Web Audio API.
// No audio files / no copyrighted recordings are used anywhere in this app.

const RinkAudio = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function noiseBuffer(ac, duration) {
    const buf = ac.createBuffer(1, ac.sampleRate * duration, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // --- Core "instrument" helpers -------------------------------------

  function tone(ac, { freq, start, duration, type = "sine", gain = 0.3, attack = 0.01, release = 0.08, detune = 0 }) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    osc.detune.setValueAtTime(detune, start);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + attack);
    g.gain.setValueAtTime(gain, Math.max(start + attack, start + duration - release));
    g.gain.linearRampToValueAtTime(0, start + duration);
    osc.connect(g).connect(ac.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function clap(ac, start, gain = 0.5) {
    const dur = 0.12;
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac, dur);
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1500;
    bp.Q.value = 1.2;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    src.connect(bp).connect(g).connect(ac.destination);
    src.start(start);
    src.stop(start + dur + 0.02);
  }

  function stomp(ac, start, gain = 0.6) {
    const dur = 0.18;
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, start);
    osc.frequency.exponentialRampToValueAtTime(45, start + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function bell(ac, start, freq, gain = 0.25) {
    const dur = 0.8;
    [1, 2.4, 3.9].forEach((mult, i) => {
      tone(ac, { freq: freq * mult, start, duration: dur, type: "sine", gain: gain / (i + 1), attack: 0.005, release: dur * 0.8 });
    });
  }

  // --- Signature sounds -------------------------------------------------

  function playBuzzer() {
    const ac = getCtx();
    const t0 = ac.currentTime + 0.02;
    // Two short harsh pulses, detuned square waves.
    [0, 0.35].forEach((offset) => {
      tone(ac, { freq: 185, start: t0 + offset, duration: 0.3, type: "sawtooth", gain: 0.35, attack: 0.005, release: 0.05, detune: 0 });
      tone(ac, { freq: 190, start: t0 + offset, duration: 0.3, type: "square", gain: 0.28, attack: 0.005, release: 0.05, detune: -8 });
    });
  }

  function playHorn() {
    const ac = getCtx();
    const t0 = ac.currentTime + 0.02;
    const dur = 1.7;
    tone(ac, { freq: 233, start: t0, duration: dur, type: "sawtooth", gain: 0.3, attack: 0.15, release: 0.3 });
    tone(ac, { freq: 349, start: t0, duration: dur, type: "sawtooth", gain: 0.22, attack: 0.15, release: 0.3, detune: -6 });
    tone(ac, { freq: 117, start: t0, duration: dur, type: "square", gain: 0.18, attack: 0.15, release: 0.3 });
  }

  function playWarningBeep() {
    const ac = getCtx();
    const t0 = ac.currentTime + 0.01;
    tone(ac, { freq: 1000, start: t0, duration: 0.12, type: "sine", gain: 0.25, attack: 0.005, release: 0.04 });
  }

  // --- 10 original "classic arena" style stings, looped while active ---

  const TRACKS = [
    {
      id: "charge-organ",
      name: "Charge! Organ",
      bpm: 140,
      bars: (ac, t0, beat) => {
        const notes = [261.6, 329.6, 392.0, 523.3, 392.0, 329.6];
        notes.forEach((f, i) => tone(ac, { freq: f, start: t0 + i * beat * 0.5, duration: beat * 0.45, type: "square", gain: 0.22 }));
      },
      loopBeats: 3,
    },
    {
      id: "fight-chant",
      name: "Let's Go Chant",
      bpm: 128,
      bars: (ac, t0, beat) => {
        [392.0, 392.0, 440.0, 392.0].forEach((f, i) => tone(ac, { freq: f, start: t0 + i * beat, duration: beat * 0.6, type: "square", gain: 0.24 }));
        [0, 1, 2, 3].forEach((i) => clap(ac, t0 + i * beat + beat * 0.65, 0.35));
      },
      loopBeats: 4,
    },
    {
      id: "rock-stomp-clap",
      name: "Rock Stomp & Clap",
      bpm: 114,
      bars: (ac, t0, beat) => {
        stomp(ac, t0, 0.6);
        stomp(ac, t0 + beat, 0.6);
        clap(ac, t0 + beat * 2, 0.55);
      },
      loopBeats: 3,
    },
    {
      id: "trumpet-fanfare",
      name: "Trumpet Fanfare",
      bpm: 132,
      bars: (ac, t0, beat) => {
        const notes = [392.0, 392.0, 392.0, 523.3];
        notes.forEach((f, i) => tone(ac, { freq: f, start: t0 + i * beat * 0.5, duration: beat * 0.4, type: "sawtooth", gain: 0.2 }));
      },
      loopBeats: 2.5,
    },
    {
      id: "power-chord-anthem",
      name: "Power Chord Anthem",
      bpm: 120,
      bars: (ac, t0, beat) => {
        const roots = [110, 110, 146.8, 130.8];
        roots.forEach((f, i) => {
          tone(ac, { freq: f, start: t0 + i * beat, duration: beat * 0.9, type: "sawtooth", gain: 0.18 });
          tone(ac, { freq: f * 1.5, start: t0 + i * beat, duration: beat * 0.9, type: "sawtooth", gain: 0.14 });
        });
      },
      loopBeats: 4,
    },
    {
      id: "cowbell-bounce",
      name: "Cowbell Bounce",
      bpm: 150,
      bars: (ac, t0, beat) => {
        for (let i = 0; i < 4; i++) {
          tone(ac, { freq: 800, start: t0 + i * beat * 0.5, duration: 0.06, type: "square", gain: 0.18, attack: 0.002, release: 0.03 });
        }
      },
      loopBeats: 2,
    },
    {
      id: "horn-section-hit",
      name: "Horn Section Hit",
      bpm: 118,
      bars: (ac, t0, beat) => {
        [329.6, 415.3, 493.9].forEach((f) => tone(ac, { freq: f, start: t0, duration: beat * 0.5, type: "sawtooth", gain: 0.16 }));
        [329.6, 415.3, 493.9].forEach((f) => tone(ac, { freq: f, start: t0 + beat * 1.5, duration: beat * 0.5, type: "sawtooth", gain: 0.16 }));
      },
      loopBeats: 3,
    },
    {
      id: "synth-rally-siren",
      name: "Synth Rally Siren",
      bpm: 100,
      bars: (ac, t0, beat) => {
        const osc = getCtx().createOscillator();
        const g = getCtx().createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, t0);
        osc.frequency.linearRampToValueAtTime(700, t0 + beat);
        osc.frequency.linearRampToValueAtTime(300, t0 + beat * 2);
        g.gain.setValueAtTime(0.18, t0);
        g.gain.setValueAtTime(0.18, t0 + beat * 2 - 0.05);
        g.gain.linearRampToValueAtTime(0, t0 + beat * 2);
        osc.connect(g).connect(getCtx().destination);
        osc.start(t0);
        osc.stop(t0 + beat * 2 + 0.02);
      },
      loopBeats: 2,
    },
    {
      id: "drum-line-battle",
      name: "Drum Line Battle",
      bpm: 160,
      bars: (ac, t0, beat) => {
        stomp(ac, t0, 0.5);
        stomp(ac, t0 + beat * 0.5, 0.3);
        stomp(ac, t0 + beat, 0.5);
        clap(ac, t0 + beat * 1.5, 0.45);
      },
      loopBeats: 2,
    },
    {
      id: "bell-tower-charge",
      name: "Bell Tower Charge",
      bpm: 126,
      bars: (ac, t0, beat) => {
        [523.3, 659.3, 784.0].forEach((f, i) => bell(ac, t0 + i * beat * 0.6, f, 0.22));
      },
      loopBeats: 2,
    },
  ];

  let activeLoop = null; // { id, timerId }

  function stopMusic() {
    if (activeLoop) {
      clearInterval(activeLoop.timerId);
      activeLoop = null;
    }
  }

  function isPlaying(id) {
    return !!activeLoop && activeLoop.id === id;
  }

  function toggleTrack(id, onChange) {
    if (isPlaying(id)) {
      stopMusic();
      onChange(null);
      return;
    }
    stopMusic();
    const track = TRACKS.find((t) => t.id === id);
    if (!track) return;
    const ac = getCtx();
    const beat = 60 / track.bpm;
    const loopSeconds = beat * track.loopBeats;

    const playOnce = () => {
      const t0 = ac.currentTime + 0.05;
      track.bars(ac, t0, beat);
    };
    playOnce();
    const timerId = setInterval(playOnce, loopSeconds * 1000);
    activeLoop = { id, timerId };
    onChange(id);
  }

  return {
    getCtx,
    playBuzzer,
    playHorn,
    playWarningBeep,
    TRACKS,
    toggleTrack,
    stopMusic,
    isPlaying,
  };
})();

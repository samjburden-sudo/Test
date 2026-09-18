(() => {
  const el = {
    periodLength: document.getElementById("periodLength"),
    periodShiftInfo: document.getElementById("periodShiftInfo"),
    shiftInterval: document.getElementById("shiftInterval"),
    shiftIntervalValue: document.getElementById("shiftIntervalValue"),
    warningBeep: document.getElementById("warningBeep"),
    playBuzzer: document.getElementById("playBuzzer"),
    playHorn: document.getElementById("playHorn"),
    timerCard: document.getElementById("timerCard"),
    timerStatus: document.getElementById("timerStatus"),
    timerClock: document.getElementById("timerClock"),
    timerSub: document.getElementById("timerSub"),
    restartBtn: document.getElementById("restartBtn"),
    setExactTime: document.getElementById("setExactTime"),
    setExactBtn: document.getElementById("setExactBtn"),
    musicGrid: document.getElementById("musicGrid"),
    stopMusic: document.getElementById("stopMusic"),
  };

  const state = {
    periodMinutes: 20,
    shiftSeconds: 60,
    warningBeepEnabled: true,
    isRunning: false,
    shiftRemaining: 60, // seconds, float
    periodElapsed: 0, // seconds, float
    shiftNumber: 1,
    warningFiredForThisShift: false,
    lastTickAt: null,
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function fmt(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  function updatePeriodShiftInfo() {
    const totalShifts = Math.max(1, Math.round((state.periodMinutes * 60) / state.shiftSeconds));
    el.periodShiftInfo.textContent = `~${totalShifts} shifts`;
  }

  function render() {
    el.timerStatus.textContent = state.isRunning ? "Running" : "Paused";
    el.timerCard.classList.toggle("running", state.isRunning);
    el.timerClock.textContent = fmt(state.shiftRemaining);
    const periodTotal = state.periodMinutes * 60;
    el.timerSub.textContent = `Shift ${state.shiftNumber} · ${fmt(state.periodElapsed)} of ${fmt(periodTotal)}`;
  }

  function resetShift(carryOverflow) {
    const overflow = carryOverflow ? Math.max(0, -state.shiftRemaining) : 0;
    state.shiftRemaining = state.shiftSeconds - overflow;
    state.warningFiredForThisShift = false;
  }

  function restart() {
    state.isRunning = false;
    state.periodElapsed = 0;
    state.shiftNumber = 1;
    state.shiftRemaining = state.shiftSeconds;
    state.warningFiredForThisShift = false;
    state.lastTickAt = null;
    render();
  }

  function toggleRunning() {
    state.isRunning = !state.isRunning;
    state.lastTickAt = state.isRunning ? performance.now() : null;
    // Unlock/resume audio context on this user gesture.
    RinkAudio.getCtx();
    render();
  }

  function adjustShiftRemaining(delta) {
    state.shiftRemaining = clamp(state.shiftRemaining + delta, 0, state.shiftSeconds * 3);
    state.warningFiredForThisShift = state.shiftRemaining > 3 ? false : state.warningFiredForThisShift;
    render();
  }

  function setExactRemaining(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    state.shiftRemaining = seconds;
    state.warningFiredForThisShift = seconds > 3;
    render();
  }

  function tick() {
    if (!state.isRunning) return;
    const now = performance.now();
    const delta = state.lastTickAt ? (now - state.lastTickAt) / 1000 : 0;
    state.lastTickAt = now;

    state.periodElapsed += delta;
    state.shiftRemaining -= delta;

    if (state.warningBeepEnabled && !state.warningFiredForThisShift && state.shiftRemaining <= 3 && state.shiftRemaining > 0) {
      state.warningFiredForThisShift = true;
      RinkAudio.playWarningBeep();
    }

    if (state.shiftRemaining <= 0) {
      RinkAudio.playBuzzer();
      state.shiftNumber += 1;
      resetShift(true);
    }

    const periodTotal = state.periodMinutes * 60;
    if (state.periodElapsed >= periodTotal) {
      state.isRunning = false;
      state.lastTickAt = null;
      state.periodElapsed = periodTotal;
      RinkAudio.playHorn();
    }

    render();
  }

  // --- Wiring ---------------------------------------------------------

  el.periodLength.addEventListener("change", () => {
    const v = clamp(parseInt(el.periodLength.value, 10) || 20, 1, 90);
    el.periodLength.value = v;
    state.periodMinutes = v;
    updatePeriodShiftInfo();
    render();
  });

  document.querySelectorAll(".step-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const delta = parseInt(btn.dataset.delta, 10);
      const v = clamp((parseInt(el.periodLength.value, 10) || 20) + delta, 1, 90);
      el.periodLength.value = v;
      state.periodMinutes = v;
      updatePeriodShiftInfo();
      render();
    });
  });

  el.shiftInterval.addEventListener("input", () => {
    const v = parseInt(el.shiftInterval.value, 10);
    state.shiftSeconds = v;
    el.shiftIntervalValue.textContent = `${v}s`;
    updatePeriodShiftInfo();
    if (!state.isRunning) {
      state.shiftRemaining = v;
      render();
    }
  });

  el.warningBeep.addEventListener("change", () => {
    state.warningBeepEnabled = el.warningBeep.checked;
  });

  el.playBuzzer.addEventListener("click", () => RinkAudio.playBuzzer());
  el.playHorn.addEventListener("click", () => RinkAudio.playHorn());

  el.timerCard.addEventListener("click", toggleRunning);

  document.querySelectorAll(".nudge-btn").forEach((btn) => {
    btn.addEventListener("click", () => adjustShiftRemaining(parseInt(btn.dataset.adjust, 10)));
  });

  el.setExactBtn.addEventListener("click", () => {
    const v = parseFloat(el.setExactTime.value);
    setExactRemaining(v);
    el.setExactTime.value = "";
  });

  el.restartBtn.addEventListener("click", restart);

  // --- Music grid -------------------------------------------------------

  RinkAudio.TRACKS.forEach((track) => {
    const btn = document.createElement("button");
    btn.className = "track-btn";
    btn.textContent = track.name;
    btn.dataset.id = track.id;
    btn.addEventListener("click", () => {
      RinkAudio.toggleTrack(track.id, (playingId) => {
        document.querySelectorAll(".track-btn").forEach((b) => {
          b.classList.toggle("playing", b.dataset.id === playingId);
          b.textContent = b.dataset.id === playingId
            ? `${RinkAudio.TRACKS.find((t) => t.id === b.dataset.id).name} ■ Stop`
            : RinkAudio.TRACKS.find((t) => t.id === b.dataset.id).name;
        });
      });
    });
    el.musicGrid.appendChild(btn);
  });

  el.stopMusic.addEventListener("click", () => {
    RinkAudio.stopMusic();
    document.querySelectorAll(".track-btn").forEach((b) => {
      b.classList.remove("playing");
      b.textContent = RinkAudio.TRACKS.find((t) => t.id === b.dataset.id).name;
    });
  });

  // --- Init ---------------------------------------------------------

  updatePeriodShiftInfo();
  render();
  setInterval(tick, 100);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();

const AudioHapticsModule = (() => {
      let audioCtx = null;
      let reverbNode = null;
      let masterCompressor = null;
      let activeOmCleanup = null;
      let syllableTimers = [];
      let droneState = { active: false, timer: null, nodes: [] };

      function ensureContext() {
        if (!audioCtx) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx) {
            audioCtx = new Ctx();
            setupSacredAcoustics(audioCtx);
          }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        return audioCtx;
      }

      // Build velvety Temple Sanctum Convolver Reverb & transparent limiter
      function setupSacredAcoustics(ctx) {
        try {
          masterCompressor = ctx.createDynamicsCompressor();
          masterCompressor.threshold.setValueAtTime(-12, ctx.currentTime);
          masterCompressor.knee.setValueAtTime(14, ctx.currentTime);
          masterCompressor.ratio.setValueAtTime(3.0, ctx.currentTime);
          masterCompressor.attack.setValueAtTime(0.01, ctx.currentTime);
          masterCompressor.release.setValueAtTime(0.25, ctx.currentTime);
          masterCompressor.connect(ctx.destination);

          // Warm low-pass stone sanctum impulse response (no metallic high-frequency ring)
          const sampleRate = ctx.sampleRate;
          const length = Math.floor(sampleRate * 2.1);
          const impulse = ctx.createBuffer(2, length, sampleRate);
          for (let ch = 0; ch < 2; ch++) {
            const data = impulse.getChannelData(ch);
            let lp1 = 0, lp2 = 0;
            for (let i = 0; i < length; i++) {
              const t = i / sampleRate;
              const white = Math.random() * 2 - 1;
              lp1 = lp1 * 0.92 + white * 0.08;
              lp2 = lp2 * 0.92 + lp1 * 0.08;
              const env = Math.exp(-t * 2.4) * Math.sin(Math.min(1, t * 25) * Math.PI * 0.5);
              data[i] = lp2 * env * 0.35;
            }
          }
          reverbNode = ctx.createConvolver();
          reverbNode.buffer = impulse;
          const reverbGain = ctx.createGain();
          reverbGain.gain.setValueAtTime(0.38, ctx.currentTime);
          reverbNode.connect(reverbGain);
          reverbGain.connect(masterCompressor);
        } catch (err) {
          console.error('Acoustics init fallback:', err);
        }
      }

      function updateSyllableIndicator(text, active = true) {
        const pill = document.getElementById('omSyllableText');
        const dot = document.getElementById('omResonanceDot');
        if (pill) pill.textContent = text;
        if (dot) {
          dot.className = active
            ? 'w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping'
            : 'w-1.5 h-1.5 rounded-full bg-amber-400';
        }
      }

      /**
       * Pure-Sine Additive Vocal Choir + Tibetan Kansya Singing Bowl ("OM" / अ-उ-म्)
       * Why this sounds organic & soothing (zero machine buzz):
       * - Uses ONLY pure sine waves (no buzzy sawtooth/PeriodicWave high harmonics, no 5Hz LFO vibrato,
       *   and no physical phone motor vibration during Om chant).
       * - Each harmonic (f0=136.1Hz Sadja, 2f0, 3f0, 4f0, 5f0) has its own independent smooth envelope
       *   that naturally traces the human vowel shift:
       *     1) "अ (Aaa)" [0 -> 35%]: warm 3rd, 4th & 5th pure sine harmonics bloom gently
       *     2) "उ (Uuu)" [35% -> 65%]: upper harmonics melt away into rounded 1st & 2nd sines
       *     3) "म् (Mmmm)" [65% -> 100%]: pure 136.1Hz + 136.5Hz binaural silk hum + Kansya singing bowl shimmer
       */
      function synthesizePureResonantOm(ctx, durationSec = 2.1, isGrand = false) {
        const now = ctx.currentTime;
        const outDest = masterCompressor || ctx.destination;

        // Smoothly cross-fade any prior per-bead Om voice so rapid taps never stack into mud
        if (activeOmCleanup && !isGrand) {
          try { activeOmCleanup(now); } catch (e) {}
        }

        const voiceMaster = ctx.createGain();
        const masterLevel = isGrand ? 0.44 : 0.36;
        voiceMaster.gain.setValueAtTime(0.0005, now);
        voiceMaster.gain.linearRampToValueAtTime(masterLevel, now + 0.18);
        voiceMaster.gain.setValueAtTime(masterLevel * 0.92, now + durationSec * 0.55);
        voiceMaster.gain.exponentialRampToValueAtTime(0.0004, now + durationSec);

        voiceMaster.connect(outDest);
        if (reverbNode) voiceMaster.connect(reverbNode);

        // Sacred 136.1 Hz Sadja root (C#3 Cosmic Pranava)
        const f0 = 136.1;
        const tAttack = now + 0.18;
        const tU = now + durationSec * 0.38;
        const tM = now + durationSec * 0.66;
        const tEnd = now + durationSec;

        // Pure Sine Additive Partials with vowel-morphing amplitude contours
        // Notice: ONLY pure 'sine' waves with natural 0.4 Hz acoustic beating (no mechanical LFO!)
        const partials = [
          // Deep warm sub-octave foundation (68.05 Hz)
          { freq: f0 * 0.5, aAmp: 0.14, uAmp: 0.18, mAmp: 0.20 },
          // Primary Sadja fundamental (136.1 Hz)
          { freq: f0,       aAmp: 0.46, uAmp: 0.54, mAmp: 0.58 },
          // Twin unison voice (+0.45 Hz creates a slow, meditative 2.2-second acoustic wave shimmer)
          { freq: f0 + 0.45,aAmp: 0.32, uAmp: 0.38, mAmp: 0.42 },
          // 2nd Harmonic (272.2 Hz Octave — strong in 'A' and 'U', gentle in 'M')
          { freq: f0 * 2,   aAmp: 0.28, uAmp: 0.32, mAmp: 0.11 },
          // 3rd Harmonic (408.3 Hz Panchama Fifth — blooms in 'Aaa', softens in 'Uuu', silent in 'M')
          { freq: f0 * 3,   aAmp: 0.22, uAmp: 0.10, mAmp: 0.025 },
          // 4th Harmonic (544.4 Hz — gives open vowel warmth only during initial 'Aaa')
          { freq: f0 * 4,   aAmp: 0.14, uAmp: 0.03, mAmp: 0.002 },
          // 5th Harmonic (680.5 Hz — gentle first-formant peak for 'Aaa' only)
          { freq: f0 * 5,   aAmp: 0.08, uAmp: 0.008, mAmp: 0.001 }
        ];

        const oscList = [];
        partials.forEach(p => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          // Very gentle natural human pitch breath: starts 1.5 Hz below and settles into f0
          osc.frequency.setValueAtTime(p.freq * 0.992, now);
          osc.frequency.exponentialRampToValueAtTime(p.freq, now + 0.14);

          g.gain.setValueAtTime(0.0002, now);
          g.gain.linearRampToValueAtTime(p.aAmp, tAttack);
          g.gain.linearRampToValueAtTime(p.uAmp, tU);
          g.gain.linearRampToValueAtTime(p.mAmp, tM);
          g.gain.exponentialRampToValueAtTime(0.0002, tEnd);

          osc.connect(g);
          g.connect(voiceMaster);
          osc.start(now);
          osc.stop(tEnd + 0.06);
          oscList.push(osc);
        });

        // Crystalline Kansya (Tibetan / Vedic Bell-Metal) Singing Bowl strike & sustain
        // Inharmonic bell-metal modes: 1.0, 2.756 (softened to pure consonance 1.5x & 3.0x & 4.0x)
        const bowlModes = isGrand
          ? [
              { f: 272.2,  amp: 0.09, decay: durationSec * 0.95 },
              { f: 408.3,  amp: 0.075, decay: durationSec * 0.90 },
              { f: 544.4,  amp: 0.045, decay: durationSec * 0.75 },
              { f: 816.6,  amp: 0.028, decay: durationSec * 0.60 }
            ]
          : [
              { f: 272.2,  amp: 0.065, decay: durationSec * 0.90 },
              { f: 408.3,  amp: 0.050, decay: durationSec * 0.80 },
              { f: 544.4,  amp: 0.025, decay: durationSec * 0.65 }
            ];

        bowlModes.forEach(bm => {
          const bOsc = ctx.createOscillator();
          const bGain = ctx.createGain();
          bOsc.type = 'sine';
          bOsc.frequency.setValueAtTime(bm.f, now);
          bGain.gain.setValueAtTime(0.0002, now);
          // Wooden mallet soft bloom
          bGain.gain.linearRampToValueAtTime(bm.amp, now + 0.06);
          bGain.gain.exponentialRampToValueAtTime(0.0002, now + bm.decay);
          bOsc.connect(bGain);
          bGain.connect(outDest);
          if (reverbNode) bGain.connect(reverbNode);
          bOsc.start(now);
          bOsc.stop(now + bm.decay + 0.05);
          oscList.push(bOsc);
        });

        // Update live visual A -> U -> M indicator on the counter screen
        syllableTimers.forEach(clearTimeout);
        syllableTimers = [];
        updateSyllableIndicator('ॐ  अ (Aaa — Creation)', true);
        syllableTimers.push(setTimeout(() => {
          updateSyllableIndicator('ॐ  उ (Uuu — Preservation)', true);
        }, Math.round(durationSec * 340)));
        syllableTimers.push(setTimeout(() => {
          updateSyllableIndicator('ॐ  म् (Mmmm — Nada Silence)', true);
        }, Math.round(durationSec * 640)));
        syllableTimers.push(setTimeout(() => {
          updateSyllableIndicator(droneState.active ? 'ॐ Nada Drone Active (136.1 Hz)' : '136.1 Hz Kansya & Pranava', droneState.active);
        }, Math.round(durationSec * 980)));

        if (!isGrand) {
          activeOmCleanup = (fadeTime) => {
            voiceMaster.gain.cancelScheduledValues(fadeTime);
            voiceMaster.gain.setValueAtTime(Math.max(0.0005, voiceMaster.gain.value), fadeTime);
            voiceMaster.gain.exponentialRampToValueAtTime(0.0002, fadeTime + 0.12);
          };
        }
      }

      function playBeadClick(mode) {
        if (mode === 'mute') return;
        const ctx = ensureContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const outDest = masterCompressor || ctx.destination;

        if (mode === 'bead') {
          try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
          // Warm wooden Rudraksha bead click
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(310, now);
          osc.frequency.exponentialRampToValueAtTime(105, now + 0.042);
          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
          osc.connect(gain);
          gain.connect(outDest);
          osc.start(now);
          osc.stop(now + 0.05);
        } else if (mode === 'bell') {
          try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
          // Soft brass temple ghanti chime
          const freqs = [523.25, 1046.5, 1567.98];
          freqs.forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now);
            gain.gain.setValueAtTime(0.11 / (idx + 1), now);
            gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.55);
            osc.connect(gain);
            gain.connect(outDest);
            if (reverbNode) gain.connect(reverbNode);
            osc.start(now);
            osc.stop(now + 0.58);
          });
        } else if (mode === 'om') {
          // Pure-Sine Additive A-U-M Choir + Kansya Singing Bowl (NO phone vibration motor buzz!)
          synthesizePureResonantOm(ctx, 1.95, false);
        }
      }

      function playMalaCompletionBell(mode) {
        if (mode === 'mute') return;
        const ctx = ensureContext();
        if (!ctx) return;
        synthesizePureResonantOm(ctx, 3.2, true);
      }

      // Continuous meditative 136.1Hz Tanpura & Singing Bowl Drone + slow 3.8s A-U-M waves
      function toggleOmDrone() {
        const ctx = ensureContext();
        if (!ctx) return false;

        if (droneState.active) {
          droneState.active = false;
          if (droneState.timer) {
            clearInterval(droneState.timer);
            droneState.timer = null;
          }
          const now = ctx.currentTime;
          droneState.nodes.forEach(n => {
            try {
              if (n.gain) {
                n.gain.cancelScheduledValues(now);
                n.gain.setValueAtTime(Math.max(0.0005, n.gain.value), now);
                n.gain.exponentialRampToValueAtTime(0.0002, now + 0.35);
              }
              if (n.osc) n.osc.stop(now + 0.4);
            } catch (e) {}
          });
          droneState.nodes = [];
          updateSyllableIndicator('136.1 Hz Kansya & Pranava', false);
          return false;
        } else {
          droneState.active = true;
          const now = ctx.currentTime;
          const outDest = masterCompressor || ctx.destination;
          // Velvety pure-sine Sa-Pa-Sa Tanpura ambient bed (zero buzz)
          const droneFreqs = [
            { f: 68.05,  amp: 0.04 },
            { f: 136.1,  amp: 0.065 },
            { f: 136.45, amp: 0.045 },
            { f: 204.15, amp: 0.032 }
          ];
          droneFreqs.forEach(df => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(df.f, now);
            g.gain.setValueAtTime(0.0005, now);
            g.gain.linearRampToValueAtTime(df.amp, now + 1.1);
            osc.connect(g);
            g.connect(outDest);
            osc.start(now);
            droneState.nodes.push({ osc, gain: g });
          });

          synthesizePureResonantOm(ctx, 3.8, true);
          droneState.timer = setInterval(() => {
            if (droneState.active && audioCtx) {
              synthesizePureResonantOm(audioCtx, 3.8, true);
            }
          }, 5000);
          return true;
        }
      }

      return {
        playBeadClick,
        playMalaCompletionBell,
        toggleOmDrone,
        isDroneActive: () => droneState.active
      };
    })();

    /**
     * ============================================================================
     * MODULE 5: AnalyticsModule — Historical Counters, Charts & Sadhana Insights
     * ============================================================================
     */
    
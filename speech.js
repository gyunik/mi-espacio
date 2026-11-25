/**
 * speech.js — Módulo de Voz y Notas de Audio (Web Speech API + MediaRecorder API)
 * - TTS en español (es-AR / es-ES con fallback) para la voz del usuario.
 * - Grabación y reproducción de notas de voz para tarjetas de familiares o terapeutas.
 */

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window
  ? window.speechSynthesis
  : null;

let cachedVoices = [];
let activeUtteranceId = 0;
let activeAudioElement = null;
let activeAudioCleanup = null;

/**
 * Obtiene las voces en español ordenadas por prioridad (es-AR, es-ES, es-419, etc.).
 * @returns {SpeechSynthesisVoice[]}
 */
export function getSpanishVoices() {
  if (!synth) return [];

  const allVoices = synth.getVoices();
  if (allVoices.length > 0) {
    cachedVoices = allVoices;
  }

  const spanishVoices = cachedVoices.filter(
    (v) => v.lang && v.lang.toLowerCase().startsWith('es')
  );

  const priority = (voice) => {
    const lang = voice.lang.toLowerCase();
    const name = voice.name.toLowerCase();
    let score = 0;

    // Priorizar español rioplatense y latinoamericano antes que es-ES
    if (lang === 'es-ar') score += 100;
    else if (lang === 'es-uy') score += 90;
    else if (lang === 'es-419' || lang === 'es-la') score += 75;
    else if (lang === 'es-us' || lang === 'es-mx' || lang === 'es-cl' || lang === 'es-co') score += 65;
    else if (lang !== 'es-es') score += 50;
    else score += 10; // es-ES queda como último recurso

    if (
      name.includes('elena') ||
      name.includes('tomas') ||
      name.includes('natural') ||
      name.includes('online') ||
      name.includes('google')
    ) {
      score += 20;
    }
    if (voice.localService) score += 5;
    return score;
  };

  return spanishVoices.sort((a, b) => priority(b) - priority(a));
}

/**
 * Inicializa el detector de voces (asíncrono en Chrome/Android).
 * @param {Function} [onVoicesReady]
 */
export function initSpeech(onVoicesReady) {
  if (!synth) return;

  const notify = () => {
    const voices = getSpanishVoices();
    if (typeof onVoicesReady === 'function') {
      onVoicesReady(voices);
    }
  };

  notify();
  if ('onvoiceschanged' in synth) {
    synth.onvoiceschanged = notify;
  }
}

/**
 * Detiene cualquier locución TTS o nota de voz en reproducción.
 */
export function stopAllAudio() {
  activeUtteranceId += 1;
  if (synth) {
    synth.cancel();
  }
  if (typeof activeAudioCleanup === 'function') {
    const cleanup = activeAudioCleanup;
    activeAudioCleanup = null;
    cleanup();
  } else if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement = null;
  }
}

/**
 * Reproduce un texto mediante Web Speech API y resuelve al finalizar.
 * @param {string} text
 * @param {Object} [options]
 * @returns {Promise<void>}
 */
export function speak(text, options = {}) {
  const cleanText = (text || '').trim();
  if (!cleanText || !synth) {
    return Promise.resolve();
  }

  stopAllAudio();
  const currentId = activeUtteranceId;

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = getSpanishVoices();

    let selectedVoice = null;
    if (options.voiceURI) {
      selectedVoice = voices.find((v) => v.voiceURI === options.voiceURI) || null;
    }
    if (!selectedVoice && voices.length > 0) {
      selectedVoice = voices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = 'es-AR';
    }

    utterance.rate = typeof options.rate === 'number' ? options.rate : 0.95;
    utterance.pitch = typeof options.pitch === 'number' ? options.pitch : 1.0;
    utterance.volume = 1.0;

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    // Respaldo de seguridad para navegadores móviles
    const estimatedMs = Math.max(2500, cleanText.length * 110 + 1200);
    setTimeout(() => {
      if (activeUtteranceId === currentId) {
        finish();
      }
    }, estimatedMs);

    try {
      synth.speak(utterance);
    } catch {
      finish();
    }
  });
}

/**
 * Reproduce una nota de voz grabada (DataURL / Base64).
 * Opcionalmente entrega 5 niveles de frecuencia en tiempo real (0..1) vía options.onLevels
 * para animar las barras del visualizador durante la reproducción.
 * @param {string} dataUrl
 * @param {Object} [options]
 * @param {Function} [options.onLevels]
 * @param {Function} [options.onFallbackPulse]
 * @returns {Promise<void>}
 */
export function playAudioDataUrl(dataUrl, options = {}) {
  if (!dataUrl) return Promise.resolve();
  stopAllAudio();

  return new Promise((resolve) => {
    const audio = new Audio(dataUrl);
    activeAudioElement = audio;

    let settled = false;
    let rafId = null;
    let ctx = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => {});
        ctx = null;
      }
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
      if (activeAudioElement === audio) {
        activeAudioElement = null;
      }
      if (activeAudioCleanup === finish) {
        activeAudioCleanup = null;
      }
      resolve();
    };

    activeAudioCleanup = finish;

    if (typeof options.onLevels === 'function') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          const source = ctx.createMediaElementSource(audio);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 128;
          analyser.smoothingTimeConstant = 0.72;
          source.connect(analyser);
          analyser.connect(ctx.destination);

          const data = new Uint8Array(analyser.frequencyBinCount);
          const binIndices = [2, 5, 9, 14, 20];

          const tick = () => {
            if (settled) return;
            analyser.getByteFrequencyData(data);
            const levels = binIndices.map((idx) => Math.min(1, (data[idx] || 0) / 160));
            options.onLevels(levels);
            rafId = requestAnimationFrame(tick);
          };
          tick();
        } catch {
          options.onFallbackPulse?.();
        }
      } else {
        options.onFallbackPulse?.();
      }
    }

    audio.onended = finish;
    audio.onerror = finish;
    audio.play().catch(finish);
  });
}

/**
 * Reproduce la tarjeta: usa nota de voz si existe y se solicita, o TTS por defecto.
 * @param {Object} card
 * @param {Object} [options]
 * @returns {Promise<void>}
 */
export function speakCard(card, options = {}) {
  if (card?.audioData && options.preferVoiceNote !== false) {
    return playAudioDataUrl(card.audioData);
  }
  return speak(card?.text || '', options);
}

/**
 * Verifica soporte de grabación con MediaRecorder API.
 * @returns {boolean}
 */
export function isAudioRecordingSupported() {
  return Boolean(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}

/**
 * Inicia una grabación de nota de voz usando MediaRecorder API.
 * Devuelve un controlador con método stop() que resuelve con un DataURL (Base64).
 * @returns {Promise<{ stop: () => Promise<string> }>}
 */
export async function startVoiceRecording() {
  if (!isAudioRecordingSupported()) {
    throw new Error('La grabación de audio no está soportada en este navegador.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = MediaRecorder.isTypeSupported('audio/webm')
    ? 'audio/webm'
    : 'audio/mp4';

  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);

  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.start();

  return {
    stream,
    stop: () =>
      new Promise((resolve, reject) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('No se pudo procesar el audio grabado.'));
          reader.readAsDataURL(blob);
        };
        recorder.onerror = (err) => {
          stream.getTracks().forEach((track) => track.stop());
          reject(err);
        };
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      })
  };
}

/**
 * Conecta un analizador de volumen en tiempo real al stream del micrófono
 * y entrega 5 niveles normalizados (0..1) para animar barras de voz.
 */
export function createVoiceLevelMeter(stream, onLevels) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx || !stream) return { stop: () => {} };

  let rafId = null;
  let stopped = false;
  let ctx = null;

  try {
    ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.72;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    // 5 bandas distribuidas en frecuencias de voz humana
    const binIndices = [2, 5, 9, 14, 20];

    const tick = () => {
      if (stopped) return;
      analyser.getByteFrequencyData(data);
      const levels = binIndices.map((idx) => Math.min(1, (data[idx] || 0) / 170));
      onLevels(levels);
      rafId = requestAnimationFrame(tick);
    };
    tick();
  } catch {
    return { stop: () => {} };
  }

  return {
    stop: () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    }
  };
}

/**
 * Inicia transcripción de voz en vivo (Web Speech Recognition API) en español.
 * Devuelve un controlador con método stop(), o null si el navegador no lo soporta.
 * @param {Object} options
 * @param {string} [options.lang='es-AR']
 * @param {Function} [options.onStart]
 * @param {Function} [options.onUpdate] Recibe el texto transcrito acumulado
 * @param {Function} [options.onError]
 * @param {Function} [options.onEnd]
 */
export function startLiveTranscript({ lang = 'es-AR', onStart, onUpdate, onError, onEnd } = {}) {
  const Recognition =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  if (!Recognition) {
    onError?.('unsupported');
    return null;
  }

  let stoppedManually = false;
  let activeLang = lang;
  let rec = null;
  let committedText = '';
  let lastError = null;

  const createAndStart = () => {
    rec = new Recognition();
    rec.lang = activeLang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      onStart?.();
    };

    rec.onresult = (event) => {
      let sessionFinal = '';
      let sessionInterim = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const piece = (event.results[i][0]?.transcript || '').trim();
        if (!piece) continue;
        if (event.results[i].isFinal) {
          sessionFinal = sessionFinal ? `${sessionFinal} ${piece}` : piece;
        } else {
          sessionInterim = sessionInterim ? `${sessionInterim} ${piece}` : piece;
        }
      }
      const combined = [committedText, sessionFinal, sessionInterim].filter(Boolean).join(' ').trim();
      if (typeof onUpdate === 'function') {
        onUpdate(combined);
      }
    };

    rec.onerror = (event) => {
      lastError = event.error || 'unknown';
      console.warn('[SpeechRecognition] error:', lastError);
      if (lastError === 'language-not-supported' && activeLang !== 'es-ES') {
        activeLang = 'es-ES';
        return;
      }
      if (lastError !== 'no-speech' && lastError !== 'aborted') {
        onError?.(lastError);
      }
    };

    rec.onend = () => {
      if (stoppedManually) return;
      if (lastError === 'language-not-supported' && activeLang === 'es-ES') {
        lastError = null;
        try {
          createAndStart();
          return;
        } catch {}
      }
      onEnd?.();
    };

    rec.start();
  };

  try {
    createAndStart();
  } catch (err) {
    onError?.(err?.message || 'start-failed');
    return null;
  }

  return {
    stop: () => {
      stoppedManually = true;
      try {
        rec?.stop();
      } catch {}
    }
  };
}

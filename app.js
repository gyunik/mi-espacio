/**
 * app.js — Controlador principal de Mi Espacio
 * Separa completamente el Modo Comunicador (libre de distracciones)
 * del Modo Familia / Equipo (administración colaborativa, preguntas del día e historial).
 */

import {
  initSpeech,
  getSpanishVoices,
  speak,
  speakCard,
  playAudioDataUrl,
  stopAllAudio,
  isAudioRecordingSupported,
  startVoiceRecording
} from './speech.js';

import {
  CATEGORIES,
  TEMPLATE_PACKS,
  isFirebaseConfigured,
  initBackend,
  subscribeToBoard,
  ensureSeedData,
  getCards,
  saveCard,
  removeCard,
  importTemplatePack,
  getQuickQuestions,
  saveQuickQuestion,
  removeQuickQuestion,
  getLiveEvents,
  sendTeenRequest,
  sendParentQuestion,
  answerParentQuestion,
  markEventSeen,
  clearLiveEvents,
  logUsageEvent,
  getTodayUsageLogs,
  clearUsageLogs,
  getSettings,
  saveSettings,
  generatePairingCode,
  compressImageFile
} from './dataService.js';

const CURATED_ICONS = [
  '💬', '💧', '🍽️', '🚻', '🩹', '🔇', '🚪', '🎧',
  '✨', '🎵', '🎬', '🚶‍♀️', '📱', '🏠', '🛋️', '⏸️',
  '✋', '🌊', '👩', '👨', '💌', '👥', '🤝', '🍨'
];

const state = {
  settings: getSettings(),
  cards: [],
  quickQuestions: [],
  usageLogs: [],
  liveEvents: [],
  activeIncomingQuestionId: null,
  lastNotifiedEventId: null,
  unsubscribeBoard: null,
  firebaseReady: false,
  commTab: 'voice',
  famTab: 'live',
  activeCategory: 'all',
  phraseTokens: [],
  ask: {
    optionA: { text: '¿Querés helado?', icon: '🍨', imageData: './assets/cards/helado.svg' },
    optionB: { text: '¿Querés ver una peli?', icon: '🎬', imageData: './assets/cards/serie.svg' },
    readingSequenceId: 0
  },
  form: {
    editingId: null,
    selectedIcon: '💬',
    imageData: null,
    audioData: null,
    recorderController: null,
    isRecording: false
  }
};

const dom = {};

document.addEventListener('DOMContentLoaded', async () => {
  cacheDom();
  registerServiceWorker();
  bindRoleGate();
  bindQuickBar();
  bindCommunicatorNav();
  bindPhraseBar();
  bindAskMode();
  bindFamilyMode();

  initSpeech((voices) => populateVoiceSelect(voices));

  state.firebaseReady = await initBackend();
  const seeded = await ensureSeedData();
  state.cards = seeded.cards;
  state.quickQuestions = seeded.quickQuestions;
  state.liveEvents = seeded.liveEvents || [];
  state.usageLogs = await getTodayUsageLogs();

  startBoardSubscription();
  applySettingsToUI();
  renderAllViews();
  applyRoleScreen(state.settings.role);
});

function cacheDom() {
  // Role Gate
  dom.roleGate = document.getElementById('role-gate');
  dom.btnChooseCommunicator = document.getElementById('btn-choose-communicator');
  dom.btnChooseFamily = document.getElementById('btn-choose-family');
  dom.gatePairingInput = document.getElementById('gate-pairing-input');

  // Shells
  dom.commShell = document.getElementById('communicator-shell');
  dom.familyShell = document.getElementById('family-shell');

  // Quick Bar & discrete exit
  dom.quickButtons = document.querySelectorAll('.quick-btn');
  dom.btnExitComm = document.getElementById('btn-exit-communicator');
  dom.exitHoldRing = document.getElementById('exit-hold-ring');

  // Communicator Navigation & Views
  dom.commNavBtns = document.querySelectorAll('[data-comm-tab]');
  dom.commViews = {
    voice: document.getElementById('comm-view-voice'),
    ask: document.getElementById('comm-view-ask'),
    templates: document.getElementById('comm-view-templates')
  };

  // Mi Voz & Doble vía en vivo
  dom.incomingBanner = document.getElementById('incoming-question-banner');
  dom.incomingQuestionText = document.getElementById('incoming-question-text');
  dom.commSentStatus = document.getElementById('comm-sent-status');
  dom.btnToggleRemoteNotify = document.getElementById('btn-toggle-remote-notify');
  dom.phraseBar = document.getElementById('phrase-bar');
  dom.phraseTokens = document.getElementById('phrase-tokens');
  dom.btnPlayPhrase = document.getElementById('btn-play-phrase');
  dom.btnBackspacePhrase = document.getElementById('btn-backspace-phrase');
  dom.btnClearPhrase = document.getElementById('btn-clear-phrase');
  dom.categoryFilters = document.getElementById('category-filters');
  dom.cardsGrid = document.getElementById('cards-grid');

  // Te Pregunto
  dom.btnToggleAskSetup = document.getElementById('btn-toggle-ask-setup');
  dom.askSetupBody = document.getElementById('ask-setup-body');
  dom.askDailyChips = document.getElementById('ask-daily-chips');
  dom.askInputA = document.getElementById('ask-input-a');
  dom.askInputB = document.getElementById('ask-input-b');
  dom.askSelectA = document.getElementById('ask-select-a');
  dom.askSelectB = document.getElementById('ask-select-b');
  dom.btnReadOptions = document.getElementById('btn-read-options');
  dom.btnResetAsk = document.getElementById('btn-reset-ask');
  dom.askCardA = document.getElementById('ask-card-a');
  dom.askCardB = document.getElementById('ask-card-b');
  dom.askVisualA = document.getElementById('ask-visual-a');
  dom.askVisualB = document.getElementById('ask-visual-b');
  dom.askTextA = document.getElementById('ask-text-a');
  dom.askTextB = document.getElementById('ask-text-b');

  // Explorar / Plantillas
  dom.templatesGrid = document.getElementById('templates-grid');

  // Familia / Equipo
  dom.btnSwitchToComm = document.getElementById('btn-switch-to-comm');
  dom.displayPairingCode = document.getElementById('display-pairing-code');
  dom.syncStatusPill = document.getElementById('sync-status-pill');
  dom.btnEnableNotifications = document.getElementById('btn-enable-notifications');
  dom.liveBadge = document.getElementById('live-badge');
  dom.btnCopyCode = document.getElementById('btn-copy-code');
  dom.btnNewCode = document.getElementById('btn-new-code');
  dom.famTabBtns = document.querySelectorAll('[data-fam-tab]');
  dom.famViews = {
    live: document.getElementById('fam-view-live'),
    cards: document.getElementById('fam-view-cards'),
    questions: document.getElementById('fam-view-questions'),
    history: document.getElementById('fam-view-history'),
    settings: document.getElementById('fam-view-settings')
  };
  dom.liveQuestionForm = document.getElementById('live-question-form');
  dom.liveDailyChips = document.getElementById('live-daily-chips');
  dom.liveOptA = document.getElementById('live-opt-a');
  dom.liveOptB = document.getElementById('live-opt-b');
  dom.liveSelectA = document.getElementById('live-select-a');
  dom.liveSelectB = document.getElementById('live-select-b');
  dom.btnClearEvents = document.getElementById('btn-clear-events');
  dom.liveEventsList = document.getElementById('live-events-list');

  // Formulario Tarjetas + MediaRecorder
  dom.cardForm = document.getElementById('card-form');
  dom.formTitle = document.getElementById('form-title');
  dom.cardId = document.getElementById('card-id');
  dom.cardText = document.getElementById('card-text');
  dom.cardCategory = document.getElementById('card-category');
  dom.cardPhoto = document.getElementById('card-photo');
  dom.btnClearPhoto = document.getElementById('btn-clear-photo');
  dom.photoPreviewWrap = document.getElementById('photo-preview-wrap');
  dom.photoPreview = document.getElementById('photo-preview');
  dom.btnRecordVoice = document.getElementById('btn-record-voice');
  dom.btnPlayRecorded = document.getElementById('btn-play-recorded');
  dom.btnClearRecorded = document.getElementById('btn-clear-recorded');
  dom.recordStatus = document.getElementById('record-status');
  dom.iconPicker = document.getElementById('icon-picker');
  dom.btnTestVoice = document.getElementById('btn-test-voice');
  dom.btnCancelEdit = document.getElementById('btn-cancel-edit');
  dom.cardsCount = document.getElementById('cards-count');
  dom.manageCardsList = document.getElementById('manage-cards-list');

  // Preguntas del día
  dom.questionForm = document.getElementById('question-form');
  dom.qqTitle = document.getElementById('qq-title');
  dom.qqOptA = document.getElementById('qq-opt-a');
  dom.qqIconA = document.getElementById('qq-icon-a');
  dom.qqOptB = document.getElementById('qq-opt-b');
  dom.qqIconB = document.getElementById('qq-icon-b');
  dom.manageQuestionsList = document.getElementById('manage-questions-list');

  // Historial y Ajustes
  dom.usageLogsList = document.getElementById('usage-logs-list');
  dom.btnClearLogs = document.getElementById('btn-clear-logs');
  dom.settingVoice = document.getElementById('setting-voice');
  dom.settingRate = document.getElementById('setting-rate');
  dom.rateValue = document.getElementById('rate-value');
  dom.settingPhraseBar = document.getElementById('setting-phrase-bar');
  dom.joinCodeInput = document.getElementById('join-code-input');
  dom.btnJoinCode = document.getElementById('btn-join-code');
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function ttsOptions() {
  return {
    rate: state.settings.speechRate,
    voiceURI: state.settings.voiceURI
  };
}

/* ==========================================================================
   FLUJO DE ROLES (Comunicador vs Familia / Equipo)
   ========================================================================== */
function bindRoleGate() {
  dom.btnChooseCommunicator.addEventListener('click', () => {
    state.settings = saveSettings({ role: 'communicator' });
    applyRoleScreen('communicator');
  });

  dom.btnChooseFamily.addEventListener('click', () => {
    const code = dom.gatePairingInput.value.replace(/\D/g, '');
    const updates = { role: 'family' };
    if (code.length === 6) {
      updates.pairingCode = code;
    }
    state.settings = saveSettings(updates);
    startBoardSubscription();
    applySettingsToUI();
    applyRoleScreen('family');
  });

  // Salida discreta del Modo Comunicador mediante toque largo de 2 segundos
  let exitTimer = null;
  let exitStart = 0;
  const HOLD_MS = 2000;

  const startHold = () => {
    if (exitTimer) return;
    exitStart = performance.now();
    exitTimer = setInterval(() => {
      const pct = Math.min(100, ((performance.now() - exitStart) / HOLD_MS) * 100);
      dom.exitHoldRing.style.height = `${pct}%`;
      if (pct >= 100) {
        cancelHold();
        stopAllAudio();
        state.settings = saveSettings({ role: null });
        applyRoleScreen(null);
      }
    }, 40);
  };

  const cancelHold = () => {
    if (exitTimer) {
      clearInterval(exitTimer);
      exitTimer = null;
    }
    dom.exitHoldRing.style.height = '0%';
  };

  dom.btnExitComm.addEventListener('pointerdown', startHold);
  dom.btnExitComm.addEventListener('pointerup', cancelHold);
  dom.btnExitComm.addEventListener('pointerleave', cancelHold);
  dom.btnExitComm.addEventListener('pointercancel', cancelHold);
}

async function applyRoleScreen(role) {
  stopAllAudio();
  dom.roleGate.hidden = role !== null;
  dom.commShell.hidden = role !== 'communicator';
  dom.familyShell.hidden = role !== 'family';

  if (role === 'family') {
    state.usageLogs = await getTodayUsageLogs();
    state.liveEvents = await getLiveEvents();
    renderUsageLogs();
    renderLiveEvents();
  }
}

/* ==========================================================================
   SINCRONIZACIÓN EN TIEMPO REAL Y NOTIFICACIONES
   ========================================================================== */
function startBoardSubscription() {
  if (state.unsubscribeBoard) {
    state.unsubscribeBoard();
    state.unsubscribeBoard = null;
  }

  state.unsubscribeBoard = subscribeToBoard(state.settings.pairingCode, {
    onCards: async (cards) => {
      if (cards.length === 0 && state.cards.length > 0) {
        // Tablero nuevo en Firebase: subir las tarjetas locales iniciales en lugar de vaciar la pantalla
        for (const c of state.cards) {
          await saveCard(c);
        }
        return;
      }
      state.cards = cards;
      renderCardsGrid();
      populateAskCardSelectors();
      renderManageCardsList();
    },
    onQuestions: async (questions) => {
      if (questions.length === 0 && state.quickQuestions.length > 0) {
        for (const q of state.quickQuestions) {
          await saveQuickQuestion(q);
        }
        return;
      }
      state.quickQuestions = questions;
      renderAskDailyChips();
      renderManageQuestionsList();
    },
    onLiveEvents: (events) => {
      handleIncomingLiveEvents(events);
    }
  });
}

function handleIncomingLiveEvents(events) {
  state.liveEvents = events || [];
  renderLiveEvents();

  // 1. Modo Comunicador: mostrar aviso calmo si hay pregunta pendiente de Familia
  const pendingQuestion = state.liveEvents.find(
    (e) => e.type === 'parent_question' && e.status === 'pending'
  );
  if (pendingQuestion) {
    dom.incomingBanner.hidden = false;
    dom.incomingQuestionText.textContent = `Pregunta de Familia: "${pendingQuestion.optionA?.text}" o "${pendingQuestion.optionB?.text}" — Tocar para responder`;
    if (state.settings.role === 'communicator' && navigator.vibrate) {
      navigator.vibrate(60);
    }
  } else {
    dom.incomingBanner.hidden = true;
  }

  // 2. Modo Comunicador: actualizar confirmación si Familia marcó "Visto"
  const latestReq = state.liveEvents.find((e) => e.type === 'teen_request');
  if (latestReq && latestReq.status === 'seen' && !dom.commSentStatus.hidden) {
    dom.commSentStatus.textContent = `Familia vio: "${latestReq.label}" ✓✓`;
  }

  // 3. Modo Familia: disparar notificación nativa si llegó un pedido nuevo o respuesta
  const newestAlert = state.liveEvents.find(
    (e) =>
      (e.type === 'teen_request' && e.status === 'sent') ||
      (e.type === 'parent_question' && e.status === 'answered')
  );
  if (
    state.settings.role === 'family' &&
    newestAlert &&
    newestAlert.id !== state.lastNotifiedEventId
  ) {
    state.lastNotifiedEventId = newestAlert.id;
    const body =
      newestAlert.type === 'teen_request'
        ? `Pedido: "${newestAlert.label}"`
        : `Respondió: "${newestAlert.answerText}"`;
    showBrowserNotification('Mi Espacio — Nuevo aviso', body);
  }
}

async function showBrowserNotification(title, body) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg && reg.showNotification) {
      await reg.showNotification(title, {
        body,
        icon: './icons/icon.svg',
        badge: './icons/icon.svg',
        tag: 'mi-espacio-aviso'
      });
      return;
    }
  } catch {}
  try {
    new Notification(title, { body, icon: './icons/icon.svg' });
  } catch {}
}

let sentTimer = null;
async function dispatchTeenRequest(label, category) {
  if (!state.settings.notifyFamilyOnTap) return;
  await sendTeenRequest({ label, category });
  dom.commSentStatus.textContent = `Enviado a Familia: "${label}" ✓`;
  dom.commSentStatus.hidden = false;
  clearTimeout(sentTimer);
  sentTimer = setTimeout(() => {
    dom.commSentStatus.hidden = true;
  }, 5000);
}

/* ==========================================================================
   MODO COMUNICADOR: Barra Superior, Navegación y Mi Voz
   ========================================================================== */
function bindQuickBar() {
  dom.quickButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const phrase = btn.dataset.quickPhrase;
      dom.quickButtons.forEach((b) => b.classList.remove('is-speaking'));
      btn.classList.add('is-speaking');

      await logUsageEvent({ actionType: 'quick', label: phrase, category: 'respuesta_rapida' });
      dispatchTeenRequest(phrase, 'respuesta_rapida');
      await speak(phrase, ttsOptions());
      btn.classList.remove('is-speaking');
    });
  });
}

function bindCommunicatorNav() {
  dom.commNavBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.commTab;
      state.commTab = target;
      stopAllAudio();
      state.ask.readingSequenceId += 1;

      dom.commNavBtns.forEach((b) => {
        const active = b.dataset.commTab === target;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', String(active));
      });

      Object.entries(dom.commViews).forEach(([key, el]) => {
        const active = key === target;
        el.classList.toggle('is-active', active);
        el.hidden = !active;
      });
    });
  });
}

function bindPhraseBar() {
  dom.btnToggleRemoteNotify.addEventListener('click', () => {
    const next = !state.settings.notifyFamilyOnTap;
    state.settings = saveSettings({ notifyFamilyOnTap: next });
    applySettingsToUI();
  });

  dom.incomingBanner.addEventListener('click', () => {
    const pending = state.liveEvents.find(
      (e) => e.type === 'parent_question' && e.status === 'pending'
    );
    if (!pending) return;

    state.activeIncomingQuestionId = pending.id;
    state.ask.optionA = { ...pending.optionA };
    state.ask.optionB = { ...pending.optionB };
    dom.askInputA.value = pending.optionA.text || '';
    dom.askInputB.value = pending.optionB.text || '';
    resetAskSelection();
    renderAskCards();

    // Cambiar a pestaña Te Pregunto
    const askNav = document.querySelector('[data-comm-tab="ask"]');
    askNav?.click();
  });

  dom.btnPlayPhrase.addEventListener('click', async () => {
    if (state.phraseTokens.length === 0) return;
    await speak(state.phraseTokens.join('. '), ttsOptions());
  });

  dom.btnBackspacePhrase.addEventListener('click', () => {
    state.phraseTokens.pop();
    renderPhraseBar();
  });

  dom.btnClearPhrase.addEventListener('click', () => {
    state.phraseTokens = [];
    renderPhraseBar();
  });
}

function renderPhraseBar() {
  dom.phraseBar.hidden = !state.settings.showPhraseBar;
  const hasTokens = state.phraseTokens.length > 0;
  dom.btnPlayPhrase.disabled = !hasTokens;
  dom.btnBackspacePhrase.disabled = !hasTokens;
  dom.btnClearPhrase.disabled = !hasTokens;

  if (!hasTokens) {
    dom.phraseTokens.innerHTML =
      '<span class="phrase-bar__placeholder">Tocá las tarjetas para armar una frase...</span>';
    return;
  }

  dom.phraseTokens.innerHTML = '';
  state.phraseTokens.forEach((txt) => {
    const chip = document.createElement('span');
    chip.className = 'phrase-token';
    chip.textContent = txt;
    dom.phraseTokens.appendChild(chip);
  });
}

function renderCategories() {
  dom.categoryFilters.innerHTML = '';
  CATEGORIES.forEach((cat) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `category-pill ${state.activeCategory === cat.id ? 'is-active' : ''}`;
    btn.textContent = cat.label;
    btn.addEventListener('click', () => {
      state.activeCategory = cat.id;
      renderCategories();
      renderCardsGrid();
    });
    dom.categoryFilters.appendChild(btn);
  });
}

function renderCardsGrid() {
  const filtered =
    state.activeCategory === 'all'
      ? state.cards
      : state.cards.filter((c) => c.category === state.activeCategory);

  dom.cardsGrid.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No hay tarjetas en esta categoría. Podés importar un pack en "Explorar".';
    dom.cardsGrid.appendChild(empty);
    return;
  }

  filtered.forEach((card) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'aac-card';
    btn.setAttribute('aria-label', card.text);

    if (card.audioData) {
      const badge = document.createElement('span');
      badge.className = 'aac-card__voice-badge';
      badge.textContent = '🎙️';
      badge.title = 'Incluye nota de voz';
      btn.appendChild(badge);
    }

    const visual = document.createElement('div');
    visual.className = 'aac-card__visual';
    if (card.imageData) {
      const img = document.createElement('img');
      img.src = card.imageData;
      img.alt = card.text;
      visual.appendChild(img);
    } else {
      visual.textContent = card.icon || '💬';
    }

    const label = document.createElement('span');
    label.className = 'aac-card__text';
    label.textContent = card.text;

    btn.append(visual, label);

    btn.addEventListener('click', async () => {
      document.querySelectorAll('.aac-card.is-speaking').forEach((el) => el.classList.remove('is-speaking'));
      btn.classList.add('is-speaking');

      if (state.settings.showPhraseBar) {
        state.phraseTokens.push(card.text);
        if (state.phraseTokens.length > 8) state.phraseTokens.shift();
        renderPhraseBar();
      }

      await logUsageEvent({ actionType: 'card', label: card.text, category: card.category });
      dispatchTeenRequest(card.text, card.category);
      await speakCard(card, ttsOptions());
      btn.classList.remove('is-speaking');
    });

    dom.cardsGrid.appendChild(btn);
  });
}

/* ==========================================================================
   MODO COMUNICADOR: Pestaña 2 — Te Pregunto (Doble Vía)
   ========================================================================== */
function bindAskMode() {
  dom.btnToggleAskSetup.addEventListener('click', () => {
    const willShow = dom.askSetupBody.hidden;
    dom.askSetupBody.hidden = !willShow;
    dom.btnToggleAskSetup.setAttribute('aria-expanded', String(willShow));
    dom.btnToggleAskSetup.textContent = willShow ? 'Ocultar opciones' : 'Editar opciones';
  });

  dom.askInputA.addEventListener('input', () => {
    state.ask.optionA.text = dom.askInputA.value;
    state.ask.optionA.imageData = null;
    renderAskCards();
  });

  dom.askInputB.addEventListener('input', () => {
    state.ask.optionB.text = dom.askInputB.value;
    state.ask.optionB.imageData = null;
    renderAskCards();
  });

  dom.askSelectA.addEventListener('change', () => applyCardToAsk('A', dom.askSelectA.value));
  dom.askSelectB.addEventListener('change', () => applyCardToAsk('B', dom.askSelectB.value));

  dom.btnReadOptions.addEventListener('click', readAskOptionsSequentially);
  dom.btnResetAsk.addEventListener('click', () => {
    stopAllAudio();
    state.ask.readingSequenceId += 1;
    resetAskSelection();
  });

  dom.askCardA.addEventListener('click', () => chooseAskOption('A'));
  dom.askCardB.addEventListener('click', () => chooseAskOption('B'));
}

function renderAskDailyChips() {
  dom.askDailyChips.innerHTML = '';
  if (dom.liveDailyChips) dom.liveDailyChips.innerHTML = '';

  state.quickQuestions.forEach((qq) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip-btn';
    chip.textContent = qq.title;
    chip.addEventListener('click', () => {
      state.ask.optionA = { ...qq.optionA };
      state.ask.optionB = { ...qq.optionB };
      dom.askInputA.value = qq.optionA.text;
      dom.askInputB.value = qq.optionB.text;
      dom.askSelectA.value = '';
      dom.askSelectB.value = '';
      resetAskSelection();
      renderAskCards();
    });
    dom.askDailyChips.appendChild(chip);

    if (dom.liveDailyChips) {
      const liveChip = document.createElement('button');
      liveChip.type = 'button';
      liveChip.className = 'chip-btn';
      liveChip.textContent = qq.title;
      liveChip.addEventListener('click', () => {
        dom.liveOptA.value = qq.optionA.text;
        dom.liveOptB.value = qq.optionB.text;
        dom.liveOptA.dataset.icon = qq.optionA.icon || '🅰️';
        dom.liveOptA.dataset.image = qq.optionA.imageData || '';
        dom.liveOptB.dataset.icon = qq.optionB.icon || '🅱️';
        dom.liveOptB.dataset.image = qq.optionB.imageData || '';
      });
      dom.liveDailyChips.appendChild(liveChip);
    }
  });
}

/**
 * Convierte una frase en primera persona ("Quiero...", "Necesito...")
 * a formato de pregunta en segunda persona ("¿Querés...?", "¿Necesitás...?").
 */
function toQuestionForm(text) {
  const clean = (text || '').trim();
  if (!clean) return '';
  if (clean.startsWith('¿') && clean.endsWith('?')) return clean;

  const rules = [
    [/^Quiero\s+/i, '¿Querés '],
    [/^Necesito\s+mis\s+/i, '¿Necesitás tus '],
    [/^Necesito\s+/i, '¿Necesitás '],
    [/^Tengo\s+/i, '¿Tenés '],
    [/^Prefiero\s+quedarme/i, '¿Preferís quedarte'],
    [/^Prefiero\s+/i, '¿Preferís '],
    [/^Estoy\s+/i, '¿Estás '],
    [/^Me siento\s+/i, '¿Te sentís '],
    [/^Me duele\s+/i, '¿Te duele '],
    [/^Hay\s+/i, '¿Hay '],
    [/^Mandar\s+/i, '¿Querés mandar ']
  ];

  for (const [regex, replacement] of rules) {
    if (regex.test(clean)) {
      const converted = clean.replace(regex, replacement).replace(/\bmi\b/gi, 'tu');
      return `${converted}?`;
    }
  }
  return `¿${clean}?`;
}

function applyCardToAsk(side, cardId) {
  if (!cardId) return;
  const card = state.cards.find((c) => c.id === cardId);
  if (!card) return;

  const target = side === 'A' ? state.ask.optionA : state.ask.optionB;
  const input = side === 'A' ? dom.askInputA : dom.askInputB;
  const questionText = toQuestionForm(card.text);

  target.text = questionText;
  target.icon = card.icon;
  target.imageData = card.imageData;
  input.value = questionText;
  resetAskSelection();
  renderAskCards();
}

function populateAskCardSelectors() {
  [dom.askSelectA, dom.askSelectB, dom.liveSelectA, dom.liveSelectB].forEach((sel) => {
    if (!sel) return;
    sel.innerHTML = '<option value="">Elegir pregunta...</option>';
    state.cards.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.icon || ''} ${toQuestionForm(c.text)}`.trim();
      sel.appendChild(opt);
    });
  });
}

function renderAskCards() {
  renderAskVisual(dom.askVisualA, state.ask.optionA);
  renderAskVisual(dom.askVisualB, state.ask.optionB);
  dom.askTextA.textContent = state.ask.optionA.text || 'Opción A';
  dom.askTextB.textContent = state.ask.optionB.text || 'Opción B';
}

function renderAskVisual(el, opt) {
  el.innerHTML = '';
  if (opt.imageData) {
    const img = document.createElement('img');
    img.src = opt.imageData;
    img.alt = opt.text;
    el.appendChild(img);
  } else {
    el.textContent = opt.icon || '💬';
  }
}

function resetAskSelection() {
  [dom.askCardA, dom.askCardB].forEach((c) => c.classList.remove('is-reading', 'is-chosen', 'is-dimmed'));
}

async function readAskOptionsSequentially() {
  resetAskSelection();
  const seqId = ++state.ask.readingSequenceId;

  const tA = (state.ask.optionA.text || '').trim();
  const tB = (state.ask.optionB.text || '').trim();

  if (tA) {
    dom.askCardA.classList.add('is-reading');
    await speak(tA, ttsOptions());
    dom.askCardA.classList.remove('is-reading');
  }
  if (state.ask.readingSequenceId !== seqId) return;

  await new Promise((r) => setTimeout(r, 420));
  if (state.ask.readingSequenceId !== seqId) return;

  if (tB) {
    dom.askCardB.classList.add('is-reading');
    await speak(tB, ttsOptions());
    dom.askCardB.classList.remove('is-reading');
  }
}

async function chooseAskOption(side) {
  state.ask.readingSequenceId += 1;
  const chosenCard = side === 'A' ? dom.askCardA : dom.askCardB;
  const otherCard = side === 'A' ? dom.askCardB : dom.askCardA;
  const chosenText = side === 'A' ? state.ask.optionA.text : state.ask.optionB.text;

  chosenCard.classList.remove('is-reading', 'is-dimmed');
  chosenCard.classList.add('is-chosen');
  otherCard.classList.remove('is-reading', 'is-chosen');
  otherCard.classList.add('is-dimmed');

  const clean = (chosenText || '').replace(/[¿?]/g, '').trim();
  await logUsageEvent({ actionType: 'choice', label: `Eligió: ${clean}`, category: 'te_pregunto' });

  if (state.activeIncomingQuestionId) {
    await answerParentQuestion(state.activeIncomingQuestionId, side, clean);
    state.activeIncomingQuestionId = null;
    dom.incomingBanner.hidden = true;
  }

  await speak(clean || `Opción ${side}`, ttsOptions());
}

/* ==========================================================================
   MODO COMUNICADOR: Pestaña 3 — Explorar / Plantillas
   ========================================================================== */
function renderTemplatesGrid() {
  dom.templatesGrid.innerHTML = '';
  TEMPLATE_PACKS.forEach((pack) => {
    const card = document.createElement('div');
    card.className = 'template-card';

    const top = document.createElement('div');
    top.className = 'template-card__top';

    const title = document.createElement('h3');
    title.className = 'template-card__title';
    title.textContent = pack.title;

    const badge = document.createElement('span');
    badge.className = 'role-card__badge';
    badge.textContent = pack.badge;

    top.append(title, badge);

    const desc = document.createElement('p');
    desc.className = 'muted-text';
    desc.textContent = pack.description;

    const preview = document.createElement('div');
    preview.className = 'template-card__preview';
    pack.cards.forEach((c) => {
      const pill = document.createElement('span');
      pill.className = 'template-preview-pill';
      pill.textContent = `${c.icon} ${c.text}`;
      preview.appendChild(pill);
    });

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--accent';
    btn.textContent = `Importar ${pack.cards.length} tarjetas`;
    btn.addEventListener('click', async () => {
      const added = await importTemplatePack(pack.id);
      await refreshAllData();
      btn.textContent = added > 0 ? `✓ ${added} importadas` : '✓ Ya estaban en tu tablero';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = `Importar ${pack.cards.length} tarjetas`;
        btn.disabled = false;
      }, 2400);
    });

    card.append(top, desc, preview, btn);
    dom.templatesGrid.appendChild(card);
  });
}

/* ==========================================================================
   MODO FAMILIA / EQUIPO
   ========================================================================== */
function bindFamilyMode() {
  dom.btnSwitchToComm.addEventListener('click', () => {
    state.settings = saveSettings({ role: 'communicator' });
    applyRoleScreen('communicator');
  });

  dom.btnEnableNotifications.addEventListener('click', async () => {
    if (typeof Notification === 'undefined') {
      dom.btnEnableNotifications.textContent = 'No soportado';
      return;
    }
    const res = await Notification.requestPermission();
    dom.btnEnableNotifications.textContent =
      res === 'granted' ? '🔔 Alertas activas' : '🔕 Permiso denegado';
  });

  dom.liveSelectA.addEventListener('change', () => {
    const card = state.cards.find((c) => c.id === dom.liveSelectA.value);
    if (!card) return;
    dom.liveOptA.value = toQuestionForm(card.text);
    dom.liveOptA.dataset.icon = card.icon || '🅰️';
    dom.liveOptA.dataset.image = card.imageData || '';
  });

  dom.liveSelectB.addEventListener('change', () => {
    const card = state.cards.find((c) => c.id === dom.liveSelectB.value);
    if (!card) return;
    dom.liveOptB.value = toQuestionForm(card.text);
    dom.liveOptB.dataset.icon = card.icon || '🅱️';
    dom.liveOptB.dataset.image = card.imageData || '';
  });

  dom.liveQuestionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const optA = dom.liveOptA.value.trim();
    const optB = dom.liveOptB.value.trim();
    if (!optA || !optB) return;

    await sendParentQuestion({
      title: 'Pregunta de Familia',
      optionA: {
        text: optA,
        icon: dom.liveOptA.dataset.icon || '🅰️',
        imageData: dom.liveOptA.dataset.image || null
      },
      optionB: {
        text: optB,
        icon: dom.liveOptB.dataset.icon || '🅱️',
        imageData: dom.liveOptB.dataset.image || null
      }
    });
    state.liveEvents = await getLiveEvents();
    renderLiveEvents();
  });

  dom.btnClearEvents.addEventListener('click', async () => {
    await clearLiveEvents();
    state.liveEvents = [];
    renderLiveEvents();
  });

  dom.btnCopyCode.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(state.settings.pairingCode);
      dom.btnCopyCode.textContent = '¡Copiado!';
      setTimeout(() => (dom.btnCopyCode.textContent = 'Copiar'), 1800);
    } catch {}
  });

  dom.btnNewCode.addEventListener('click', () => {
    const code = generatePairingCode();
    state.settings = saveSettings({ pairingCode: code });
    applySettingsToUI();
  });

  dom.famTabBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const target = btn.dataset.famTab;
      state.famTab = target;

      dom.famTabBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.famTab === target));
      Object.entries(dom.famViews).forEach(([k, el]) => {
        const active = k === target;
        el.classList.toggle('is-active', active);
        el.hidden = !active;
      });

      if (target === 'history') {
        state.usageLogs = await getTodayUsageLogs();
        renderUsageLogs();
      }
      if (target === 'live') {
        state.liveEvents = await getLiveEvents();
        renderLiveEvents();
      }
    });
  });

  // Foto real
  dom.cardPhoto.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 480, 0.82);
      state.form.imageData = dataUrl;
      dom.photoPreview.src = dataUrl;
      dom.photoPreviewWrap.hidden = false;
      dom.btnClearPhoto.hidden = false;
    } catch (err) {
      console.error(err);
    }
  });
  dom.btnClearPhoto.addEventListener('click', clearFormPhoto);

  // Grabación de nota de voz (MediaRecorder)
  if (!isAudioRecordingSupported()) {
    dom.btnRecordVoice.disabled = true;
    dom.recordStatus.textContent = 'Grabación de audio no disponible en este navegador.';
  }

  dom.btnRecordVoice.addEventListener('click', async () => {
    if (!state.form.isRecording) {
      try {
        state.form.recorderController = await startVoiceRecording();
        state.form.isRecording = true;
        dom.btnRecordVoice.textContent = '⏹ Detener grabación';
        dom.btnRecordVoice.classList.add('btn--danger');
        dom.recordStatus.textContent = 'Grabando nota de voz...';
      } catch (err) {
        dom.recordStatus.textContent = 'Permiso de micrófono denegado o no disponible.';
      }
    } else {
      const dataUrl = await state.form.recorderController.stop();
      state.form.isRecording = false;
      state.form.recorderController = null;
      state.form.audioData = dataUrl;
      dom.btnRecordVoice.textContent = '🎙️ Regrabar nota';
      dom.btnRecordVoice.classList.remove('btn--danger');
      dom.btnPlayRecorded.hidden = false;
      dom.btnClearRecorded.hidden = false;
      dom.recordStatus.textContent = 'Nota de voz lista para guardar.';
    }
  });

  dom.btnPlayRecorded.addEventListener('click', () => {
    if (state.form.audioData) playAudioDataUrl(state.form.audioData);
  });

  dom.btnClearRecorded.addEventListener('click', clearFormAudio);

  dom.btnTestVoice.addEventListener('click', () => {
    speak(dom.cardText.value.trim() || 'Hola, así suena mi voz', ttsOptions());
  });

  dom.btnCancelEdit.addEventListener('click', resetCardForm);

  dom.cardForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = dom.cardText.value.trim();
    if (!text) return;

    await saveCard({
      id: state.form.editingId || undefined,
      text,
      category: dom.cardCategory.value,
      icon: state.form.selectedIcon,
      imageData: state.form.imageData,
      audioData: state.form.audioData,
      authorRole: 'family'
    });

    resetCardForm();
    await refreshAllData();
  });

  // Preguntas rápidas del día
  dom.questionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveQuickQuestion({
      title: dom.qqTitle.value,
      optionA: { text: dom.qqOptA.value, icon: dom.qqIconA.value || '🅰️', imageData: null },
      optionB: { text: dom.qqOptB.value, icon: dom.qqIconB.value || '🅱️', imageData: null }
    });
    dom.questionForm.reset();
    dom.qqIconA.value = '🥪';
    dom.qqIconB.value = '🍎';
    await refreshAllData();
  });

  // Historial
  dom.btnClearLogs.addEventListener('click', async () => {
    await clearUsageLogs();
    state.usageLogs = [];
    renderUsageLogs();
  });

  // Ajustes
  dom.settingVoice.addEventListener('change', () => {
    state.settings = saveSettings({ voiceURI: dom.settingVoice.value });
  });

  dom.settingRate.addEventListener('input', () => {
    const rate = parseFloat(dom.settingRate.value);
    dom.rateValue.textContent = `${rate.toFixed(2)}x`;
    state.settings = saveSettings({ speechRate: rate });
  });

  dom.settingPhraseBar.addEventListener('change', () => {
    state.settings = saveSettings({ showPhraseBar: dom.settingPhraseBar.checked });
    renderPhraseBar();
  });

  dom.btnJoinCode.addEventListener('click', () => {
    const code = dom.joinCodeInput.value.replace(/\D/g, '');
    if (code.length === 6) {
      state.settings = saveSettings({ pairingCode: code });
      dom.joinCodeInput.value = '';
      startBoardSubscription();
      applySettingsToUI();
    }
  });
}

function clearFormPhoto() {
  state.form.imageData = null;
  dom.cardPhoto.value = '';
  dom.photoPreview.src = '';
  dom.photoPreviewWrap.hidden = true;
  dom.btnClearPhoto.hidden = true;
}

function clearFormAudio() {
  state.form.audioData = null;
  dom.btnPlayRecorded.hidden = true;
  dom.btnClearRecorded.hidden = true;
  dom.btnRecordVoice.textContent = '🎙️ Grabar nota';
  dom.recordStatus.textContent = '';
}

function resetCardForm() {
  state.form.editingId = null;
  state.form.selectedIcon = '💬';
  dom.formTitle.textContent = 'Nueva Tarjeta';
  dom.cardId.value = '';
  dom.cardText.value = '';
  dom.cardCategory.value = 'limites';
  dom.btnCancelEdit.hidden = true;
  clearFormPhoto();
  clearFormAudio();
  renderIconPicker();
}

function startEditingCard(card) {
  state.form.editingId = card.id;
  state.form.selectedIcon = card.icon || '💬';
  state.form.imageData = card.imageData || null;
  state.form.audioData = card.audioData || null;

  dom.formTitle.textContent = 'Editar Tarjeta';
  dom.cardText.value = card.text;
  dom.cardCategory.value = card.category;
  dom.btnCancelEdit.hidden = false;

  if (card.imageData) {
    dom.photoPreview.src = card.imageData;
    dom.photoPreviewWrap.hidden = false;
    dom.btnClearPhoto.hidden = false;
  } else {
    clearFormPhoto();
  }

  if (card.audioData) {
    dom.btnPlayRecorded.hidden = false;
    dom.btnClearRecorded.hidden = false;
    dom.recordStatus.textContent = 'Esta tarjeta tiene una nota de voz guardada.';
  } else {
    clearFormAudio();
  }

  renderIconPicker();
  dom.cardForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderIconPicker() {
  dom.iconPicker.innerHTML = '';
  CURATED_ICONS.forEach((icon) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `icon-option ${state.form.selectedIcon === icon ? 'is-selected' : ''}`;
    btn.textContent = icon;
    btn.addEventListener('click', () => {
      state.form.selectedIcon = icon;
      renderIconPicker();
    });
    dom.iconPicker.appendChild(btn);
  });
}

function renderManageCardsList() {
  dom.cardsCount.textContent = String(state.cards.length);
  dom.manageCardsList.innerHTML = '';
  const catMap = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

  state.cards.forEach((card) => {
    const item = document.createElement('div');
    item.className = 'manage-item';

    const info = document.createElement('div');
    info.className = 'manage-item__info';

    const thumb = document.createElement('div');
    thumb.className = 'manage-item__thumb';
    if (card.imageData) {
      const img = document.createElement('img');
      img.src = card.imageData;
      img.alt = card.text;
      thumb.appendChild(img);
    } else {
      thumb.textContent = card.icon || '💬';
    }

    const txtWrap = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'manage-item__text';
    title.textContent = `${card.text} ${card.audioData ? '🎙️' : ''}`.trim();

    const sub = document.createElement('div');
    sub.className = 'manage-item__cat';
    sub.textContent = catMap[card.category] || card.category;

    txtWrap.append(title, sub);
    info.append(thumb, txtWrap);

    const actions = document.createElement('div');
    actions.className = 'manage-item__actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn--ghost btn--sm';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => startEditingCard(card));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn--danger btn--sm';
    delBtn.textContent = 'Borrar';
    delBtn.addEventListener('click', async () => {
      await removeCard(card.id);
      await refreshAllData();
    });

    actions.append(editBtn, delBtn);
    item.append(info, actions);
    dom.manageCardsList.appendChild(item);
  });
}

function renderManageQuestionsList() {
  dom.manageQuestionsList.innerHTML = '';
  if (state.quickQuestions.length === 0) {
    dom.manageQuestionsList.innerHTML = '<p class="muted-text">No hay preguntas guardadas todavía.</p>';
    return;
  }

  state.quickQuestions.forEach((qq) => {
    const item = document.createElement('div');
    item.className = 'manage-item';

    const info = document.createElement('div');
    info.innerHTML = `
      <div class="manage-item__text">${escapeHtml(qq.title)}</div>
      <div class="manage-item__cat">${escapeHtml(qq.optionA.text)} vs ${escapeHtml(qq.optionB.text)}</div>
    `;

    const actions = document.createElement('div');
    actions.className = 'manage-item__actions';

    const sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.className = 'btn btn--accent btn--sm';
    sendBtn.textContent = '📤 Enviar';
    sendBtn.addEventListener('click', async () => {
      await sendParentQuestion(qq);
      state.liveEvents = await getLiveEvents();
      renderLiveEvents();
      sendBtn.textContent = '✓ Enviada';
      setTimeout(() => (sendBtn.textContent = '📤 Enviar'), 1800);
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn--danger btn--sm';
    delBtn.textContent = 'Borrar';
    delBtn.addEventListener('click', async () => {
      await removeQuickQuestion(qq.id);
      await refreshAllData();
    });

    actions.append(sendBtn, delBtn);
    item.append(info, actions);
    dom.manageQuestionsList.appendChild(item);
  });
}

function renderLiveEvents() {
  const unreadCount = state.liveEvents.filter(
    (e) =>
      (e.type === 'teen_request' && e.status === 'sent') ||
      (e.type === 'parent_question' && e.status === 'answered')
  ).length;

  dom.liveBadge.hidden = unreadCount === 0;
  dom.liveBadge.textContent = String(unreadCount);

  dom.liveEventsList.innerHTML = '';
  if (state.liveEvents.length === 0) {
    dom.liveEventsList.innerHTML =
      '<p class="muted-text">Aún no hay avisos ni preguntas enviadas hoy.</p>';
    return;
  }

  state.liveEvents.forEach((ev) => {
    const item = document.createElement('div');
    item.className = 'manage-item';

    const time = new Date(ev.createdAt).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const left = document.createElement('div');
    if (ev.type === 'teen_request') {
      left.innerHTML = `
        <div class="manage-item__text">📣 ${escapeHtml(ev.label)}</div>
        <div class="manage-item__cat">${time} · ${ev.status === 'seen' ? 'Visto ✓✓' : 'Nuevo aviso'}</div>
      `;
    } else {
      const statusText =
        ev.status === 'answered'
          ? `Respondió: "${escapeHtml(ev.answerText)}" ✓`
          : ev.status === 'seen'
            ? 'Visto ✓✓'
            : 'Esperando respuesta...';
      left.innerHTML = `
        <div class="manage-item__text">❓ ${escapeHtml(ev.optionA?.text)} / ${escapeHtml(ev.optionB?.text)}</div>
        <div class="manage-item__cat">${time} · ${statusText}</div>
      `;
    }

    item.appendChild(left);

    if (ev.status === 'sent' || ev.status === 'answered') {
      const seenBtn = document.createElement('button');
      seenBtn.type = 'button';
      seenBtn.className = 'btn btn--emerald btn--sm';
      seenBtn.textContent = 'Visto ✓';
      seenBtn.addEventListener('click', async () => {
        await markEventSeen(ev.id);
        state.liveEvents = await getLiveEvents();
        renderLiveEvents();
      });
      item.appendChild(seenBtn);
    }

    dom.liveEventsList.appendChild(item);
  });
}

function renderUsageLogs() {
  dom.usageLogsList.innerHTML = '';
  if (state.usageLogs.length === 0) {
    dom.usageLogsList.innerHTML = '<p class="muted-text">Aún no hay registros de uso en el día de hoy.</p>';
    return;
  }

  state.usageLogs.forEach((log) => {
    const item = document.createElement('div');
    item.className = 'manage-item';

    const time = new Date(log.timestamp).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const left = document.createElement('div');
    left.innerHTML = `
      <div class="manage-item__text">${escapeHtml(log.label)}</div>
      <div class="manage-item__cat">${escapeHtml(log.category)}</div>
    `;

    const right = document.createElement('span');
    right.className = 'muted-text';
    right.textContent = time;

    item.append(left, right);
    dom.usageLogsList.appendChild(item);
  });
}

function populateVoiceSelect(voices) {
  const list = voices && voices.length ? voices : getSpanishVoices();
  dom.settingVoice.innerHTML = '<option value="">Automática (es-AR / Latino)</option>';
  list.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.voiceURI;
    opt.textContent = `${v.name} (${v.lang})`;
    if (v.voiceURI === state.settings.voiceURI) opt.selected = true;
    dom.settingVoice.appendChild(opt);
  });
}

function applySettingsToUI() {
  const code = state.settings.pairingCode || '000000';
  dom.displayPairingCode.textContent = `${code.slice(0, 3)}-${code.slice(3)}`;
  dom.syncStatusPill.textContent = state.firebaseReady
    ? '● Conectado a Firebase en tiempo real'
    : isFirebaseConfigured()
      ? '● Sin conexión (modo local)'
      : '● Modo Local (sincroniza entre pestañas)';

  const notifyOn = Boolean(state.settings.notifyFamilyOnTap);
  dom.btnToggleRemoteNotify.classList.toggle('is-active', notifyOn);
  dom.btnToggleRemoteNotify.setAttribute('aria-pressed', String(notifyOn));
  dom.btnToggleRemoteNotify.textContent = notifyOn
    ? '📡 Avisar a Familia: Activado'
    : '📡 Avisar a Familia: Solo voz local';

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    dom.btnEnableNotifications.textContent = '🔔 Alertas activas';
  }

  dom.settingRate.value = String(state.settings.speechRate);
  dom.rateValue.textContent = `${Number(state.settings.speechRate).toFixed(2)}x`;
  dom.settingPhraseBar.checked = Boolean(state.settings.showPhraseBar);
  renderPhraseBar();
}

function renderAllViews() {
  renderCategories();
  renderCardsGrid();
  populateAskCardSelectors();
  renderAskDailyChips();
  renderAskCards();
  renderTemplatesGrid();
  renderIconPicker();
  renderManageCardsList();
  renderManageQuestionsList();
  renderUsageLogs();
  renderLiveEvents();
}

async function refreshAllData() {
  state.cards = await getCards();
  state.quickQuestions = await getQuickQuestions();
  renderAllViews();
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

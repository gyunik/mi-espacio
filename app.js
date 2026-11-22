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
  startVoiceRecording,
  startLiveTranscript
} from './speech.js';

import {
  CATEGORIES,
  TEMPLATE_PACKS,
  isFirebaseConfigured,
  isPushConfigured,
  initBackend,
  registerPushToken,
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
  replyToTeenRequest,
  acknowledgeReply,
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
  // Necesidades básicas e higiene
  { icon: '💬', label: 'Hablar / Mensaje', use: 'Frases generales, pedidos o avisos' },
  { icon: '💧', label: 'Agua / Sed', use: 'Tomar agua, sed o estar mojada' },
  { icon: '🍽️', label: 'Comida / Cenar', use: 'Hambre, almuerzo, cena o merienda' },
  { icon: '🚻', label: 'Baño', use: 'Ir al baño o higiene personal' },
  { icon: '🛁', label: 'Ducha / Bañarse', use: 'Bañarse, lavarse o refrescarse' },
  { icon: '🪥', label: 'Lavarse los dientes', use: 'Higiene bucal o rutina de noche' },
  { icon: '👕', label: 'Ropa / Cambiarse', use: 'Cambiarse de ropa, comodidad o abrigo' },
  { icon: '🧥', label: 'Frío / Abrigo', use: 'Tengo frío o necesito campera' },
  { icon: '☀️', label: 'Calor / Sol', use: 'Tengo calor, aire o día soleado' },
  { icon: '❄️', label: 'Aire / Fresco', use: 'Prender ventilador, aire o frío' },
  { icon: '🛌', label: 'Descansar / Dormir', use: 'Cansancio, siesta o ir a dormir' },
  { icon: '🩹', label: 'Dolor / Molestia', use: 'Me duele algo o me lastimé' },
  { icon: '💊', label: 'Medicación / Salud', use: 'Remedio, médico o malestar físico' },
  { icon: '🤒', label: 'Malestar / Fiebre', use: 'No me siento bien o tengo fiebre' },
  { icon: '🧻', label: 'Pañuelos / Limpiar', use: 'Necesito servilleta, papel o limpiar' },
  // Límites, calma y regulación sensorial
  { icon: '🔇', label: 'Mucho ruido', use: 'Bajar el volumen o ambiente ruidoso' },
  { icon: '🎧', label: 'Auriculares', use: 'Pedir auriculares o aislamiento sonoro' },
  { icon: '🕶️', label: 'Mucha luz', use: 'Bajar la luz o sensibilidad visual' },
  { icon: '🚪', label: 'Mi pieza / Privacidad', use: 'Ir a mi habitación o estar sola' },
  { icon: '⏸️', label: 'Pausa / Frenar', use: 'Necesito un descanso o parar un momento' },
  { icon: '✋', label: 'Espacio personal', use: 'No me toquen ahora o mantener distancia' },
  { icon: '🌊', label: 'Abrumada / Ansiedad', use: 'Sobrecarga sensorial o necesidad de calma' },
  { icon: '😤', label: 'Enojo / Frustración', use: 'Estoy molesta o frustrada' },
  { icon: '😢', label: 'Tristeza', use: 'Estoy triste o necesito contención' },
  { icon: '✨', label: 'Tranquila / Bien', use: 'Estoy bien, calma o contenta' },
  { icon: '🫁', label: 'Respirar / Calma', use: 'Tomar aire o ejercicio de relajación' },
  { icon: '🛋️', label: 'Quedarme acá', use: 'Prefiero no moverme o quedarme tranquila' },
  { icon: '🛑', label: 'Basta / Detener', use: 'Parar una actividad o límite firme' },
  { icon: '⏱️', label: 'Esperar / Tiempo', use: 'Necesito unos minutos o cuánto falta' },
  { icon: '❓', label: 'Duda / Pregunta', use: 'No entiendo o quiero preguntar algo' },
  // Comidas y gustos cotidianos
  { icon: '🥪', label: 'Tostadas / Merienda', use: 'Desayuno, tostadas o sándwich' },
  { icon: '🍎', label: 'Fruta', use: 'Manzana, banana u otra fruta' },
  { icon: '🍨', label: 'Helado / Postre', use: 'Postre, helado o algo dulce' },
  { icon: '🍕', label: 'Pizza / Comida rica', use: 'Cena especial o comida favorita' },
  { icon: '🍝', label: 'Fideos / Almuerzo', use: 'Pastas o plato principal' },
  { icon: '☕', label: 'Té / Leche / Mate', use: 'Bebida caliente o merienda' },
  { icon: '🧃', label: 'Jugo / Bebida', use: 'Jugo, licuado o gaseosa' },
  { icon: '🍪', label: 'Galletitas / Snack', use: 'Algo liviano para picar' },
  // Ocio, tecnología y salidas
  { icon: '🎵', label: 'Música', use: 'Escuchar música o playlist' },
  { icon: '🎬', label: 'Series / Película', use: 'Ver tele, serie o película' },
  { icon: '📱', label: 'Celular / Tablet', use: 'Usar el teléfono o ver videos' },
  { icon: '💻', label: 'Computadora', use: 'Usar la compu, jugar o estudiar' },
  { icon: '🎮', label: 'Videojuegos', use: 'Jugar un rato en consola o PC' },
  { icon: '🎨', label: 'Dibujar / Arte', use: 'Pintar, dibujar o manualidades' },
  { icon: '📚', label: 'Leer / Estudiar', use: 'Libros, tarea o escuela' },
  { icon: '🚶‍♀️', label: 'Salir a caminar', use: 'Dar una vuelta o tomar aire afuera' },
  { icon: '🚗', label: 'Viajar en auto', use: 'Salir en auto o ir a algún lugar' },
  { icon: '🏠', label: 'Volver a casa', use: 'Quiero irme a casa' },
  { icon: '🌳', label: 'Parque / Plaza', use: 'Ir a la plaza o espacio verde' },
  { icon: '🛍️', label: 'Compras / Paseo', use: 'Ir al súper, shopping o comprar algo' },
  // Familia, vínculos y apoyos
  { icon: '👩', label: 'Mamá', use: 'Llamar o hablar con mamá' },
  { icon: '👨', label: 'Papá', use: 'Llamar o hablar con papá' },
  { icon: '👵', label: 'Abuela / Familia', use: 'Hablar o visitar a familiares' },
  { icon: '💌', label: 'Mandar mensaje', use: 'Escribir a un familiar o amigo' },
  { icon: '📞', label: 'Llamar / Videollamada', use: 'Hacer una llamada o videollamada' },
  { icon: '👥', label: 'Amigos', use: 'Ver o hablar con amigos' },
  { icon: '🐶', label: 'Mascota', use: 'Estar con el perro, gato o mascota' },
  { icon: '🏫', label: 'Escuela / Terapia', use: 'Colegio, actividad o sesión' },
  { icon: '🤝', label: 'Necesito ayuda', use: 'Pedir ayuda o acompañamiento' },
  { icon: '❤️', label: 'Cariño / Abrazo', use: 'Quiero un abrazo o expresar afecto' }
];

const state = {
  settings: getSettings(),
  cards: [],
  quickQuestions: [],
  usageLogs: [],
  liveEvents: [],
  activeIncomingQuestionId: null,
  dismissedPushQuestionId: null,
  activeFamilyAlertId: null,
  dismissedFamilyAlertId: null,
  activeTeenReplyId: null,
  familyReply: {
    recorder: null,
    transcriber: null,
    isRecording: false,
    audioData: null,
    autoStopTimer: null
  },
  lastNotifiedEventId: null,
  unsubscribeBoard: null,
  firebaseReady: false,
  commTab: 'voice',
  famTab: 'live',
  activeCategory: 'all',
  phraseTokens: [],
  ask: {
    kind: 'yesno', // 'yesno' | 'choice'
    questionText: '¿Querés cenar?',
    icon: '🍽️',
    imageData: './assets/cards/comida.svg',
    optionA: { text: 'Tostadas', icon: '🥪', imageData: null },
    optionB: { text: 'Fruta', icon: '🍎', imageData: null },
    readingSequenceId: 0
  },
  liveQuestionMode: 'yesno',
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

  // Communicator Navigation & Views (solo Mi Voz + Mensajes)
  dom.commNavBtns = document.querySelectorAll('[data-comm-tab]');
  dom.commViews = {
    voice: document.getElementById('comm-view-voice'),
    messages: document.getElementById('comm-view-messages')
  };
  dom.commMessagesList = document.getElementById('comm-messages-list');
  dom.commMsgBadge = document.getElementById('comm-msg-badge');

  // Mi Voz & Doble vía en vivo
  dom.incomingBanner = document.getElementById('incoming-question-banner');
  dom.incomingQuestionText = document.getElementById('incoming-question-text');
  dom.commSentStatus = document.getElementById('comm-sent-status');
  dom.commChannelPill = document.getElementById('comm-channel-pill');
  dom.btnCommEnablePush = document.getElementById('btn-comm-enable-push');
  dom.btnToggleRemoteNotify = document.getElementById('btn-toggle-remote-notify');

  // Modal push visual para pregunta entrante
  dom.pushModal = document.getElementById('push-question-modal');
  dom.pushVisual = document.getElementById('push-question-visual');
  dom.pushTitle = document.getElementById('push-question-title');
  dom.btnPushSpeak = document.getElementById('btn-push-speak');
  dom.btnPushA = document.getElementById('btn-push-a');
  dom.btnPushB = document.getElementById('btn-push-b');
  dom.pushAVisual = document.getElementById('push-a-visual');
  dom.pushBVisual = document.getElementById('push-b-visual');
  dom.pushAText = document.getElementById('push-a-text');
  dom.pushBText = document.getElementById('push-b-text');
  dom.btnPushDismiss = document.getElementById('btn-push-dismiss');

  // Modal de respuesta de Familia en Modo Comunicador
  dom.teenReplyModal = document.getElementById('teen-reply-modal');
  dom.teenReplyOrigVisual = document.getElementById('teen-reply-orig-visual');
  dom.teenReplyContext = document.getElementById('teen-reply-context');
  dom.teenReplyVisual = document.getElementById('teen-reply-visual');
  dom.teenReplyTitle = document.getElementById('teen-reply-title');
  dom.btnTeenPlayReply = document.getElementById('btn-teen-play-reply');
  dom.btnTeenAckReply = document.getElementById('btn-teen-ack-reply');

  // Modal de aviso entrante en Modo Familia
  dom.famAlertModal = document.getElementById('family-alert-modal');
  dom.famAlertTime = document.getElementById('fam-alert-time');
  dom.famAlertVisual = document.getElementById('fam-alert-visual');
  dom.famAlertTitle = document.getElementById('fam-alert-title');
  dom.btnFamRecord = document.getElementById('btn-fam-record');
  dom.btnFamPlayAudio = document.getElementById('btn-fam-play-audio');
  dom.btnFamSendAudio = document.getElementById('btn-fam-send-audio');
  dom.famTranscriptInput = document.getElementById('fam-transcript-input');
  dom.btnFamDictate = document.getElementById('btn-fam-dictate');
  dom.famRecordStatus = document.getElementById('fam-record-status');
  dom.btnFamJustSeen = document.getElementById('btn-fam-just-seen');
  dom.btnFamCloseModal = document.getElementById('btn-fam-close-modal');
  dom.famQuickReplyBtns = document.querySelectorAll('[data-quick-reply]');
  dom.phraseBar = document.getElementById('phrase-bar');
  dom.phraseTokens = document.getElementById('phrase-tokens');
  dom.btnPlayPhrase = document.getElementById('btn-play-phrase');
  dom.btnBackspacePhrase = document.getElementById('btn-backspace-phrase');
  dom.btnClearPhrase = document.getElementById('btn-clear-phrase');
  dom.categoryFilters = document.getElementById('category-filters');
  dom.cardsGrid = document.getElementById('cards-grid');

  // Explorar / Plantillas (ahora en Modo Familia)
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
    templates: document.getElementById('fam-view-templates'),
    history: document.getElementById('fam-view-history'),
    settings: document.getElementById('fam-view-settings')
  };
  dom.liveQuestionForm = document.getElementById('live-question-form');
  dom.btnModeYesNo = document.getElementById('btn-mode-yesno');
  dom.btnModeChoice = document.getElementById('btn-mode-choice');
  dom.liveYesNoFields = document.getElementById('live-yesno-fields');
  dom.liveChoiceFields = document.getElementById('live-choice-fields');
  dom.liveDailyChips = document.getElementById('live-daily-chips');
  dom.liveQuestionInput = document.getElementById('live-question-input');
  dom.liveChoiceA = document.getElementById('live-choice-a');
  dom.liveChoiceB = document.getElementById('live-choice-b');
  dom.liveSelectA = document.getElementById('live-select-a');
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
  dom.iconPreviewGlyph = document.getElementById('icon-preview-glyph');
  dom.iconPreviewTitle = document.getElementById('icon-preview-title');
  dom.iconPreviewDesc = document.getElementById('icon-preview-desc');
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
  // Auto-formato 482-915 al escribir el código de 6 dígitos
  dom.gatePairingInput?.addEventListener('input', (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    e.target.value = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
  });

  // Accesos rápidos del header y enlaces secundarios de la landing
  document.querySelectorAll('[data-landing-go]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.landingGo === 'communicator') {
        dom.btnChooseCommunicator.click();
      } else {
        dom.btnChooseFamily.click();
      }
    });
  });

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
    registerPushToken('family');
  } else if (role === 'communicator') {
    registerPushToken('communicator');
  }
}

/* ==========================================================================
   SINCRONIZACIÓN EN TIEMPO REAL Y NOTIFICACIONES
   ========================================================================== */
const seededCloudBoards = new Set();

function startBoardSubscription() {
  if (state.unsubscribeBoard) {
    state.unsubscribeBoard();
    state.unsubscribeBoard = null;
  }

  const activeCode = state.settings.pairingCode;

  state.unsubscribeBoard = subscribeToBoard(activeCode, {
    onCards: async (cards) => {
      // Si el tablero en la nube está vacío o incompleto (<=1 tarjeta), subir las 12 base sin cortar el bucle
      if (cards.length <= 1 && !seededCloudBoards.has(activeCode)) {
        seededCloudBoards.add(activeCode);
        await importTemplatePack('pack-adolescente');
        await importTemplatePack('pack-emociones');
        const fullLocal = await getCards();
        await Promise.all(fullLocal.map((c) => saveCard(c)));
        state.cards = fullLocal;
        renderCardsGrid();
        populateAskCardSelectors();
        renderManageCardsList();
        return;
      }
      // Deduplicar automáticamente si dos dispositivos subieron tarjetas repetidas con distinto ID
      const seenByText = new Map();
      const duplicateIds = [];
      const uniqueCards = [];

      for (const c of cards) {
        const key = (c.text || '').trim().toLowerCase();
        if (!key) continue;
        if (!seenByText.has(key)) {
          seenByText.set(key, c);
          uniqueCards.push(c);
        } else {
          const prev = seenByText.get(key);
          // Conservar la que tenga foto/audio si la primera no tenía
          if ((!prev.imageData && c.imageData) || (!prev.audioData && c.audioData)) {
            duplicateIds.push(prev.id);
            const idx = uniqueCards.indexOf(prev);
            if (idx !== -1) uniqueCards[idx] = c;
            seenByText.set(key, c);
          } else {
            duplicateIds.push(c.id);
          }
        }
      }

      if (duplicateIds.length > 0) {
        Promise.all(duplicateIds.map((id) => removeCard(id))).catch(() => {});
      }

      state.cards = uniqueCards;
      renderCardsGrid();
      populateAskCardSelectors();
      renderManageCardsList();
    },
    onQuestions: async (questions) => {
      if (questions.length <= 1 && !seededCloudBoards.has(`q-${activeCode}`)) {
        seededCloudBoards.add(`q-${activeCode}`);
        const toUpload = [...state.quickQuestions];
        await Promise.all(toUpload.map((q) => saveQuickQuestion(q)));
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
  renderCommMessagesList();

  // 1. Modo Comunicador: mostrar aviso calmo si hay pregunta pendiente de Familia
  const pendingQuestion = state.liveEvents.find(
    (e) => e.type === 'parent_question' && e.status === 'pending'
  );
  if (pendingQuestion) {
    const isChoice = pendingQuestion.kind === 'choice' && pendingQuestion.optionA && pendingQuestion.optionB;
    const label = isChoice
      ? `"${pendingQuestion.optionA.text}" o "${pendingQuestion.optionB.text}"`
      : `"${pendingQuestion.questionText || pendingQuestion.optionA?.text || 'Pregunta nueva'}"`;
    dom.incomingBanner.hidden = false;
    dom.incomingQuestionText.textContent = `Pregunta de Familia: ${label} — Tocar para responder`;

    // Mostrar automáticamente el modal visual push en Modo Comunicador si aún no fue descartado
    if (
      state.settings.role === 'communicator' &&
      state.dismissedPushQuestionId !== pendingQuestion.id
    ) {
      openPushQuestionModal(pendingQuestion);
      if (navigator.vibrate) navigator.vibrate(60);
    }
  } else {
    dom.incomingBanner.hidden = true;
    dom.pushModal.hidden = true;
  }

  // 2. Modo Comunicador: mostrar modal calmo cuando Familia respondió con audio o texto
  const repliedReq = state.liveEvents.find(
    (e) => e.type === 'teen_request' && e.status === 'replied'
  );
  if (state.settings.role === 'communicator' && repliedReq) {
    openTeenReplyModal(repliedReq);
  } else {
    dom.teenReplyModal.hidden = true;
  }

  // 2b. Modo Comunicador: actualizar confirmación si Familia marcó "Visto"
  const latestReq = state.liveEvents.find((e) => e.type === 'teen_request');
  if (latestReq && (latestReq.status === 'seen' || latestReq.status === 'acknowledged') && !dom.commSentStatus.hidden) {
    dom.commSentStatus.textContent = `Familia vio: "${latestReq.label}" ✓✓`;
  }

  // 3. Modo Familia: abrir modal grande de aviso entrante + disparar notificación nativa
  const pendingTeenAlert = state.liveEvents.find(
    (e) => e.type === 'teen_request' && e.status === 'sent'
  );
  if (
    state.settings.role === 'family' &&
    pendingTeenAlert &&
    state.dismissedFamilyAlertId !== pendingTeenAlert.id &&
    dom.famAlertModal.hidden
  ) {
    openFamilyAlertModal(pendingTeenAlert);
  }

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

async function dispatchTeenRequest(label, category) {
  if (!state.settings.notifyFamilyOnTap) return;
  dom.commSentStatus.textContent = `Enviando "${label}"...`;
  dom.commSentStatus.hidden = false;
  try {
    await sendTeenRequest({ label, category });
    dom.commSentStatus.textContent = `Enviado a Familia: "${label}" ✓`;
  } catch (err) {
    console.error('Error enviando aviso a Familia:', err);
    dom.commSentStatus.textContent = `Error al enviar: ${err?.message || 'sin conexión'}`;
  }
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

      dispatchTeenRequest(phrase, 'respuesta_rapida');
      logUsageEvent({ actionType: 'quick', label: phrase, category: 'respuesta_rapida' });
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

function openPushQuestionModal(question) {
  state.activeIncomingQuestionId = question.id;
  const isChoice = question.kind === 'choice' && question.optionA && question.optionB;

  dom.btnPushA.classList.remove('is-chosen', 'is-dimmed');
  dom.btnPushB.classList.remove('is-chosen', 'is-dimmed');

  // Auto-buscar imagen de tarjeta si la pregunta coincide con alguna tarjeta conocida
  let visualImg = question.imageData || null;
  let visualIcon = question.icon || '❓';
  if (!visualImg && question.questionText) {
    const qLower = question.questionText.toLowerCase();
    const match = state.cards.find((c) => {
      const words = c.text.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      return words.some((w) => qLower.includes(w));
    });
    if (match?.imageData) {
      visualImg = match.imageData;
      visualIcon = match.icon || visualIcon;
    } else if (qLower.includes('cenar') || qLower.includes('comer') || qLower.includes('almorzar')) {
      visualImg = './assets/cards/comida.svg';
    }
  }

  dom.pushVisual.innerHTML = '';
  if (visualImg) {
    const img = document.createElement('img');
    img.src = visualImg;
    img.alt = question.questionText || '';
    dom.pushVisual.appendChild(img);
  } else {
    dom.pushVisual.textContent = isChoice ? '🔀' : visualIcon;
  }

  if (isChoice) {
    dom.pushTitle.textContent = question.questionText || '¿Cuál preferís?';
    dom.btnPushA.classList.remove('push-answer-btn--yes');
    dom.btnPushB.classList.remove('push-answer-btn--no');
    renderAskVisual(dom.pushAVisual, question.optionA);
    renderAskVisual(dom.pushBVisual, question.optionB);
    dom.pushAText.textContent = question.optionA.text;
    dom.pushBText.textContent = question.optionB.text;
  } else {
    dom.pushTitle.textContent = question.questionText || '¿Todo bien?';
    dom.btnPushA.classList.add('push-answer-btn--yes');
    dom.btnPushB.classList.add('push-answer-btn--no');
    dom.pushAVisual.textContent = '✓';
    dom.pushBVisual.textContent = '✕';
    dom.pushAText.textContent = 'SÍ';
    dom.pushBText.textContent = 'NO';
  }

  dom.pushModal.hidden = false;
}

async function answerFromPushModal(side) {
  const pending = state.liveEvents.find(
    (e) => e.id === state.activeIncomingQuestionId && e.type === 'parent_question'
  );
  if (!pending) {
    dom.pushModal.hidden = true;
    return;
  }

  const isA = side === 'A';
  const isChoice = pending.kind === 'choice' && pending.optionA && pending.optionB;
  const answerLabel = isChoice
    ? (isA ? pending.optionA.text : pending.optionB.text)
    : (isA ? 'SÍ' : 'NO');

  const chosenBtn = isA ? dom.btnPushA : dom.btnPushB;
  const otherBtn = isA ? dom.btnPushB : dom.btnPushA;
  chosenBtn.classList.add('is-chosen');
  otherBtn.classList.add('is-dimmed');

  await answerParentQuestion(pending.id, side, answerLabel);
  state.activeIncomingQuestionId = null;
  dom.incomingBanner.hidden = true;
  await speak(isChoice ? answerLabel : (isA ? 'Sí' : 'No'), ttsOptions());

  setTimeout(() => {
    dom.pushModal.hidden = true;
  }, 700);
}

function openTeenReplyModal(ev) {
  state.activeTeenReplyId = ev.id;
  dom.teenReplyContext.textContent = ev.label || 'Tu aviso';

  // 1. Dibujo del pedido original al que está contestando
  const origCard = state.cards.find(
    (c) => c.text.toLowerCase() === (ev.label || '').toLowerCase()
  );
  dom.teenReplyOrigVisual.innerHTML = '';
  if (origCard?.imageData) {
    const img = document.createElement('img');
    img.src = origCard.imageData;
    img.alt = ev.label;
    dom.teenReplyOrigVisual.appendChild(img);
  } else {
    dom.teenReplyOrigVisual.textContent = origCard?.icon || '📣';
  }

  // 2. Imagen representativa de la respuesta (Ya voy / 5 min / Ok / Voz)
  let replyImg = ev.replyImageData || null;
  if (!replyImg) {
    const txt = (ev.replyText || '').toLowerCase();
    if (txt.includes('ya voy')) replyImg = './assets/cards/ya-voy.svg';
    else if (txt.includes('5 min')) replyImg = './assets/cards/cinco-min.svg';
    else if (txt.includes('entendido') || txt.includes('ok')) replyImg = './assets/cards/entendido.svg';
    else if (ev.replyAudioData) replyImg = './assets/cards/audio-familia.svg';
    else replyImg = './assets/cards/entendido.svg';
  }

  dom.teenReplyVisual.innerHTML = '';
  const rImg = document.createElement('img');
  rImg.src = replyImg;
  rImg.alt = ev.replyText || 'Respuesta de Familia';
  dom.teenReplyVisual.appendChild(rImg);

  if (ev.replyAudioData) {
    dom.teenReplyTitle.textContent = ev.replyText || 'Tenés un mensaje de voz de Familia';
    dom.btnTeenPlayReply.textContent = '▶ Escuchar mensaje de Familia';
  } else {
    dom.teenReplyTitle.textContent = ev.replyText || 'Familia vio tu aviso';
    dom.btnTeenPlayReply.textContent = '🔊 Escuchar respuesta';
  }
  dom.teenReplyModal.hidden = false;
}

function openFamilyAlertModal(ev) {
  state.activeFamilyAlertId = ev.id;
  resetFamilyReplyRecorder();

  const time = new Date(ev.createdAt).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  dom.famAlertTime.textContent = time;
  dom.famAlertTitle.textContent = ev.label;

  // Buscar imagen de tarjeta coincidente
  const match = state.cards.find(
    (c) => c.text.toLowerCase() === (ev.label || '').toLowerCase()
  );
  dom.famAlertVisual.innerHTML = '';
  if (match?.imageData) {
    const img = document.createElement('img');
    img.src = match.imageData;
    img.alt = ev.label;
    dom.famAlertVisual.appendChild(img);
  } else {
    dom.famAlertVisual.textContent = match?.icon || '📣';
  }

  dom.famAlertModal.hidden = false;
}

function resetFamilyReplyRecorder() {
  clearTimeout(state.familyReply.autoStopTimer);
  if (state.familyReply.transcriber) {
    state.familyReply.transcriber.stop();
    state.familyReply.transcriber = null;
  }
  state.familyReply.isRecording = false;
  state.familyReply.recorder = null;
  state.familyReply.audioData = null;
  dom.btnFamRecord.textContent = '🎙️ Grabar nota de voz';
  dom.btnFamRecord.classList.remove('btn--danger');
  if (dom.btnFamDictate) {
    dom.btnFamDictate.textContent = '🗣️ Hablar (transcribir en vivo)';
    dom.btnFamDictate.classList.remove('btn--danger');
  }
  dom.btnFamPlayAudio.hidden = true;
  if (dom.famTranscriptInput) dom.famTranscriptInput.value = '';
  dom.famRecordStatus.textContent = '';
}

function bindPhraseBar() {
  dom.btnTeenPlayReply.addEventListener('click', () => {
    const ev = state.liveEvents.find((e) => e.id === state.activeTeenReplyId);
    if (!ev) return;
    if (ev.replyAudioData) {
      playAudioDataUrl(ev.replyAudioData);
    } else if (ev.replyText) {
      speak(ev.replyText, ttsOptions());
    }
  });

  dom.btnTeenAckReply.addEventListener('click', async () => {
    const id = state.activeTeenReplyId;
    dom.teenReplyModal.hidden = true;
    state.activeTeenReplyId = null;
    if (id) {
      await acknowledgeReply(id);
    }
  });

  dom.btnCommEnablePush?.addEventListener('click', async () => {
    if (typeof Notification === 'undefined') return;
    const res = await Notification.requestPermission();
    if (res === 'granted') {
      await registerPushToken('communicator');
      dom.btnCommEnablePush.hidden = true;
    }
  });

  dom.btnToggleRemoteNotify.addEventListener('click', () => {
    const next = !state.settings.notifyFamilyOnTap;
    state.settings = saveSettings({ notifyFamilyOnTap: next });
    applySettingsToUI();
  });

  dom.btnPushSpeak.addEventListener('click', () => {
    const pending = state.liveEvents.find((e) => e.id === state.activeIncomingQuestionId);
    if (!pending) return;
    const isChoice = pending.kind === 'choice' && pending.optionA && pending.optionB;
    const text = isChoice
      ? `${pending.optionA.text}, o ${pending.optionB.text}`
      : (pending.questionText || '');
    speak(text, ttsOptions());
  });

  dom.btnPushA.addEventListener('click', () => answerFromPushModal('A'));
  dom.btnPushB.addEventListener('click', () => answerFromPushModal('B'));
  dom.btnPushDismiss.addEventListener('click', () => {
    state.dismissedPushQuestionId = state.activeIncomingQuestionId;
    dom.pushModal.hidden = true;
  });

  dom.incomingBanner.addEventListener('click', () => {
    const pending = state.liveEvents.find(
      (e) => e.type === 'parent_question' && e.status === 'pending'
    );
    if (!pending) return;
    state.dismissedPushQuestionId = null;
    openPushQuestionModal(pending);
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

      dispatchTeenRequest(card.text, card.category);
      logUsageEvent({ actionType: 'card', label: card.text, category: card.category });
      await speakCard(card, ttsOptions());
      btn.classList.remove('is-speaking');
    });

    dom.cardsGrid.appendChild(btn);
  });
}

/* ==========================================================================
   MODO COMUNICADOR: Pestaña 2 — Mensajes de Familia (solo lectura)
   ========================================================================== */
function renderCommMessagesList() {
  if (!dom.commMessagesList) return;

  const pendingCount = state.liveEvents.filter(
    (e) =>
      (e.type === 'parent_question' && e.status === 'pending') ||
      (e.type === 'teen_request' && e.status === 'replied')
  ).length;

  if (dom.commMsgBadge) {
    dom.commMsgBadge.hidden = pendingCount === 0;
    dom.commMsgBadge.textContent = String(pendingCount);
  }

  const relevant = state.liveEvents.filter(
    (e) =>
      e.type === 'parent_question' ||
      (e.type === 'teen_request' && (e.replyText || e.replyAudioData))
  );

  dom.commMessagesList.innerHTML = '';
  if (relevant.length === 0) {
    dom.commMessagesList.innerHTML =
      '<p class="muted-text">Todavía no hay mensajes ni preguntas de Familia.</p>';
    return;
  }

  relevant.forEach((ev) => {
    const item = document.createElement('div');
    item.className = 'manage-item';

    const time = new Date(ev.createdAt).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const left = document.createElement('div');
    left.className = 'manage-item__info';

    const thumb = document.createElement('div');
    thumb.className = 'manage-item__thumb';

    const textWrap = document.createElement('div');

    if (ev.type === 'parent_question') {
      const isChoice = ev.kind === 'choice' && ev.optionA && ev.optionB;
      const qLabel = isChoice
        ? `${ev.optionA.text} / ${ev.optionB.text}`
        : (ev.questionText || 'Pregunta de Familia');

      if (ev.imageData) {
        const img = document.createElement('img');
        img.src = ev.imageData;
        img.alt = qLabel;
        thumb.appendChild(img);
      } else {
        thumb.textContent = ev.icon || '❓';
      }

      const status =
        ev.status === 'pending'
          ? 'Sin responder'
          : `Respondiste: "${escapeHtml(ev.answerText || '')}" ✓`;

      textWrap.innerHTML = `
        <div class="manage-item__text">${escapeHtml(qLabel)}</div>
        <div class="manage-item__cat">${time} · ${status}</div>
      `;
      left.append(thumb, textWrap);
      item.appendChild(left);

      if (ev.status === 'pending') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn--accent btn--sm';
        btn.textContent = 'Responder';
        btn.addEventListener('click', () => {
          state.dismissedPushQuestionId = null;
          openPushQuestionModal(ev);
        });
        item.appendChild(btn);
      }
    } else {
      // Respuesta de Familia a un aviso del adolescente
      if (ev.replyImageData) {
        const img = document.createElement('img');
        img.src = ev.replyImageData;
        img.alt = ev.replyText || 'Respuesta';
        thumb.appendChild(img);
      } else {
        thumb.textContent = ev.replyAudioData ? '🎙️' : '✓';
      }

      textWrap.innerHTML = `
        <div class="manage-item__text">${escapeHtml(ev.replyText || 'Mensaje de voz de Familia')}</div>
        <div class="manage-item__cat">${time} · Sobre: "${escapeHtml(ev.label)}"</div>
      `;
      left.append(thumb, textWrap);
      item.appendChild(left);

      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'btn btn--emerald btn--sm';
      playBtn.textContent = '▶ Escuchar';
      playBtn.addEventListener('click', () => {
        if (ev.replyAudioData) {
          playAudioDataUrl(ev.replyAudioData);
        } else if (ev.replyText) {
          speak(ev.replyText, ttsOptions());
        }
      });
      item.appendChild(playBtn);
    }

    dom.commMessagesList.appendChild(item);
  });
}

function renderAskDailyChips() {
  if (!dom.liveDailyChips) return;
  dom.liveDailyChips.innerHTML = '';

  state.quickQuestions.forEach((qq) => {
    const isChoiceQQ = Boolean(qq.optionA?.text && qq.optionB?.text);
    const qText = qq.title || qq.optionA?.text || '¿Todo bien?';
    const qIcon = qq.icon || qq.optionA?.icon || '❓';
    const qImg = qq.imageData || qq.optionA?.imageData || null;

    const liveChip = document.createElement('button');
    liveChip.type = 'button';
    liveChip.className = 'chip-btn';
    liveChip.textContent = isChoiceQQ ? qText : `${qIcon} ${qText}`;
    liveChip.addEventListener('click', () => {
      if (isChoiceQQ) {
        dom.btnModeChoice.click();
        dom.liveChoiceA.value = qq.optionA.text;
        dom.liveChoiceB.value = qq.optionB.text;
      } else {
        dom.btnModeYesNo.click();
        dom.liveQuestionInput.value = qText;
        dom.liveQuestionInput.dataset.icon = qIcon;
        dom.liveQuestionInput.dataset.image = qImg || '';
      }
    });
    dom.liveDailyChips.appendChild(liveChip);
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

function populateAskCardSelectors() {
  if (!dom.liveSelectA) return;
  dom.liveSelectA.innerHTML = '<option value="">Elegir pregunta...</option>';
  state.cards.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.icon || ''} ${toQuestionForm(c.text)}`.trim();
    dom.liveSelectA.appendChild(opt);
  });
}

function renderAskVisual(el, opt) {
  el.innerHTML = '';
  if (opt.imageData) {
    const img = document.createElement('img');
    img.src = opt.imageData;
    img.alt = opt.text || '';
    el.appendChild(img);
  } else {
    el.textContent = opt.icon || '❓';
  }
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
    if (res === 'granted') {
      await registerPushToken('family');
      dom.btnEnableNotifications.textContent = isPushConfigured()
        ? '🔔 Push activo'
        : '🔔 Alertas activas';
    } else {
      dom.btnEnableNotifications.textContent = '🔕 Permiso denegado';
    }
  });

  dom.btnModeYesNo.addEventListener('click', () => {
    state.liveQuestionMode = 'yesno';
    dom.btnModeYesNo.classList.add('is-active');
    dom.btnModeChoice.classList.remove('is-active');
    dom.liveYesNoFields.hidden = false;
    dom.liveChoiceFields.hidden = true;
  });

  dom.btnModeChoice.addEventListener('click', () => {
    state.liveQuestionMode = 'choice';
    dom.btnModeChoice.classList.add('is-active');
    dom.btnModeYesNo.classList.remove('is-active');
    dom.liveYesNoFields.hidden = true;
    dom.liveChoiceFields.hidden = false;
  });

  dom.liveSelectA.addEventListener('change', () => {
    const card = state.cards.find((c) => c.id === dom.liveSelectA.value);
    if (!card) return;
    dom.liveQuestionInput.value = toQuestionForm(card.text);
    dom.liveQuestionInput.dataset.icon = card.icon || '❓';
    dom.liveQuestionInput.dataset.image = card.imageData || '';
  });

  dom.liveQuestionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (state.liveQuestionMode === 'choice') {
      const a = dom.liveChoiceA.value.trim();
      const b = dom.liveChoiceB.value.trim();
      if (!a || !b) return;
      await sendParentQuestion({
        kind: 'choice',
        questionText: '¿Cuál preferís?',
        optionA: { text: a, icon: '🅰️', imageData: null },
        optionB: { text: b, icon: '🅱️', imageData: null }
      });
    } else {
      const qText = dom.liveQuestionInput.value.trim();
      if (!qText) return;
      await sendParentQuestion({
        kind: 'yesno',
        questionText: qText,
        icon: dom.liveQuestionInput.dataset.icon || '❓',
        imageData: dom.liveQuestionInput.dataset.image || null
      });
    }

    state.liveEvents = await getLiveEvents();
    renderLiveEvents();
  });

  dom.btnClearEvents.addEventListener('click', async () => {
    await clearLiveEvents();
    state.liveEvents = [];
    renderLiveEvents();
  });

  // Controles del modal de respuesta de Familia (grabación de audio + respuestas rápidas)
  if (!isAudioRecordingSupported()) {
    dom.btnFamRecord.disabled = true;
    dom.famRecordStatus.textContent = 'Micrófono no soportado en este navegador.';
  }

  const stopFamRecording = async () => {
    if (!state.familyReply.isRecording || !state.familyReply.recorder) return;
    clearTimeout(state.familyReply.autoStopTimer);
    const dataUrl = await state.familyReply.recorder.stop();
    state.familyReply.isRecording = false;
    state.familyReply.recorder = null;
    state.familyReply.audioData = dataUrl;
    dom.btnFamRecord.textContent = '🎙️ Regrabar audio';
    dom.btnFamRecord.classList.remove('btn--danger');
    dom.btnFamPlayAudio.hidden = false;
    dom.famRecordStatus.textContent = 'Nota de voz lista. Tocá "📤 Enviar" para mandársela.';
  };

  dom.btnFamRecord.addEventListener('click', async () => {
    // Si estaba dictando en vivo, detener dictado para evitar conflicto de micrófono
    if (state.familyReply.transcriber) {
      state.familyReply.transcriber.stop();
      state.familyReply.transcriber = null;
      dom.btnFamDictate.textContent = '🗣️ Hablar (transcribir en vivo)';
      dom.btnFamDictate.classList.remove('btn--danger');
    }

    if (!state.familyReply.isRecording) {
      try {
        state.familyReply.recorder = await startVoiceRecording();
        state.familyReply.isRecording = true;
        dom.btnFamRecord.textContent = '⏹ Detener audio';
        dom.btnFamRecord.classList.add('btn--danger');
        dom.famRecordStatus.textContent = 'Grabando nota de voz... (máx. 15 seg)';
        state.familyReply.autoStopTimer = setTimeout(stopFamRecording, 15000);
      } catch {
        dom.famRecordStatus.textContent = 'Permiso de micrófono denegado.';
      }
    } else {
      await stopFamRecording();
    }
  });

  // Botón principal de transcripción en vivo (sin conflicto con MediaRecorder, igual que ListeningLab)
  dom.btnFamDictate?.addEventListener('click', async () => {
    if (state.familyReply.isRecording) {
      await stopFamRecording();
    }

    if (state.familyReply.transcriber) {
      state.familyReply.transcriber.stop();
      state.familyReply.transcriber = null;
      dom.btnFamDictate.textContent = '🗣️ Hablar (transcribir en vivo)';
      dom.btnFamDictate.classList.remove('btn--danger');
      dom.famRecordStatus.textContent = 'Transcripción detenida. Tocá "📤 Enviar".';
      return;
    }

    dom.famTranscriptInput.value = '';
    dom.btnFamDictate.textContent = '⏹ Detener transcripción';
    dom.btnFamDictate.classList.add('btn--danger');
    dom.famRecordStatus.textContent = 'Escuchando en vivo... hablá ahora.';

    state.familyReply.transcriber = startLiveTranscript({
      lang: 'es-AR',
      onUpdate: (text) => {
        dom.famTranscriptInput.value = text;
      },
      onError: (errCode) => {
        dom.famRecordStatus.textContent = `No se pudo transcribir (${errCode}). Podés escribir el texto directo.`;
      },
      onEnd: () => {
        state.familyReply.transcriber = null;
        dom.btnFamDictate.textContent = '🗣️ Hablar (transcribir en vivo)';
        dom.btnFamDictate.classList.remove('btn--danger');
        if (dom.famTranscriptInput.value.trim()) {
          dom.famRecordStatus.textContent = 'Listo. Tocá "📤 Enviar" para mandárselo.';
        }
      }
    });
  });

  dom.btnFamPlayAudio.addEventListener('click', () => {
    if (state.familyReply.audioData) playAudioDataUrl(state.familyReply.audioData);
  });

  dom.btnFamSendAudio.addEventListener('click', async () => {
    if (!state.activeFamilyAlertId) return;
    if (state.familyReply.transcriber) {
      state.familyReply.transcriber.stop();
      state.familyReply.transcriber = null;
    }
    if (state.familyReply.isRecording) {
      await stopFamRecording();
    }

    const transcript = dom.famTranscriptInput.value.trim();
    const audio = state.familyReply.audioData;
    if (!transcript && !audio) {
      dom.famRecordStatus.textContent = 'Hablá, escribí o grabá una respuesta antes de enviar.';
      return;
    }

    dom.famRecordStatus.textContent = 'Enviando respuesta...';
    await replyToTeenRequest(state.activeFamilyAlertId, {
      replyText: transcript || 'Mensaje de voz de Familia',
      replyAudioData: audio || null,
      replyImageData: audio ? './assets/cards/audio-familia.svg' : './assets/cards/entendido.svg'
    });
    resetFamilyReplyRecorder();
    dom.famAlertModal.hidden = true;
    state.activeFamilyAlertId = null;
  });

  dom.famQuickReplyBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!state.activeFamilyAlertId) return;
      await replyToTeenRequest(state.activeFamilyAlertId, {
        replyText: btn.dataset.quickReply,
        replyAudioData: null,
        replyImageData: btn.dataset.quickReplyImg || './assets/cards/entendido.svg'
      });
      resetFamilyReplyRecorder();
      dom.famAlertModal.hidden = true;
      state.activeFamilyAlertId = null;
    });
  });

  dom.btnFamJustSeen.addEventListener('click', async () => {
    if (state.activeFamilyAlertId) {
      await markEventSeen(state.activeFamilyAlertId);
    }
    resetFamilyReplyRecorder();
    dom.famAlertModal.hidden = true;
    state.activeFamilyAlertId = null;
  });

  dom.btnFamCloseModal.addEventListener('click', () => {
    state.dismissedFamilyAlertId = state.activeFamilyAlertId;
    resetFamilyReplyRecorder();
    dom.famAlertModal.hidden = true;
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

function updateIconPreview(iconChar) {
  const found = CURATED_ICONS.find((item) => item.icon === iconChar) || CURATED_ICONS[0];
  if (dom.iconPreviewGlyph) dom.iconPreviewGlyph.textContent = found.icon;
  if (dom.iconPreviewTitle) dom.iconPreviewTitle.textContent = found.label;
  if (dom.iconPreviewDesc) dom.iconPreviewDesc.textContent = found.use;
}

function renderIconPicker() {
  dom.iconPicker.innerHTML = '';
  CURATED_ICONS.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `icon-option ${state.form.selectedIcon === item.icon ? 'is-selected' : ''}`;
    btn.textContent = item.icon;
    btn.title = `${item.label}: ${item.use}`;
    btn.dataset.tooltip = `${item.label} — ${item.use}`;
    btn.setAttribute('aria-label', `${item.label}: ${item.use}`);
    btn.addEventListener('click', () => {
      state.form.selectedIcon = item.icon;
      renderIconPicker();
    });
    dom.iconPicker.appendChild(btn);
  });
  updateIconPreview(state.form.selectedIcon);
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

    const isChoiceQQ = Boolean(qq.optionA?.text && qq.optionB?.text);
    const qText = qq.title || qq.optionA?.text || 'Pregunta';
    const info = document.createElement('div');
    info.innerHTML = isChoiceQQ
      ? `
        <div class="manage-item__text">${escapeHtml(qText)}</div>
        <div class="manage-item__cat">${escapeHtml(qq.optionA.text)} vs ${escapeHtml(qq.optionB.text)}</div>
      `
      : `
        <div class="manage-item__text">${escapeHtml(qq.icon || '❓')} ${escapeHtml(qText)}</div>
        <div class="manage-item__cat">Respuesta rápida: SÍ / NO</div>
      `;

    const actions = document.createElement('div');
    actions.className = 'manage-item__actions';

    const sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.className = 'btn btn--accent btn--sm';
    sendBtn.textContent = '📤 Enviar';
    sendBtn.addEventListener('click', async () => {
      if (isChoiceQQ) {
        await sendParentQuestion({
          kind: 'choice',
          questionText: qText,
          optionA: qq.optionA,
          optionB: qq.optionB
        });
      } else {
        await sendParentQuestion({
          kind: 'yesno',
          questionText: qText,
          icon: qq.icon || '❓',
          imageData: qq.imageData || null
        });
      }
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
      const statusTxt =
        ev.status === 'replied'
          ? `Respondido${ev.replyAudioData ? ' con audio 🎙️' : `: "${escapeHtml(ev.replyText)}"`} ✓`
          : ev.status === 'acknowledged'
            ? 'Escuchado por el adolescente ✓✓'
            : ev.status === 'seen'
              ? 'Visto ✓✓'
              : 'Nuevo aviso (sin responder)';
      left.innerHTML = `
        <div class="manage-item__text">📣 ${escapeHtml(ev.label)}</div>
        <div class="manage-item__cat">${time} · ${statusTxt}</div>
      `;
    } else {
      const qLabel =
        ev.kind === 'choice' && ev.optionA && ev.optionB
          ? `${ev.optionA.text} / ${ev.optionB.text}`
          : (ev.questionText || `${ev.optionA?.text || ''} / ${ev.optionB?.text || ''}`);
      const statusText =
        ev.status === 'answered'
          ? `Respondió: "${escapeHtml(ev.answerText)}" ✓`
          : ev.status === 'seen'
            ? 'Visto ✓✓'
            : 'Esperando respuesta...';
      left.innerHTML = `
        <div class="manage-item__text">❓ ${escapeHtml(qLabel)}</div>
        <div class="manage-item__cat">${time} · ${statusText}</div>
      `;
    }

    item.appendChild(left);

    if (ev.type === 'teen_request' && ev.status === 'sent') {
      const replyBtn = document.createElement('button');
      replyBtn.type = 'button';
      replyBtn.className = 'btn btn--accent btn--sm';
      replyBtn.textContent = '🎙️ Responder';
      replyBtn.addEventListener('click', () => openFamilyAlertModal(ev));
      item.appendChild(replyBtn);
    } else if (ev.status === 'answered') {
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
  const formattedCode = `${code.slice(0, 3)}-${code.slice(3)}`;
  dom.displayPairingCode.textContent = formattedCode;
  dom.syncStatusPill.textContent = state.firebaseReady
    ? '● Conectado a Firebase en tiempo real'
    : isFirebaseConfigured()
      ? '● Sin conexión (modo local)'
      : '● Modo Local (sincroniza entre pestañas)';

  if (dom.commChannelPill) {
    dom.commChannelPill.textContent = state.firebaseReady
      ? `● Canal ${formattedCode}`
      : `○ Canal ${formattedCode} (local)`;
    dom.commChannelPill.classList.toggle('is-online', state.firebaseReady);
  }

  const notifyOn = Boolean(state.settings.notifyFamilyOnTap);
  dom.btnToggleRemoteNotify.classList.toggle('is-active', notifyOn);
  dom.btnToggleRemoteNotify.setAttribute('aria-pressed', String(notifyOn));
  dom.btnToggleRemoteNotify.textContent = notifyOn
    ? '📡 Avisar a Familia: Activado'
    : '📡 Avisar a Familia: Solo voz local';

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    dom.btnEnableNotifications.textContent = isPushConfigured()
      ? '🔔 Push activo'
      : '🔔 Alertas activas';
    if (dom.btnCommEnablePush) dom.btnCommEnablePush.hidden = true;
  } else if (dom.btnCommEnablePush && typeof Notification !== 'undefined') {
    dom.btnCommEnablePush.hidden = false;
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
  renderCommMessagesList();
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

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

import { MUSIC_CATEGORIES } from './musicCatalog.js';
import {
  loadArgentineStations,
  filterStationsLocal,
  searchRadioStations,
  searchCities,
  fetchWeatherSummary,
  getDateTimeSummary
} from './seniorServices.js';
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
  saveBoardPreference,
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
  teenVoice: {
    recorder: null,
    isRecording: false,
    autoStopTimer: null
  },
  music: {
    audio: null,
    trackIndex: 0,
    isPlaying: false,
    previewAudio: null,
    previewPlaying: false,
    previewTrackIndex: 0
  },
  radio: {
    audio: null,
    isPlaying: false,
    previewAudio: null,
    previewPlaying: false,
    directory: [],
    band: 'all',
    searchDebounce: null,
    searchResults: []
  },
  weather: {
    searchResults: []
  },
  commInfoSpeech: '',
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
  dom.btnTeenVoiceMsg = document.getElementById('btn-teen-voice-msg');
  dom.btnCommEnablePush = document.getElementById('btn-comm-enable-push');
  dom.btnToggleRemoteNotify = document.getElementById('btn-toggle-remote-notify');

  // Modal de grabación de mensaje hablado del adolescente
  dom.teenRecordModal = document.getElementById('teen-record-modal');
  dom.teenRecordTitle = document.getElementById('teen-record-title');
  dom.teenRecordStatus = document.getElementById('teen-record-status');
  dom.btnTeenSendVoice = document.getElementById('btn-teen-send-voice');
  dom.btnTeenCancelVoice = document.getElementById('btn-teen-cancel-voice');

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
  dom.btnFamPlayTeenAudio = document.getElementById('btn-fam-play-teen-audio');
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
  dom.manageCardsSearch = document.getElementById('manage-cards-search');
  dom.btnShowAllCards = document.getElementById('btn-show-all-cards');
  dom.btnHideAllCards = document.getElementById('btn-hide-all-cards');
  dom.dropzoneVisible = document.getElementById('dropzone-visible');
  dom.dropzoneHidden = document.getElementById('dropzone-hidden');
  dom.visibleCardsCount = document.getElementById('visible-cards-count');
  dom.hiddenCardsCount = document.getElementById('hidden-cards-count');
  dom.manageVisibleList = document.getElementById('manage-visible-list');
  dom.manageHiddenList = document.getElementById('manage-hidden-list');

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
  dom.btnTestSettingVoice = document.getElementById('btn-test-setting-voice');
  dom.settingRate = document.getElementById('setting-rate');
  dom.rateValue = document.getElementById('rate-value');
  dom.settingPhraseBar = document.getElementById('setting-phrase-bar');
  dom.settingTeenVoiceMsg = document.getElementById('setting-teen-voice-msg');
  dom.settingMusicCategory = document.getElementById('setting-music-category');
  dom.btnTestMusic = document.getElementById('btn-test-music');
  dom.musicPreviewStatus = document.getElementById('music-preview-status');
  dom.settingMusicVolume = document.getElementById('setting-music-volume');
  dom.musicVolumeValue = document.getElementById('music-volume-value');
  dom.joinCodeInput = document.getElementById('join-code-input');
  dom.btnJoinCode = document.getElementById('btn-join-code');

  // Funciones para personas mayores (Radio, Clima, Día y Hora)
  dom.commInfoModal = document.getElementById('comm-info-modal');
  dom.commInfoEyebrow = document.getElementById('comm-info-eyebrow');
  dom.commInfoIcon = document.getElementById('comm-info-icon');
  dom.commInfoHeadline = document.getElementById('comm-info-headline');
  dom.commInfoDetails = document.getElementById('comm-info-details');
  dom.btnCommInfoRepeat = document.getElementById('btn-comm-info-repeat');
  dom.btnCommInfoClose = document.getElementById('btn-comm-info-close');

  dom.settingEnableRadio = document.getElementById('setting-enable-radio');
  dom.radioBandBtns = document.querySelectorAll('[data-radio-band]');
  dom.radioSearchInput = document.getElementById('radio-search-input');
  dom.btnSearchRadio = document.getElementById('btn-search-radio');
  dom.radioResultsRow = document.getElementById('radio-results-row');
  dom.radioResultsSelect = document.getElementById('radio-results-select');
  dom.btnSaveRadio = document.getElementById('btn-save-radio');
  dom.radioActiveLabel = document.getElementById('radio-active-label');
  dom.btnTestRadio = document.getElementById('btn-test-radio');
  dom.radioSearchStatus = document.getElementById('radio-search-status');

  dom.settingEnableWeather = document.getElementById('setting-enable-weather');
  dom.weatherCityInput = document.getElementById('weather-city-input');
  dom.btnSearchCity = document.getElementById('btn-search-city');
  dom.weatherResultsRow = document.getElementById('weather-results-row');
  dom.weatherCityResults = document.getElementById('weather-city-results');
  dom.btnSaveCity = document.getElementById('btn-save-city');
  dom.weatherActiveLabel = document.getElementById('weather-active-label');
  dom.btnTestWeather = document.getElementById('btn-test-weather');
  dom.weatherSearchStatus = document.getElementById('weather-search-status');

  dom.settingEnableDateTime = document.getElementById('setting-enable-datetime');

  dom.settingEnableContactCall = document.getElementById('setting-enable-contact-call');
  dom.contactCallName = document.getElementById('contact-call-name');
  dom.contactCallPhone = document.getElementById('contact-call-phone');
  dom.contactCallMode = document.getElementById('contact-call-mode');
  dom.btnSaveContactCall = document.getElementById('btn-save-contact-call');
  dom.contactCallStatus = document.getElementById('contact-call-status');

  dom.settingEnableHealthCall = document.getElementById('setting-enable-health-call');
  dom.healthCallName = document.getElementById('health-call-name');
  dom.healthCallPhone = document.getElementById('health-call-phone');
  dom.btnSaveHealthCall = document.getElementById('btn-save-health-call');
  dom.healthCallStatus = document.getElementById('health-call-status');

  // Controles adicionales del rediseño Stitch
  dom.btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
  dom.speedPresetBtns = document.querySelectorAll('[data-speed-preset]');
  dom.settingLargeText = document.getElementById('setting-large-text');
  dom.autosaveBanner = document.getElementById('stitch-autosave-banner');
  dom.btnDismissAutosave = document.getElementById('btn-dismiss-autosave');
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
  stopMusicPreview();
  stopRadioPreview();
  if (role !== 'communicator' && state.radio.audio) {
    state.radio.audio.pause();
    state.radio.isPlaying = false;
  }
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
    },
    onBoardSettings: (remoteSettings) => {
      const updates = {};
      if (typeof remoteSettings.allowTeenVoiceMessage === 'boolean') {
        updates.allowTeenVoiceMessage = remoteSettings.allowTeenVoiceMessage;
      }
      if (typeof remoteSettings.musicCategory === 'string') {
        updates.musicCategory = remoteSettings.musicCategory;
      }
      if (typeof remoteSettings.musicVolume === 'number' && !Number.isNaN(remoteSettings.musicVolume)) {
        updates.musicVolume = Math.min(1, Math.max(0.1, remoteSettings.musicVolume));
      }
      if (typeof remoteSettings.enableRadioCard === 'boolean') {
        updates.enableRadioCard = remoteSettings.enableRadioCard;
      }
      if (typeof remoteSettings.radioName === 'string') {
        updates.radioName = remoteSettings.radioName;
      }
      if (typeof remoteSettings.radioUrl === 'string') {
        updates.radioUrl = remoteSettings.radioUrl;
      }
      if (typeof remoteSettings.enableWeatherCard === 'boolean') {
        updates.enableWeatherCard = remoteSettings.enableWeatherCard;
      }
      if (typeof remoteSettings.weatherCity === 'string') {
        updates.weatherCity = remoteSettings.weatherCity;
      }
      if (typeof remoteSettings.weatherLat === 'number') {
        updates.weatherLat = remoteSettings.weatherLat;
      }
      if (typeof remoteSettings.weatherLon === 'number') {
        updates.weatherLon = remoteSettings.weatherLon;
      }
      if (typeof remoteSettings.enableDateTimeCard === 'boolean') {
        updates.enableDateTimeCard = remoteSettings.enableDateTimeCard;
      }
      if (typeof remoteSettings.enableContactCall === 'boolean') {
        updates.enableContactCall = remoteSettings.enableContactCall;
      }
      if (typeof remoteSettings.contactCallName === 'string') {
        updates.contactCallName = remoteSettings.contactCallName;
      }
      if (typeof remoteSettings.contactCallPhone === 'string') {
        updates.contactCallPhone = remoteSettings.contactCallPhone;
      }
      if (typeof remoteSettings.contactCallMode === 'string') {
        updates.contactCallMode = remoteSettings.contactCallMode;
      }
      if (typeof remoteSettings.enableHealthCall === 'boolean') {
        updates.enableHealthCall = remoteSettings.enableHealthCall;
      }
      if (typeof remoteSettings.healthCallName === 'string') {
        updates.healthCallName = remoteSettings.healthCallName;
      }
      if (typeof remoteSettings.healthCallPhone === 'string') {
        updates.healthCallPhone = remoteSettings.healthCallPhone;
      }
      if (typeof remoteSettings.largeTextMode === 'boolean') {
        updates.largeTextMode = remoteSettings.largeTextMode;
      }
      if (Object.keys(updates).length > 0) {
        state.settings = saveSettings(updates);
        if (updates.musicCategory === 'off' && state.music.audio) {
          state.music.audio.pause();
          state.music.isPlaying = false;
        }
        if (updates.enableRadioCard === false && state.radio.audio) {
          state.radio.audio.pause();
          state.radio.isPlaying = false;
        }
        if (typeof updates.musicVolume === 'number') {
          if (state.music.audio) state.music.audio.volume = updates.musicVolume;
          if (state.music.previewAudio) state.music.previewAudio.volume = updates.musicVolume;
          if (state.radio.audio) state.radio.audio.volume = updates.musicVolume;
          if (state.radio.previewAudio) state.radio.previewAudio.volume = updates.musicVolume;
        }
        applySettingsToUI();
        renderCardsGrid();
      }
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
  if (ev.audioData) {
    const img = document.createElement('img');
    img.src = './assets/cards/audio-familia.svg';
    img.alt = 'Mensaje hablado';
    dom.famAlertVisual.appendChild(img);
  } else if (match?.imageData) {
    const img = document.createElement('img');
    img.src = match.imageData;
    img.alt = ev.label;
    dom.famAlertVisual.appendChild(img);
  } else {
    dom.famAlertVisual.textContent = match?.icon || '📣';
  }

  if (dom.btnFamPlayTeenAudio) {
    dom.btnFamPlayTeenAudio.hidden = !ev.audioData;
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

function renderMusicPlayerUI() {
  if (typeof window.__renderMusicPlayerUI === 'function') {
    window.__renderMusicPlayerUI();
  }
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

  // Botón de mensaje hablado del adolescente (1 toque para grabar, 1 toque para enviar)
  const closeTeenVoiceModal = async (shouldSend) => {
    clearTimeout(state.teenVoice.autoStopTimer);
    const rec = state.teenVoice.recorder;
    state.teenVoice.recorder = null;
    state.teenVoice.isRecording = false;

    if (rec && shouldSend) {
      dom.teenRecordTitle.textContent = 'Enviando mensaje...';
      dom.btnTeenSendVoice.disabled = true;
      try {
        const audioData = await rec.stop();
        await sendTeenRequest({
          label: 'Mensaje hablado 🎙️',
          category: 'mensaje_hablado',
          audioData
        });
        dom.commSentStatus.textContent = 'Enviado a Familia: "Mensaje hablado 🎙️" ✓';
        dom.commSentStatus.hidden = false;
      } catch (err) {
        dom.commSentStatus.textContent = 'No se pudo enviar el mensaje de voz.';
        dom.commSentStatus.hidden = false;
      }
      dom.btnTeenSendVoice.disabled = false;
    } else if (rec) {
      rec.stop().catch(() => {});
    }

    dom.teenRecordModal.hidden = true;
  };

  dom.btnTeenVoiceMsg?.addEventListener('click', async () => {
    if (!isAudioRecordingSupported()) {
      dom.commSentStatus.textContent = 'Tu navegador no permite grabar audio.';
      dom.commSentStatus.hidden = false;
      return;
    }
    try {
      stopAllAudio();
      dom.teenRecordTitle.textContent = 'Grabando tu mensaje...';
      dom.teenRecordStatus.textContent = 'Hablá tranquilo/a y tocá Enviar cuando termines.';
      dom.btnTeenSendVoice.disabled = false;
      dom.teenRecordModal.hidden = false;

      state.teenVoice.recorder = await startVoiceRecording();
      state.teenVoice.isRecording = true;
      state.teenVoice.autoStopTimer = setTimeout(() => {
        if (state.teenVoice.isRecording) {
          closeTeenVoiceModal(true);
        }
      }, 15000);
    } catch {
      dom.teenRecordModal.hidden = true;
      dom.commSentStatus.textContent = 'Necesitás permitir el micrófono para enviar mensajes hablados.';
      dom.commSentStatus.hidden = false;
    }
  });

  dom.btnTeenSendVoice?.addEventListener('click', () => closeTeenVoiceModal(true));
  dom.btnTeenCancelVoice?.addEventListener('click', () => closeTeenVoiceModal(false));

  // Reproductor directo por tarjeta (1 toque enciende, 1 toque pausa)
  const ensureMusicAudio = () => {
    if (!state.music.audio) {
      const audio = new Audio();
      audio.volume = state.settings.musicVolume ?? 0.65;
      audio.addEventListener('ended', () => {
        playMusicTrack(state.music.trackIndex + 1);
      });
      audio.addEventListener('error', () => {
        state.music.isPlaying = false;
        dom.commSentStatus.textContent = 'Todavía falta subir los archivos MP3 en assets/music/.';
        dom.commSentStatus.hidden = false;
        renderCardsGrid();
      });
      state.music.audio = audio;
    }
    return state.music.audio;
  };

  const playMusicTrack = (index) => {
    const key = state.settings.musicCategory || 'calma';
    const cat = MUSIC_CATEGORIES[key] || MUSIC_CATEGORIES.calma;
    const total = cat.tracks.length;
    const safeIdx = ((index % total) + total) % total;
    state.music.trackIndex = safeIdx;
    const track = cat.tracks[safeIdx];

    const audio = ensureMusicAudio();
    audio.volume = state.settings.musicVolume ?? 0.65;
    audio.src = track.src;
    audio
      .play()
      .then(() => {
        state.music.isPlaying = true;
        renderCardsGrid();
      })
      .catch(() => {
        state.music.isPlaying = false;
        dom.commSentStatus.textContent = 'Todavía falta subir los archivos MP3 en assets/music/.';
        dom.commSentStatus.hidden = false;
        renderCardsGrid();
      });
  };

  window.__toggleMusicCard = () => {
    const audio = ensureMusicAudio();
    if (state.music.isPlaying) {
      audio.pause();
      state.music.isPlaying = false;
      renderCardsGrid();
    } else {
      // Si la radio estaba sonando, apagarla para que no se superpongan
      if (state.radio.audio && state.radio.isPlaying) {
        state.radio.audio.pause();
        state.radio.isPlaying = false;
      }
      playMusicTrack(state.music.trackIndex);
    }
  };

  // Reproductor de Radio en vivo (1 toque prende, 1 toque apaga)
  const ensureRadioAudio = () => {
    if (!state.radio.audio) {
      const audio = new Audio();
      audio.volume = state.settings.musicVolume ?? 0.65;
      audio.addEventListener('error', () => {
        if (!audio.getAttribute('src')) return;
        state.radio.isPlaying = false;
        dom.commSentStatus.textContent = 'No se pudo conectar con esta radio ahora. Probá elegir otra en Ajustes.';
        dom.commSentStatus.hidden = false;
        renderCardsGrid();
      });
      state.radio.audio = audio;
    }
    return state.radio.audio;
  };

  window.__toggleRadioCard = () => {
    const url = state.settings.radioUrl;
    if (!url) {
      dom.commSentStatus.textContent = 'Elegí una radio en Modo Familia → Ajustes.';
      dom.commSentStatus.hidden = false;
      return;
    }
    const audio = ensureRadioAudio();
    if (state.radio.isPlaying) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      state.radio.isPlaying = false;
      renderCardsGrid();
    } else {
      // Si la música MP3 estaba sonando, pausarla
      if (state.music.audio && state.music.isPlaying) {
        state.music.audio.pause();
        state.music.isPlaying = false;
      }
      audio.volume = state.settings.musicVolume ?? 0.65;
      audio.src = url;
      audio
        .play()
        .then(() => {
          state.radio.isPlaying = true;
          renderCardsGrid();
        })
        .catch(() => {
          state.radio.isPlaying = false;
          dom.commSentStatus.textContent = 'No se pudo conectar con esta radio ahora.';
          dom.commSentStatus.hidden = false;
          renderCardsGrid();
        });
    }
  };

  const openCommInfoModal = ({ eyebrow, icon, headline, details, speechText }) => {
    state.commInfoSpeech = speechText || '';
    if (dom.commInfoEyebrow) dom.commInfoEyebrow.textContent = eyebrow || 'Información';
    if (dom.commInfoIcon) dom.commInfoIcon.textContent = icon || 'ℹ️';
    if (dom.commInfoHeadline) dom.commInfoHeadline.textContent = headline || '';
    if (dom.commInfoDetails) dom.commInfoDetails.textContent = details || '';
    if (dom.commInfoModal) dom.commInfoModal.hidden = false;
    if (speechText) {
      speak(speechText, ttsOptions());
    }
  };

  dom.btnCommInfoRepeat?.addEventListener('click', () => {
    if (state.commInfoSpeech) {
      speak(state.commInfoSpeech, ttsOptions());
    }
  });

  dom.btnCommInfoClose?.addEventListener('click', () => {
    if (dom.commInfoModal) dom.commInfoModal.hidden = true;
  });

  window.__openWeatherCard = async () => {
    const city = state.settings.weatherCity || 'Buenos Aires';
    const lat = typeof state.settings.weatherLat === 'number' ? state.settings.weatherLat : -34.6037;
    const lon = typeof state.settings.weatherLon === 'number' ? state.settings.weatherLon : -58.3816;

    openCommInfoModal({
      eyebrow: `Clima en ${city}`,
      icon: '🌤️',
      headline: 'Consultando el tiempo...',
      details: 'Un segundo por favor',
      speechText: ''
    });

    try {
      const summary = await fetchWeatherSummary({ city, lat, lon });
      openCommInfoModal({
        eyebrow: `Clima en ${city}`,
        icon: summary.icon,
        headline: summary.headline,
        details: summary.details,
        speechText: summary.speechText
      });
    } catch {
      openCommInfoModal({
        eyebrow: `Clima en ${city}`,
        icon: '📡',
        headline: 'Sin conexión',
        details: 'No se pudo consultar el clima en este momento.',
        speechText: 'En este momento no hay conexión para consultar el clima.'
      });
    }
  };

  window.__openDateTimeCard = () => {
    const summary = getDateTimeSummary(new Date());
    openCommInfoModal({
      eyebrow: 'Día y Hora de Hoy',
      icon: summary.icon,
      headline: summary.headline,
      details: summary.details,
      speechText: summary.speechText
    });
  };

  window.__triggerDirectCall = ({ name, phone, mode = 'tel' }) => {
    const cleanTel = String(phone || '').replace(/[^\d+*#]/g, '');
    if (!cleanTel) return;
    const label = name || 'Contacto';

    if (mode === 'whatsapp') {
      let waDigits = cleanTel.replace(/\D/g, '');
      // Si es número argentino local de 10 dígitos (ej. 1155554444), agregar prefijo 549
      if (waDigits.length === 10) waDigits = `549${waDigits}`;
      speak(`Abriendo WhatsApp de ${label}`, ttsOptions());
      window.open(`https://wa.me/${waDigits}`, '_blank', 'noopener');
    } else {
      speak(`Llamando a ${label}`, ttsOptions());
      window.location.href = `tel:${cleanTel}`;
    }
  };

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
  const visibleCards = state.cards.filter((c) => !c.hidden);
  const filtered =
    state.activeCategory === 'all'
      ? visibleCards
      : visibleCards.filter((c) => c.category === state.activeCategory);

  dom.cardsGrid.innerHTML = '';

  // Tarjeta integrada de Música (1 toque reproduce, 1 toque pausa; categoría elegida en Modo Familia)
  const musicEnabled = (state.settings.musicCategory || 'calma') !== 'off';
  const showMusicCard =
    musicEnabled && (state.activeCategory === 'all' || state.activeCategory === 'ocio');

  if (showMusicCard) {
    const musicBtn = document.createElement('button');
    musicBtn.type = 'button';
    musicBtn.className = `aac-card ${state.music.isPlaying ? 'is-music-playing' : ''}`;
    musicBtn.setAttribute('aria-pressed', String(state.music.isPlaying));
    musicBtn.setAttribute('aria-label', state.music.isPlaying ? 'Pausar música' : 'Escuchar música');

    const visual = document.createElement('div');
    visual.className = 'aac-card__visual';
    const img = document.createElement('img');
    img.src = state.music.isPlaying
      ? './assets/cards/musica-pausa.svg'
      : './assets/cards/musica.svg';
    img.alt = state.music.isPlaying ? 'Pausar música' : 'Música';
    visual.appendChild(img);

    const label = document.createElement('span');
    label.className = 'aac-card__text';
    label.textContent = state.music.isPlaying ? '⏸ Pausar música' : '🎵 Escuchar música';

    musicBtn.append(visual, label);
    musicBtn.addEventListener('click', () => {
      if (typeof window.__toggleMusicCard === 'function') {
        window.__toggleMusicCard();
      }
    });
    dom.cardsGrid.appendChild(musicBtn);
  }

  // Tarjeta opcional de Radio en vivo (1 toque prende, 1 toque apaga)
  const radioEnabled = Boolean(state.settings.enableRadioCard && state.settings.radioUrl);
  const showRadioCard =
    radioEnabled && (state.activeCategory === 'all' || state.activeCategory === 'ocio');

  if (showRadioCard) {
    const radioBtn = document.createElement('button');
    radioBtn.type = 'button';
    radioBtn.className = `aac-card ${state.radio.isPlaying ? 'is-music-playing' : ''}`;
    radioBtn.setAttribute('aria-pressed', String(state.radio.isPlaying));
    const stationShort = (state.settings.radioName || 'Radio').slice(0, 22);
    radioBtn.setAttribute('aria-label', state.radio.isPlaying ? 'Apagar radio' : `Escuchar ${stationShort}`);

    const visual = document.createElement('div');
    visual.className = 'aac-card__visual';
    const img = document.createElement('img');
    img.src = state.radio.isPlaying
      ? './assets/cards/radio-pausa.svg'
      : './assets/cards/radio.svg';
    img.alt = state.radio.isPlaying ? 'Apagar radio' : 'Radio en vivo';
    visual.appendChild(img);

    const label = document.createElement('span');
    label.className = 'aac-card__text';
    label.textContent = state.radio.isPlaying ? '⏸ Apagar radio' : `📻 ${stationShort}`;

    radioBtn.append(visual, label);
    radioBtn.addEventListener('click', () => {
      if (typeof window.__toggleRadioCard === 'function') {
        window.__toggleRadioCard();
      }
    });
    dom.cardsGrid.appendChild(radioBtn);
  }

  // Tarjeta opcional de Estado del Tiempo (Clima hablado)
  const weatherEnabled = Boolean(state.settings.enableWeatherCard);
  const showWeatherCard =
    weatherEnabled && (state.activeCategory === 'all' || state.activeCategory === 'necesidades');

  if (showWeatherCard) {
    const weatherBtn = document.createElement('button');
    weatherBtn.type = 'button';
    weatherBtn.className = 'aac-card';
    weatherBtn.setAttribute('aria-label', '¿Cómo está el tiempo?');

    const visual = document.createElement('div');
    visual.className = 'aac-card__visual';
    const img = document.createElement('img');
    img.src = './assets/cards/clima.svg';
    img.alt = 'Estado del tiempo';
    visual.appendChild(img);

    const label = document.createElement('span');
    label.className = 'aac-card__text';
    label.textContent = '🌤️ ¿Cómo está el tiempo?';

    weatherBtn.append(visual, label);
    weatherBtn.addEventListener('click', () => {
      if (typeof window.__openWeatherCard === 'function') {
        window.__openWeatherCard();
      }
    });
    dom.cardsGrid.appendChild(weatherBtn);
  }

  // Tarjeta opcional de Día y Hora (funciona sin internet)
  const dateTimeEnabled = Boolean(state.settings.enableDateTimeCard);
  const showDateTimeCard =
    dateTimeEnabled && (state.activeCategory === 'all' || state.activeCategory === 'necesidades');

  if (showDateTimeCard) {
    const dtBtn = document.createElement('button');
    dtBtn.type = 'button';
    dtBtn.className = 'aac-card';
    dtBtn.setAttribute('aria-label', '¿Qué día y hora es?');

    const visual = document.createElement('div');
    visual.className = 'aac-card__visual';
    const img = document.createElement('img');
    img.src = './assets/cards/reloj.svg';
    img.alt = 'Día y hora';
    visual.appendChild(img);

    const label = document.createElement('span');
    label.className = 'aac-card__text';
    label.textContent = '🕒 ¿Qué día y hora es?';

    dtBtn.append(visual, label);
    dtBtn.addEventListener('click', () => {
      if (typeof window.__openDateTimeCard === 'function') {
        window.__openDateTimeCard();
      }
    });
    dom.cardsGrid.appendChild(dtBtn);
  }

  // Tarjeta opcional de llamada directa a Persona de Contacto (ej: Alicia)
  const contactCallEnabled = Boolean(state.settings.enableContactCall && state.settings.contactCallPhone);
  const showContactCallCard =
    contactCallEnabled && (state.activeCategory === 'all' || state.activeCategory === 'familia');

  if (showContactCallCard) {
    const contactName = (state.settings.contactCallName || 'Contacto').trim();
    const isWa = state.settings.contactCallMode === 'whatsapp';
    const callBtn = document.createElement('button');
    callBtn.type = 'button';
    callBtn.className = 'aac-card';
    callBtn.setAttribute('aria-label', `${isWa ? 'WhatsApp a' : 'Llamar a'} ${contactName}`);

    const visual = document.createElement('div');
    visual.className = 'aac-card__visual';
    const img = document.createElement('img');
    img.src = './assets/cards/llamar-contacto.svg';
    img.alt = `Llamar a ${contactName}`;
    visual.appendChild(img);

    const label = document.createElement('span');
    label.className = 'aac-card__text';
    label.textContent = isWa ? `💬 WhatsApp: ${contactName}` : `📞 Llamar a ${contactName}`;

    callBtn.append(visual, label);
    callBtn.addEventListener('click', () => {
      if (typeof window.__triggerDirectCall === 'function') {
        window.__triggerDirectCall({
          name: contactName,
          phone: state.settings.contactCallPhone,
          mode: state.settings.contactCallMode || 'tel'
        });
      }
    });
    dom.cardsGrid.appendChild(callBtn);
  }

  // Tarjeta opcional de llamada directa a Obra Social / Salud (ej: PAMI)
  const healthCallEnabled = Boolean(state.settings.enableHealthCall && state.settings.healthCallPhone);
  const showHealthCallCard =
    healthCallEnabled && (state.activeCategory === 'all' || state.activeCategory === 'necesidades');

  if (showHealthCallCard) {
    const healthName = (state.settings.healthCallName || 'Obra Social').trim();
    const healthBtn = document.createElement('button');
    healthBtn.type = 'button';
    healthBtn.className = 'aac-card';
    healthBtn.setAttribute('aria-label', `Llamar a ${healthName}`);

    const visual = document.createElement('div');
    visual.className = 'aac-card__visual';
    const img = document.createElement('img');
    img.src = './assets/cards/llamar-salud.svg';
    img.alt = `Llamar a ${healthName}`;
    visual.appendChild(img);

    const label = document.createElement('span');
    label.className = 'aac-card__text';
    label.textContent = `🏥 Llamar a ${healthName}`;

    healthBtn.append(visual, label);
    healthBtn.addEventListener('click', () => {
      if (typeof window.__triggerDirectCall === 'function') {
        window.__triggerDirectCall({
          name: healthName,
          phone: state.settings.healthCallPhone,
          mode: 'tel'
        });
      }
    });
    dom.cardsGrid.appendChild(healthBtn);
  }

  if (
    filtered.length === 0 &&
    !showMusicCard &&
    !showRadioCard &&
    !showWeatherCard &&
    !showDateTimeCard &&
    !showContactCallCard &&
    !showHealthCallCard
  ) {
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

  dom.btnFamPlayTeenAudio?.addEventListener('click', () => {
    const ev = state.liveEvents.find((e) => e.id === state.activeFamilyAlertId);
    if (ev?.audioData) {
      playAudioDataUrl(ev.audioData);
    }
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
      setTimeout(() => (dom.btnCopyCode.textContent = '📋 Copiar'), 1800);
    } catch {}
  });

  dom.btnShareWhatsapp?.addEventListener('click', () => {
    const code = state.settings.pairingCode || '';
    const formatted = code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
    const msg = `Hola! Acá tenés el código para vincular Mi Espacio: ${formatted} — Entrá desde https://gyunik.github.io/mi-espacio/`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
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

      if (target !== 'settings') {
        stopMusicPreview();
        stopRadioPreview();
      } else if (typeof window.__ensureRadioDirectory === 'function') {
        window.__ensureRadioDirectory();
      }
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

    const existingCard = state.form.editingId
      ? state.cards.find((c) => c.id === state.form.editingId)
      : null;

    await saveCard({
      id: state.form.editingId || undefined,
      text,
      category: dom.cardCategory.value,
      icon: state.form.selectedIcon,
      imageData: state.form.imageData,
      audioData: state.form.audioData,
      hidden: Boolean(existingCard?.hidden),
      authorRole: 'family'
    });

    resetCardForm();
    await refreshAllData();
  });

  // Organizar tarjetas: Drag & Drop + Filtro + Mostrar/Ocultar todas
  dom.manageCardsSearch?.addEventListener('input', () => {
    renderManageCardsList();
  });

  const bindCardDropzone = (zoneEl, targetHidden) => {
    if (!zoneEl) return;
    zoneEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zoneEl.classList.add('is-drag-over');
    });
    zoneEl.addEventListener('dragleave', (e) => {
      if (!zoneEl.contains(e.relatedTarget)) {
        zoneEl.classList.remove('is-drag-over');
      }
    });
    zoneEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      zoneEl.classList.remove('is-drag-over');
      const cardId = e.dataTransfer.getData('text/plain');
      if (cardId) {
        await setCardHidden(cardId, targetHidden);
      }
    });
  };

  bindCardDropzone(dom.dropzoneVisible, false);
  bindCardDropzone(dom.dropzoneHidden, true);

  dom.btnShowAllCards?.addEventListener('click', async () => {
    const toUpdate = state.cards.filter((c) => c.hidden);
    if (toUpdate.length === 0) return;
    toUpdate.forEach((c) => (c.hidden = false));
    renderManageCardsList();
    renderCardsGrid();
    await Promise.all(toUpdate.map((c) => saveCard({ ...c, hidden: false })));
  });

  dom.btnHideAllCards?.addEventListener('click', async () => {
    const toUpdate = state.cards.filter((c) => !c.hidden);
    if (toUpdate.length === 0) return;
    toUpdate.forEach((c) => (c.hidden = true));
    renderManageCardsList();
    renderCardsGrid();
    await Promise.all(toUpdate.map((c) => saveCard({ ...c, hidden: true })));
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
    speak('Hola, así suena esta voz.', ttsOptions());
  });

  dom.btnTestSettingVoice?.addEventListener('click', () => {
    speak('Hola, así suena mi voz en Mi Espacio.', ttsOptions());
  });

  const updateSpeedPresetUI = (rate) => {
    dom.speedPresetBtns?.forEach((btn) => {
      const target = parseFloat(btn.dataset.speedPreset);
      btn.classList.toggle('is-active', Math.abs(target - rate) < 0.03);
    });
  };

  dom.settingRate.addEventListener('input', () => {
    const rate = parseFloat(dom.settingRate.value);
    dom.rateValue.textContent = `${rate.toFixed(2)}x`;
    updateSpeedPresetUI(rate);
    state.settings = saveSettings({ speechRate: rate });
  });

  dom.speedPresetBtns?.forEach((btn) => {
    btn.addEventListener('click', () => {
      const rate = parseFloat(btn.dataset.speedPreset);
      dom.settingRate.value = String(rate);
      dom.rateValue.textContent = `${rate.toFixed(2)}x`;
      updateSpeedPresetUI(rate);
      state.settings = saveSettings({ speechRate: rate });
      speak('Así suena esta velocidad.', ttsOptions());
    });
  });

  dom.settingLargeText?.addEventListener('change', async () => {
    const enabled = dom.settingLargeText.checked;
    state.settings = saveSettings({ largeTextMode: enabled });
    applySettingsToUI();
    await saveBoardPreference({ largeTextMode: enabled });
  });

  dom.btnDismissAutosave?.addEventListener('click', () => {
    if (dom.autosaveBanner) dom.autosaveBanner.hidden = true;
  });

  dom.settingPhraseBar.addEventListener('change', () => {
    state.settings = saveSettings({ showPhraseBar: dom.settingPhraseBar.checked });
    renderPhraseBar();
  });

  dom.settingTeenVoiceMsg?.addEventListener('change', async () => {
    const enabled = dom.settingTeenVoiceMsg.checked;
    state.settings = saveSettings({ allowTeenVoiceMessage: enabled });
    applySettingsToUI();
    await saveBoardPreference({ allowTeenVoiceMessage: enabled });
  });

  const playMusicPreviewTrack = (index) => {
    const catKey = dom.settingMusicCategory?.value || state.settings.musicCategory || 'calma';
    if (catKey === 'off') {
      stopMusicPreview();
      if (dom.musicPreviewStatus) {
        dom.musicPreviewStatus.textContent = 'La tarjeta de música está oculta.';
      }
      return;
    }

    const cat = MUSIC_CATEGORIES[catKey] || MUSIC_CATEGORIES.calma;
    const total = cat.tracks.length;
    const safeIdx = ((index % total) + total) % total;
    state.music.previewTrackIndex = safeIdx;
    const track = cat.tracks[safeIdx];

    if (!state.music.previewAudio) {
      const audio = new Audio();
      audio.addEventListener('ended', () => {
        if (state.music.previewPlaying) {
          playMusicPreviewTrack(state.music.previewTrackIndex + 1);
        }
      });
      audio.addEventListener('error', () => {
        stopMusicPreview();
        if (dom.musicPreviewStatus) {
          dom.musicPreviewStatus.textContent = 'Todavía no hay archivos MP3 cargados en esta categoría.';
        }
      });
      state.music.previewAudio = audio;
    }

    state.music.previewAudio.volume = state.settings.musicVolume ?? 0.65;
    state.music.previewAudio.src = track.src;
    state.music.previewAudio
      .play()
      .then(() => {
        state.music.previewPlaying = true;
        if (dom.btnTestMusic) {
          dom.btnTestMusic.textContent = '⏹ Detener';
          dom.btnTestMusic.classList.add('btn--danger');
          dom.btnTestMusic.classList.remove('btn--accent');
        }
        if (dom.musicPreviewStatus) {
          dom.musicPreviewStatus.textContent = `Reproduciendo: ${track.title} (${safeIdx + 1}/${total})`;
        }
      })
      .catch(() => {
        stopMusicPreview();
        if (dom.musicPreviewStatus) {
          dom.musicPreviewStatus.textContent = 'Todavía no hay archivos MP3 cargados en esta categoría.';
        }
      });
  };

  dom.btnTestMusic?.addEventListener('click', () => {
    if (state.music.previewPlaying) {
      stopMusicPreview();
    } else {
      playMusicPreviewTrack(0);
    }
  });

  dom.settingMusicCategory?.addEventListener('change', async () => {
    const cat = dom.settingMusicCategory.value;
    const wasPreviewPlaying = state.music.previewPlaying;
    stopMusicPreview();
    state.settings = saveSettings({ musicCategory: cat });
    state.music.trackIndex = 0;
    if (cat === 'off' && state.music.audio) {
      state.music.audio.pause();
      state.music.isPlaying = false;
    }
    applySettingsToUI();
    renderCardsGrid();
    await saveBoardPreference({ musicCategory: cat });
    if (wasPreviewPlaying && cat !== 'off') {
      playMusicPreviewTrack(0);
    }
  });

  dom.settingMusicVolume?.addEventListener('input', () => {
    const vol = parseFloat(dom.settingMusicVolume.value);
    if (dom.musicVolumeValue) dom.musicVolumeValue.textContent = `${Math.round(vol * 100)}%`;
    state.settings = saveSettings({ musicVolume: vol });
    if (state.music.audio) state.music.audio.volume = vol;
    if (state.music.previewAudio) state.music.previewAudio.volume = vol;
    if (state.radio.audio) state.radio.audio.volume = vol;
    if (state.radio.previewAudio) state.radio.previewAudio.volume = vol;
  });

  dom.settingMusicVolume?.addEventListener('change', async () => {
    const vol = parseFloat(dom.settingMusicVolume.value);
    await saveBoardPreference({ musicVolume: vol });
  });

  // --- Ajustes de Personas Mayores y Bienestar (Radio, Clima, Día y Hora) ---
  dom.settingEnableRadio?.addEventListener('change', async () => {
    const enabled = dom.settingEnableRadio.checked;
    state.settings = saveSettings({ enableRadioCard: enabled });
    if (!enabled && state.radio.audio) {
      state.radio.audio.pause();
      state.radio.isPlaying = false;
    }
    applySettingsToUI();
    renderCardsGrid();
    await saveBoardPreference({ enableRadioCard: enabled });
  });

  const renderRadioOptions = (list, statusMsg) => {
    state.radio.searchResults = list;
    if (!dom.radioResultsSelect || !dom.radioResultsRow) return;

    if (list.length === 0) {
      dom.radioResultsRow.hidden = true;
      if (dom.radioSearchStatus) {
        dom.radioSearchStatus.textContent =
          statusMsg || 'Sin coincidencias en esa banda. Probá otra palabra o cambiá a "Todas".';
      }
      return;
    }

    dom.radioResultsSelect.innerHTML = '';
    list.slice(0, 40).forEach((st, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx);
      const bandTag = st.band === 'AM' || st.band === 'FM' ? `[${st.band}] ` : '';
      opt.textContent = `${bandTag}${st.name}`;
      dom.radioResultsSelect.appendChild(opt);
    });
    dom.radioResultsRow.hidden = false;
    if (dom.radioSearchStatus) {
      dom.radioSearchStatus.textContent =
        statusMsg || `${list.length} radios disponibles. Elegí una y tocá "Usar esta".`;
    }
  };

  const applyLocalRadioFilter = () => {
    const q = dom.radioSearchInput?.value.trim() || '';
    const filtered = filterStationsLocal(state.radio.directory, {
      query: q,
      band: state.radio.band
    });
    const bandLabel = state.radio.band === 'all' ? 'AM/FM' : state.radio.band;
    renderRadioOptions(
      filtered,
      filtered.length > 0
        ? `${filtered.length} radios (${bandLabel}). Elegí una y tocá "Usar esta".`
        : `Sin coincidencias en ${bandLabel} para "${q}".`
    );
    return filtered;
  };

  let radioDirLoading = false;
  const ensureRadioDirectory = async () => {
    if (state.radio.directory.length > 0 || radioDirLoading) return;
    radioDirLoading = true;
    if (dom.radioSearchStatus) dom.radioSearchStatus.textContent = 'Cargando directorio de radios argentinas...';
    try {
      state.radio.directory = await loadArgentineStations();
      applyLocalRadioFilter();
    } catch {
      if (dom.radioSearchStatus) dom.radioSearchStatus.textContent = 'No se pudo cargar el directorio. Probá tocar "Buscar".';
    }
    radioDirLoading = false;
  };
  window.__ensureRadioDirectory = ensureRadioDirectory;

  const runRadioSearch = async (isAuto = false) => {
    const q = dom.radioSearchInput?.value.trim() || '';
    if (!q) {
      await ensureRadioDirectory();
      applyLocalRadioFilter();
      return;
    }
    if (!isAuto && dom.radioSearchStatus) {
      dom.radioSearchStatus.textContent = 'Buscando más estaciones...';
    }
    if (!isAuto && dom.btnSearchRadio) dom.btnSearchRadio.disabled = true;
    try {
      const results = await searchRadioStations(q);
      // Fusionar en el directorio local para futuras búsquedas instantáneas
      const seen = new Set(state.radio.directory.map((s) => s.url));
      results.forEach((st) => {
        if (!seen.has(st.url)) {
          seen.add(st.url);
          state.radio.directory.push(st);
        }
      });
      const filtered = applyLocalRadioFilter();
      if (filtered.length === 0 && results.length > 0 && state.radio.band !== 'all') {
        renderRadioOptions(
          results,
          `Encontramos ${results.length} opciones (en otra banda). Elegí una y tocá "Usar esta".`
        );
      }
    } catch {
      if (!isAuto && dom.radioSearchStatus) {
        dom.radioSearchStatus.textContent = 'No se pudo consultar el directorio de radios. Revisá tu conexión.';
      }
    }
    if (!isAuto && dom.btnSearchRadio) dom.btnSearchRadio.disabled = false;
  };

  dom.radioBandBtns?.forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.radio.band = btn.dataset.radioBand || 'all';
      dom.radioBandBtns.forEach((b) =>
        b.classList.toggle('is-active', b.dataset.radioBand === state.radio.band)
      );
      if (state.radio.directory.length === 0) {
        await ensureRadioDirectory();
      } else {
        applyLocalRadioFilter();
      }
    });
  });

  dom.radioSearchInput?.addEventListener('focus', () => {
    ensureRadioDirectory();
  });

  dom.radioSearchInput?.addEventListener('input', () => {
    clearTimeout(state.radio.searchDebounce);
    if (state.radio.directory.length === 0) {
      ensureRadioDirectory();
      return;
    }
    const localMatches = applyLocalRadioFilter();
    const q = dom.radioSearchInput.value.trim();
    // Si hay pocas coincidencias locales y escribió al menos 3 letras, ampliar en segundo plano
    if (localMatches.length < 4 && q.length >= 3) {
      state.radio.searchDebounce = setTimeout(() => {
        runRadioSearch(true);
      }, 350);
    }
  });

  dom.btnSearchRadio?.addEventListener('click', () => runRadioSearch(false));
  dom.radioSearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runRadioSearch(false);
    }
  });

  dom.btnSaveRadio?.addEventListener('click', async () => {
    const idx = parseInt(dom.radioResultsSelect?.value || '0', 10);
    const chosen = state.radio.searchResults[idx];
    if (!chosen) return;
    stopRadioPreview();
    state.settings = saveSettings({
      radioName: chosen.name,
      radioUrl: chosen.url,
      enableRadioCard: true
    });
    applySettingsToUI();
    renderCardsGrid();
    if (dom.radioSearchStatus) dom.radioSearchStatus.textContent = `Guardada: ${chosen.name}. Tocá "▶ Probar radio" para verificar que suene bien.`;
    await saveBoardPreference({
      radioName: chosen.name,
      radioUrl: chosen.url,
      enableRadioCard: true
    });
  });

  dom.btnTestRadio?.addEventListener('click', () => {
    if (state.radio.previewPlaying) {
      stopRadioPreview();
      return;
    }
    const url = state.settings.radioUrl;
    if (!url) return;
    stopMusicPreview();
    if (!state.radio.previewAudio) {
      const audio = new Audio();
      audio.addEventListener('error', () => {
        if (!audio.getAttribute('src')) return;
        stopRadioPreview();
        if (dom.radioSearchStatus) {
          dom.radioSearchStatus.textContent = 'Esta transmisión no respondió. Probá elegir otra estación de la lista.';
        }
      });
      state.radio.previewAudio = audio;
    }
    state.radio.previewAudio.volume = state.settings.musicVolume ?? 0.65;
    state.radio.previewAudio.src = url;
    if (dom.radioSearchStatus) dom.radioSearchStatus.textContent = `Conectando con ${state.settings.radioName || 'la radio'}...`;
    state.radio.previewAudio
      .play()
      .then(() => {
        state.radio.previewPlaying = true;
        if (dom.btnTestRadio) {
          dom.btnTestRadio.textContent = '⏹ Detener radio';
          dom.btnTestRadio.classList.add('btn--danger');
          dom.btnTestRadio.classList.remove('btn--ghost');
        }
        if (dom.radioSearchStatus) {
          dom.radioSearchStatus.textContent = `En vivo: ${state.settings.radioName || 'Radio'}`;
        }
      })
      .catch(() => {
        stopRadioPreview();
        if (dom.radioSearchStatus) {
          dom.radioSearchStatus.textContent = 'Esta transmisión no respondió. Probá elegir otra estación de la lista.';
        }
      });
  });

  dom.settingEnableWeather?.addEventListener('change', async () => {
    const enabled = dom.settingEnableWeather.checked;
    state.settings = saveSettings({ enableWeatherCard: enabled });
    applySettingsToUI();
    renderCardsGrid();
    await saveBoardPreference({ enableWeatherCard: enabled });
  });

  const runCitySearch = async () => {
    const q = dom.weatherCityInput?.value.trim() || '';
    if (q.length < 2) return;
    if (dom.weatherSearchStatus) dom.weatherSearchStatus.textContent = 'Buscando ciudad...';
    if (dom.btnSearchCity) dom.btnSearchCity.disabled = true;
    try {
      const results = await searchCities(q);
      state.weather.searchResults = results;
      if (results.length === 0) {
        if (dom.weatherResultsRow) dom.weatherResultsRow.hidden = true;
        if (dom.weatherSearchStatus) dom.weatherSearchStatus.textContent = 'No encontramos esa ciudad. Probá escribiéndola sin abreviaturas.';
      } else {
        if (dom.weatherCityResults) {
          dom.weatherCityResults.innerHTML = '';
          results.forEach((c, idx) => {
            const opt = document.createElement('option');
            opt.value = String(idx);
            opt.textContent = c.label;
            dom.weatherCityResults.appendChild(opt);
          });
        }
        if (dom.weatherResultsRow) dom.weatherResultsRow.hidden = false;
        if (dom.weatherSearchStatus) dom.weatherSearchStatus.textContent = 'Elegí la ciudad correcta y tocá "Guardar".';
      }
    } catch {
      if (dom.weatherSearchStatus) dom.weatherSearchStatus.textContent = 'No se pudo buscar la ciudad. Revisá tu conexión.';
    }
    if (dom.btnSearchCity) dom.btnSearchCity.disabled = false;
  };

  dom.btnSearchCity?.addEventListener('click', runCitySearch);
  dom.weatherCityInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runCitySearch();
    }
  });

  dom.btnSaveCity?.addEventListener('click', async () => {
    const idx = parseInt(dom.weatherCityResults?.value || '0', 10);
    const chosen = state.weather.searchResults[idx];
    if (!chosen) return;
    state.settings = saveSettings({
      weatherCity: chosen.name,
      weatherLat: chosen.lat,
      weatherLon: chosen.lon,
      enableWeatherCard: true
    });
    if (dom.weatherResultsRow) dom.weatherResultsRow.hidden = true;
    if (dom.weatherSearchStatus) dom.weatherSearchStatus.textContent = `Ciudad guardada: ${chosen.label}`;
    applySettingsToUI();
    renderCardsGrid();
    await saveBoardPreference({
      weatherCity: chosen.name,
      weatherLat: chosen.lat,
      weatherLon: chosen.lon,
      enableWeatherCard: true
    });
  });

  dom.btnTestWeather?.addEventListener('click', async () => {
    const city = state.settings.weatherCity || 'Buenos Aires';
    const lat = typeof state.settings.weatherLat === 'number' ? state.settings.weatherLat : -34.6037;
    const lon = typeof state.settings.weatherLon === 'number' ? state.settings.weatherLon : -58.3816;
    if (dom.weatherSearchStatus) dom.weatherSearchStatus.textContent = `Consultando clima en ${city}...`;
    try {
      const summary = await fetchWeatherSummary({ city, lat, lon });
      if (dom.weatherSearchStatus) dom.weatherSearchStatus.textContent = `${summary.icon} ${summary.headline} (${summary.details})`;
      speak(summary.speechText, ttsOptions());
    } catch {
      if (dom.weatherSearchStatus) dom.weatherSearchStatus.textContent = 'No se pudo consultar el clima en este momento.';
    }
  });

  dom.settingEnableDateTime?.addEventListener('change', async () => {
    const enabled = dom.settingEnableDateTime.checked;
    state.settings = saveSettings({ enableDateTimeCard: enabled });
    applySettingsToUI();
    renderCardsGrid();
    await saveBoardPreference({ enableDateTimeCard: enabled });
  });

  // Teléfono de Persona de Contacto (ej: Alicia)
  dom.settingEnableContactCall?.addEventListener('change', async () => {
    const enabled = dom.settingEnableContactCall.checked;
    state.settings = saveSettings({ enableContactCall: enabled });
    applySettingsToUI();
    renderCardsGrid();
    await saveBoardPreference({ enableContactCall: enabled });
  });

  dom.btnSaveContactCall?.addEventListener('click', async () => {
    const name = (dom.contactCallName?.value || '').trim() || 'Contacto';
    const phone = (dom.contactCallPhone?.value || '').trim();
    const mode = dom.contactCallMode?.value || 'tel';
    if (!phone) {
      if (dom.contactCallStatus) {
        dom.contactCallStatus.textContent = 'Ingresá un número de teléfono antes de guardar.';
      }
      return;
    }
    state.settings = saveSettings({
      contactCallName: name,
      contactCallPhone: phone,
      contactCallMode: mode,
      enableContactCall: true
    });
    applySettingsToUI();
    renderCardsGrid();
    if (dom.contactCallStatus) {
      dom.contactCallStatus.textContent = `Guardado: ${mode === 'whatsapp' ? 'WhatsApp' : 'Llamada'} a ${name} (${phone}) ✓`;
    }
    await saveBoardPreference({
      contactCallName: name,
      contactCallPhone: phone,
      contactCallMode: mode,
      enableContactCall: true
    });
  });

  // Teléfono de Obra Social / Salud (ej: PAMI)
  dom.settingEnableHealthCall?.addEventListener('change', async () => {
    const enabled = dom.settingEnableHealthCall.checked;
    state.settings = saveSettings({ enableHealthCall: enabled });
    applySettingsToUI();
    renderCardsGrid();
    await saveBoardPreference({ enableHealthCall: enabled });
  });

  dom.btnSaveHealthCall?.addEventListener('click', async () => {
    const name = (dom.healthCallName?.value || '').trim() || 'Obra Social';
    const phone = (dom.healthCallPhone?.value || '').trim();
    if (!phone) {
      if (dom.healthCallStatus) {
        dom.healthCallStatus.textContent = 'Ingresá el número de la obra social antes de guardar.';
      }
      return;
    }
    state.settings = saveSettings({
      healthCallName: name,
      healthCallPhone: phone,
      enableHealthCall: true
    });
    applySettingsToUI();
    renderCardsGrid();
    if (dom.healthCallStatus) {
      dom.healthCallStatus.textContent = `Guardado: Llamar a ${name} (${phone}) ✓`;
    }
    await saveBoardPreference({
      healthCallName: name,
      healthCallPhone: phone,
      enableHealthCall: true
    });
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

function stopMusicPreview() {
  if (state.music.previewAudio) {
    state.music.previewAudio.pause();
  }
  state.music.previewPlaying = false;
  if (dom.btnTestMusic) {
    dom.btnTestMusic.textContent = '▶ Probar';
    dom.btnTestMusic.classList.remove('btn--danger');
    dom.btnTestMusic.classList.add('btn--accent');
  }
  if (dom.musicPreviewStatus) {
    dom.musicPreviewStatus.textContent = '';
  }
}

function stopRadioPreview() {
  if (state.radio.previewAudio) {
    state.radio.previewAudio.pause();
    state.radio.previewAudio.removeAttribute('src');
    state.radio.previewAudio.load();
  }
  state.radio.previewPlaying = false;
  if (dom.btnTestRadio) {
    dom.btnTestRadio.textContent = '▶ Probar radio';
    dom.btnTestRadio.classList.remove('btn--danger');
    dom.btnTestRadio.classList.add('btn--ghost');
  }
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

async function setCardHidden(cardId, isHidden) {
  const card = state.cards.find((c) => c.id === cardId);
  if (!card || Boolean(card.hidden) === Boolean(isHidden)) return;
  card.hidden = Boolean(isHidden);
  renderManageCardsList();
  renderCardsGrid();
  await saveCard({ ...card, hidden: Boolean(isHidden) });
}

function renderManageCardsList() {
  dom.cardsCount.textContent = String(state.cards.length);
  if (!dom.manageVisibleList || !dom.manageHiddenList) return;

  const q = (dom.manageCardsSearch?.value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const catMap = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
  const matchesQuery = (card) => {
    if (!q) return true;
    const hay = `${card.text} ${catMap[card.category] || card.category}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return hay.includes(q);
  };

  const allVisible = state.cards.filter((c) => !c.hidden);
  const allHidden = state.cards.filter((c) => Boolean(c.hidden));
  if (dom.visibleCardsCount) dom.visibleCardsCount.textContent = String(allVisible.length);
  if (dom.hiddenCardsCount) dom.hiddenCardsCount.textContent = String(allHidden.length);

  const buildCardRow = (card, isHidden) => {
    const item = document.createElement('div');
    item.className = 'manage-item manage-item--draggable';
    item.draggable = true;
    item.dataset.cardId = card.id;

    item.addEventListener('dragstart', (e) => {
      item.classList.add('is-dragging');
      e.dataTransfer.setData('text/plain', card.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('is-dragging');
      dom.dropzoneVisible?.classList.remove('is-drag-over');
      dom.dropzoneHidden?.classList.remove('is-drag-over');
    });

    const info = document.createElement('div');
    info.className = 'manage-item__info';

    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.textContent = '⋮⋮';
    handle.title = 'Arrastrar a la otra columna';

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
    info.append(handle, thumb, txtWrap);

    const actions = document.createElement('div');
    actions.className = 'manage-item__actions';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = isHidden ? 'btn btn--emerald btn--sm' : 'btn btn--ghost btn--sm';
    toggleBtn.textContent = isHidden ? '👁️ Mostrar' : '🙈 Ocultar';
    toggleBtn.addEventListener('click', () => setCardHidden(card.id, !isHidden));

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

    actions.append(toggleBtn, editBtn, delBtn);
    item.append(info, actions);
    return item;
  };

  dom.manageVisibleList.innerHTML = '';
  const filteredVisible = allVisible.filter(matchesQuery);
  if (filteredVisible.length === 0) {
    dom.manageVisibleList.innerHTML =
      '<p class="muted-text" style="padding: 12px 6px;">Arrastrá tarjetas acá o tocá "👁️ Mostrar" para que aparezcan en el Comunicador.</p>';
  } else {
    filteredVisible.forEach((card) => dom.manageVisibleList.appendChild(buildCardRow(card, false)));
  }

  dom.manageHiddenList.innerHTML = '';
  const filteredHidden = allHidden.filter(matchesQuery);
  if (filteredHidden.length === 0) {
    dom.manageHiddenList.innerHTML =
      '<p class="muted-text" style="padding: 12px 6px;">Arrastrá acá las tarjetas que quieras ocultar sin borrarlas.</p>';
  } else {
    filteredHidden.forEach((card) => dom.manageHiddenList.appendChild(buildCardRow(card, true)));
  }
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
      const actionsWrap = document.createElement('div');
      actionsWrap.className = 'manage-item__actions';

      if (ev.audioData) {
        const listenBtn = document.createElement('button');
        listenBtn.type = 'button';
        listenBtn.className = 'btn btn--emerald btn--sm';
        listenBtn.textContent = '▶ Escuchar';
        listenBtn.addEventListener('click', () => playAudioDataUrl(ev.audioData));
        actionsWrap.appendChild(listenBtn);
      }

      const replyBtn = document.createElement('button');
      replyBtn.type = 'button';
      replyBtn.className = 'btn btn--accent btn--sm';
      replyBtn.textContent = '🎙️ Responder';
      replyBtn.addEventListener('click', () => openFamilyAlertModal(ev));
      actionsWrap.appendChild(replyBtn);

      item.appendChild(actionsWrap);
    } else if (ev.type === 'teen_request' && ev.audioData) {
      const listenBtn = document.createElement('button');
      listenBtn.type = 'button';
      listenBtn.className = 'btn btn--ghost btn--sm';
      listenBtn.textContent = '▶ Audio';
      listenBtn.addEventListener('click', () => playAudioDataUrl(ev.audioData));
      item.appendChild(listenBtn);
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

  const allowVoice = state.settings.allowTeenVoiceMessage !== false;
  if (dom.settingTeenVoiceMsg) dom.settingTeenVoiceMsg.checked = allowVoice;
  if (dom.btnTeenVoiceMsg) dom.btnTeenVoiceMsg.hidden = !allowVoice;

  const musicCat = state.settings.musicCategory || 'calma';
  if (dom.settingMusicCategory) dom.settingMusicCategory.value = musicCat;
  if (dom.btnTestMusic) dom.btnTestMusic.disabled = musicCat === 'off';

  const musicVol = typeof state.settings.musicVolume === 'number' ? state.settings.musicVolume : 0.65;
  if (dom.settingMusicVolume) dom.settingMusicVolume.value = String(musicVol);
  if (dom.musicVolumeValue) dom.musicVolumeValue.textContent = `${Math.round(musicVol * 100)}%`;

  // Ajustes de Personas Mayores y Bienestar
  if (dom.settingEnableRadio) dom.settingEnableRadio.checked = Boolean(state.settings.enableRadioCard);
  if (dom.radioActiveLabel) {
    dom.radioActiveLabel.textContent = state.settings.radioName
      ? `Radio activa: ${state.settings.radioName}`
      : 'Radio activa: ninguna seleccionada';
  }
  if (dom.btnTestRadio) dom.btnTestRadio.disabled = !state.settings.radioUrl;

  if (dom.settingEnableWeather) dom.settingEnableWeather.checked = Boolean(state.settings.enableWeatherCard);
  if (dom.weatherActiveLabel) {
    dom.weatherActiveLabel.textContent = `Ciudad activa: ${state.settings.weatherCity || 'Buenos Aires'}`;
  }

  if (dom.settingEnableDateTime) dom.settingEnableDateTime.checked = Boolean(state.settings.enableDateTimeCard);

  if (dom.settingEnableContactCall) {
    dom.settingEnableContactCall.checked = Boolean(state.settings.enableContactCall);
  }
  if (dom.contactCallName && document.activeElement !== dom.contactCallName) {
    dom.contactCallName.value = state.settings.contactCallName || '';
  }
  if (dom.contactCallPhone && document.activeElement !== dom.contactCallPhone) {
    dom.contactCallPhone.value = state.settings.contactCallPhone || '';
  }
  if (dom.contactCallMode) {
    dom.contactCallMode.value = state.settings.contactCallMode || 'tel';
  }
  if (dom.contactCallStatus && !dom.contactCallStatus.textContent && state.settings.contactCallPhone) {
    const modeLabel = state.settings.contactCallMode === 'whatsapp' ? 'WhatsApp' : 'Llamada';
    dom.contactCallStatus.textContent = `Activo: ${modeLabel} a ${state.settings.contactCallName || 'Contacto'} (${state.settings.contactCallPhone})`;
  }

  if (dom.settingEnableHealthCall) {
    dom.settingEnableHealthCall.checked = Boolean(state.settings.enableHealthCall);
  }
  if (dom.healthCallName && document.activeElement !== dom.healthCallName) {
    dom.healthCallName.value = state.settings.healthCallName || '';
  }
  if (dom.healthCallPhone && document.activeElement !== dom.healthCallPhone) {
    dom.healthCallPhone.value = state.settings.healthCallPhone || '';
  }

  const largeText = Boolean(state.settings.largeTextMode);
  if (dom.settingLargeText) dom.settingLargeText.checked = largeText;
  if (dom.commShell) dom.commShell.classList.toggle('is-large-text', largeText);

  dom.speedPresetBtns?.forEach((btn) => {
    const target = parseFloat(btn.dataset.speedPreset);
    btn.classList.toggle('is-active', Math.abs(target - Number(state.settings.speechRate)) < 0.03);
  });

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

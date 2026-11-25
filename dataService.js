/**
 * dataService.js — Capa de Servicios de Datos (Local IndexedDB + BroadcastChannel + Firebase Firestore)
 *
 * - Si firebaseConfig.js tiene credenciales reales: sincroniza en tiempo real con
 *   Firebase Authentication (anónimo) y Cloud Firestore bajo boards/{pairingCode}.
 * - Si aún está en modo local: usa IndexedDB + BroadcastChannel para probar la
 *   comunicación de doble vía en tiempo real entre dos pestañas del navegador.
 */

import { firebaseConfig, pushConfig } from './firebaseConfig.js';

const DB_NAME = 'mi_espacio_db';
const DB_VERSION = 2;
const STORE_CARDS = 'cards';
const STORE_QUESTIONS = 'quickQuestions';
const STORE_LOGS = 'usageLogs';
const STORE_EVENTS = 'liveEvents';
const SETTINGS_KEY = 'mi_espacio_settings_v1';

const syncChannel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('mi-espacio-sync')
  : null;

let fb = null; // Instancias cargadas dinámicamente si Firebase está configurado

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig &&
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.startsWith('TU_') &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.startsWith('tu-')
  );
}

export const CATEGORIES = [
  { id: 'all', label: 'Todas' },
  { id: 'limites', label: 'Límites y Calma' },
  { id: 'necesidades', label: 'Necesidades' },
  { id: 'familia', label: 'Familia y Amigos' },
  { id: 'ocio', label: 'Música y Ocio' }
];

export const DEFAULT_SETTINGS = {
  role: null,
  pairingCode: '',
  speechRate: 0.95,
  voiceURI: '',
  showPhraseBar: true,
  notifyFamilyOnTap: true,
  allowTeenVoiceMessage: true,
  teenVoiceMode: 'audio', // 'audio' | 'transcript'
  musicCategory: 'calma', // 'calma' | 'ritmo' | 'noche' | 'stream' | 'off'
  musicVolume: 0.65,
  musicStreamGenre: 'chillout',
  musicStreamName: '',
  musicStreamUrl: '',
  enableRadioCard: false,
  radioName: '',
  radioUrl: '',
  enableWeatherCard: false,
  weatherCity: 'Buenos Aires',
  weatherLat: -34.6037,
  weatherLon: -58.3816,
  enableDateTimeCard: false,
  enableContactCall: false,
  contactCallName: '',
  contactCallPhone: '',
  contactCallMode: 'tel', // 'tel' | 'whatsapp'
  enableHealthCall: false,
  healthCallName: '',
  healthCallPhone: '',
  enableSpotifyCard: false,
  spotifyName: '',
  spotifyUrl: '',
  largeTextMode: false,
  categoryOrder: ['limites', 'necesidades', 'familia', 'ocio'],
  seeded: false,
  starterVersion: 0
};

export const CURRENT_STARTER_VERSION = 2;

export const TEMPLATE_PACKS = [
  {
    id: 'pack-adolescente',
    title: 'Pack Necesidades y Rutina (14)',
    description: 'Autonomía diaria, comida, descanso, clima y bienestar físico.',
    badge: 'Necesidades',
    cards: [
      { id: 'tpl-nec-1', text: 'Quiero tomar agua', category: 'necesidades', icon: '💧', imageData: './assets/cards/agua.svg' },
      { id: 'tpl-nec-2', text: 'Tengo hambre', category: 'necesidades', icon: '🍽️', imageData: './assets/cards/comida.svg' },
      { id: 'tpl-nec-3', text: 'Necesito ir al baño', category: 'necesidades', icon: '🚻', imageData: './assets/cards/bano.svg' },
      { id: 'tpl-nec-4', text: 'Me duele algo', category: 'necesidades', icon: '🩹', imageData: './assets/cards/dolor.svg' },
      { id: 'tpl-nec-5', text: 'Quiero volver a casa', category: 'necesidades', icon: '🏠', imageData: './assets/cards/casa.svg' },
      { id: 'tpl-nec-6', text: 'Necesito ayuda', category: 'necesidades', icon: '🤝', imageData: './assets/cards/ayuda.svg' },
      { id: 'tpl-nec-7', text: 'Tengo frío', category: 'necesidades', icon: '🧥', imageData: null },
      { id: 'tpl-nec-8', text: 'Tengo calor', category: 'necesidades', icon: '☀️', imageData: null },
      { id: 'tpl-nec-9', text: 'Quiero bañarme', category: 'necesidades', icon: '🛁', imageData: null },
      { id: 'tpl-nec-10', text: 'Quiero cambiarme de ropa', category: 'necesidades', icon: '👕', imageData: null },
      { id: 'tpl-nec-11', text: 'Estoy cansada, quiero dormir', category: 'necesidades', icon: '🛌', imageData: null },
      { id: 'tpl-nec-12', text: 'No me siento bien', category: 'necesidades', icon: '🤒', imageData: null },
      { id: 'tpl-nec-13', text: 'Quiero merendar', category: 'necesidades', icon: '🥪', imageData: null },
      { id: 'tpl-nec-14', text: 'Quiero comer fruta', category: 'necesidades', icon: '🍎', imageData: null }
    ]
  },
  {
    id: 'pack-emociones',
    title: 'Pack Emociones y Límites (14)',
    description: 'Expresión clara de sobrecarga sensorial, pausas, espacio y calma.',
    badge: 'Regulación',
    cards: [
      { id: 'tpl-lim-1', text: 'Quiero estar en mi pieza', category: 'limites', icon: '🚪', imageData: './assets/cards/pieza.svg' },
      { id: 'tpl-lim-2', text: 'Necesito mis auriculares', category: 'limites', icon: '🎧', imageData: './assets/cards/auriculares.svg' },
      { id: 'tpl-lim-3', text: 'Hay mucho ruido', category: 'limites', icon: '🔇', imageData: './assets/cards/ruido.svg' },
      { id: 'tpl-lim-4', text: 'Necesito una pausa', category: 'limites', icon: '⏸️', imageData: './assets/cards/pausa.svg' },
      { id: 'tpl-lim-5', text: 'No me toquen ahora', category: 'limites', icon: '✋', imageData: './assets/cards/espacio.svg' },
      { id: 'tpl-lim-6', text: 'Me siento abrumada', category: 'limites', icon: '🌊', imageData: './assets/cards/abrumada.svg' },
      { id: 'tpl-lim-7', text: 'Estoy tranquila', category: 'limites', icon: '✨', imageData: './assets/cards/tranquila.svg' },
      { id: 'tpl-lim-8', text: 'Prefiero quedarme acá', category: 'limites', icon: '🛋️', imageData: './assets/cards/quedarme.svg' },
      { id: 'tpl-lim-9', text: 'Hay mucha luz', category: 'limites', icon: '🕶️', imageData: null },
      { id: 'tpl-lim-10', text: 'Estoy enojada', category: 'limites', icon: '😤', imageData: null },
      { id: 'tpl-lim-11', text: 'Estoy triste', category: 'limites', icon: '😢', imageData: null },
      { id: 'tpl-lim-12', text: 'Necesito respirar un momento', category: 'limites', icon: '🫁', imageData: null },
      { id: 'tpl-lim-13', text: 'Por favor hablá más despacio', category: 'limites', icon: '⏱️', imageData: null },
      { id: 'tpl-lim-14', text: 'No quiero hacer esto ahora', category: 'limites', icon: '🛑', imageData: null }
    ]
  },
  {
    id: 'pack-salidas',
    title: 'Pack Música, Ocio y Salidas (12)',
    description: 'Planes, tecnología, música, series y tiempo libre.',
    badge: 'Tiempo libre',
    cards: [
      { id: 'tpl-oci-1', text: 'Quiero usar mi celular', category: 'ocio', icon: '📱', imageData: './assets/cards/celular.svg' },
      { id: 'tpl-oci-2', text: 'Quiero escuchar música', category: 'ocio', icon: '🎵', imageData: './assets/cards/musica.svg' },
      { id: 'tpl-oci-3', text: 'Quiero ver una serie', category: 'ocio', icon: '🎬', imageData: './assets/cards/serie.svg' },
      { id: 'tpl-oci-4', text: 'Quiero salir a caminar', category: 'ocio', icon: '🚶‍♀️', imageData: './assets/cards/caminar.svg' },
      { id: 'tpl-oci-5', text: 'Quiero comer helado', category: 'ocio', icon: '🍨', imageData: './assets/cards/helado.svg' },
      { id: 'tpl-oci-6', text: 'Quiero usar la computadora', category: 'ocio', icon: '💻', imageData: null },
      { id: 'tpl-oci-7', text: 'Quiero jugar videojuegos', category: 'ocio', icon: '🎮', imageData: null },
      { id: 'tpl-oci-8', text: 'Quiero dibujar o pintar', category: 'ocio', icon: '🎨', imageData: null },
      { id: 'tpl-oci-9', text: 'Quiero leer un rato', category: 'ocio', icon: '📚', imageData: null },
      { id: 'tpl-oci-10', text: 'Quiero ir a la plaza', category: 'ocio', icon: '🌳', imageData: null },
      { id: 'tpl-oci-11', text: 'Quiero dar una vuelta en auto', category: 'ocio', icon: '🚗', imageData: null },
      { id: 'tpl-oci-12', text: 'Quiero tomar algo caliente', category: 'ocio', icon: '☕', imageData: null }
    ]
  },
  {
    id: 'pack-familia',
    title: 'Pack Familia, Amigos y Escuela (10)',
    description: 'Vínculos cercanos, familia a distancia, mascota y escuela.',
    badge: 'Vínculos',
    cards: [
      { id: 'tpl-fam-1', text: 'Quiero hablar con mamá', category: 'familia', icon: '👩', imageData: './assets/cards/mama.svg' },
      { id: 'tpl-fam-2', text: 'Quiero hablar con papá', category: 'familia', icon: '👨', imageData: './assets/cards/papa.svg' },
      { id: 'tpl-fam-3', text: 'Mandar mensaje a mi familia', category: 'familia', icon: '💌', imageData: './assets/cards/mensaje.svg' },
      { id: 'tpl-fam-4', text: 'Quiero ver a mis amigos', category: 'familia', icon: '👥', imageData: './assets/cards/amigos.svg' },
      { id: 'tpl-fam-5', text: 'Quiero llamar por teléfono', category: 'familia', icon: '📞', imageData: null },
      { id: 'tpl-fam-6', text: 'Quiero un abrazo', category: 'familia', icon: '❤️', imageData: null },
      { id: 'tpl-fam-7', text: 'Quiero estar con mi mascota', category: 'familia', icon: '🐶', imageData: null },
      { id: 'tpl-fam-8', text: 'Necesito ayuda con la tarea', category: 'familia', icon: '🏫', imageData: null },
      { id: 'tpl-fam-9', text: 'Quiero hablar con mi abuela', category: 'familia', icon: '👵', imageData: null },
      { id: 'tpl-fam-10', text: 'Gracias', category: 'familia', icon: '🙏', imageData: null }
    ]
  }
];

export const DEFAULT_QUICK_QUESTIONS = [
  { id: 'qq-1', title: '¿Querés cenar?', icon: '🍽️', imageData: './assets/cards/comida.svg', createdAt: 1700000001 },
  { id: 'qq-2', title: '¿Querés tomar agua?', icon: '💧', imageData: './assets/cards/agua.svg', createdAt: 1700000002 },
  { id: 'qq-3', title: '¿Querés escuchar música?', icon: '🎵', imageData: './assets/cards/musica.svg', createdAt: 1700000003 },
  { id: 'qq-4', title: '¿Salimos a caminar?', icon: '🚶‍♀️', imageData: './assets/cards/caminar.svg', createdAt: 1700000004 },
  { id: 'qq-5', title: '¿Necesitás una pausa?', icon: '⏸️', imageData: './assets/cards/pausa.svg', createdAt: 1700000005 },
  { id: 'qq-6', title: '¿Estás bien?', icon: '✨', imageData: './assets/cards/tranquila.svg', createdAt: 1700000006 }
];

/* ==========================================================================
   Inicialización Firebase (opcional, cero dependencias locales)
   ========================================================================== */
export function isPushConfigured() {
  return Boolean(
    pushConfig &&
    pushConfig.vapidKey &&
    !pushConfig.vapidKey.startsWith('TU_') &&
    pushConfig.workerUrl &&
    !pushConfig.workerUrl.startsWith('TU_')
  );
}

export async function initBackend() {
  if (!isFirebaseConfigured() || fb) return Boolean(fb);

  try {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
    ]);

    const app = initializeApp(firebaseConfig);
    const auth = authMod.getAuth(app);
    if (!auth.currentUser) {
      await authMod.signInAnonymously(auth);
    }
    const db = fsMod.initializeFirestore(app, {
      experimentalForceLongPolling: true
    });
    fb = { app, db, ...fsMod };
    return true;
  } catch (err) {
    console.warn('No se pudo conectar a Firebase, usando modo local:', err);
    fb = null;
    return false;
  }
}

/**
 * Registra el token Push (FCM) de este dispositivo en Firestore bajo boards/{pairingCode}/devices
 * para recibir notificaciones incluso con la app cerrada o estando en otra app.
 */
export async function registerPushToken(role) {
  if (!fb || !isPushConfigured()) return null;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return null;

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (!reg) return null;

    const msgMod = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js');
    const supported = await msgMod.isSupported();
    if (!supported) return null;

    const messaging = msgMod.getMessaging(fb.app);
    const token = await msgMod.getToken(messaging, {
      vapidKey: pushConfig.vapidKey,
      serviceWorkerRegistration: reg
    });

    if (token) {
      const { pairingCode } = getSettings();
      const docId = token.slice(-24).replace(/[^a-zA-Z0-9_-]/g, '');
      await fb.setDoc(fb.doc(fb.db, 'boards', pairingCode, 'devices', docId), {
        token,
        role,
        updatedAt: Date.now()
      });
      console.log('[Mi Espacio] Token Push registrado para rol:', role);
    }
    return token;
  } catch (err) {
    console.warn('No se pudo registrar token Push:', err);
    return null;
  }
}

/**
 * Envía una notificación push en segundo plano a todos los dispositivos del rol destino
 * dentro del mismo código de vinculación, a través del Cloudflare Worker.
 */
async function triggerBackgroundPush({ targetRole, title, body }) {
  if (!fb || !isPushConfigured()) return;

  try {
    const { pairingCode } = getSettings();
    const snap = await fb.getDocs(fb.collection(fb.db, 'boards', pairingCode, 'devices'));
    const tokens = snap.docs
      .map((d) => d.data())
      .filter((d) => d.role === targetRole && d.token)
      .map((d) => d.token);

    if (tokens.length === 0) {
      console.log('[Mi Espacio] Push: no hay dispositivos registrados aún para rol:', targetRole);
      return;
    }

    const res = await fetch(pushConfig.workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens,
        title,
        body,
        url: window.location.origin + window.location.pathname
      })
    });
    const out = await res.json().catch(() => ({}));
    console.log('[Mi Espacio] Push en segundo plano resultado:', out);
  } catch (err) {
    console.warn('Push en segundo plano omitido:', err);
  }
}

/* ==========================================================================
   IndexedDB Helpers
   ========================================================================== */
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB no soportado.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_CARDS)) {
        const cards = db.createObjectStore(STORE_CARDS, { keyPath: 'id' });
        cards.createIndex('category', 'category', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_QUESTIONS)) {
        db.createObjectStore(STORE_QUESTIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_LOGS)) {
        const logs = db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
        logs.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_EVENTS)) {
        const ev = db.createObjectStore(STORE_EVENTS, { keyPath: 'id' });
        ev.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    const timer = setTimeout(() => reject(new Error('IndexedDB timeout')), 1500);

    request.onblocked = () => {
      clearTimeout(timer);
      reject(new Error('IndexedDB bloqueada por otra pestaña'));
    };

    request.onsuccess = () => {
      clearTimeout(timer);
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => {
      clearTimeout(timer);
      reject(request.error);
    };
  });
}

async function getAllFromStore(storeName) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function putInStore(storeName, item) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

async function deleteFromStore(storeName, id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function notifyLocalSync(topic) {
  if (syncChannel) {
    syncChannel.postMessage({ topic, ts: Date.now() });
  }
}

/* ==========================================================================
   Configuración y Código de Vinculación
   ========================================================================== */
export function generatePairingCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    if (!merged.pairingCode) {
      merged.pairingCode = generatePairingCode();
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS, pairingCode: generatePairingCode() };
  }
}

export function saveSettings(partial) {
  const next = { ...getSettings(), ...partial };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('No se pudo guardar la configuración:', err);
  }
  return next;
}

/* ==========================================================================
   Tarjetas y Preguntas (Local + Firestore Sync)
   ========================================================================== */
export async function getCards() {
  try {
    const list = await getAllFromStore(STORE_CARDS);
    return list.sort((a, b) => (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0));
  } catch {
    return [];
  }
}

export async function saveCard(card) {
  const created = card.createdAt || Date.now();
  const payload = {
    id: card.id || `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: (card.text || '').trim(),
    category: card.category || 'necesidades',
    icon: card.icon || '💬',
    imageData: card.imageData || null,
    audioData: card.audioData || null,
    hidden: Boolean(card.hidden),
    order: typeof card.order === 'number' ? card.order : created,
    authorRole: card.authorRole || 'family',
    createdAt: created
  };

  await putInStore(STORE_CARDS, payload);
  notifyLocalSync('cards');

  if (fb) {
    const { pairingCode } = getSettings();
    await fb.setDoc(fb.doc(fb.db, 'boards', pairingCode, 'cards', payload.id), payload);
  }
  return payload;
}

export async function removeCard(id) {
  await deleteFromStore(STORE_CARDS, id);
  notifyLocalSync('cards');

  if (fb) {
    const { pairingCode } = getSettings();
    await fb.deleteDoc(fb.doc(fb.db, 'boards', pairingCode, 'cards', id));
  }
}

export async function importTemplatePack(packId) {
  const pack = TEMPLATE_PACKS.find((p) => p.id === packId);
  if (!pack) return 0;

  const existing = await getCards();
  const existingTexts = new Set(existing.map((c) => c.text.toLowerCase()));
  let importedCount = 0;

  for (const tpl of pack.cards) {
    if (!existingTexts.has(tpl.text.toLowerCase())) {
      await saveCard({
        ...tpl,
        // ID determinístico para evitar duplicados aunque dos dispositivos importen a la vez
        id: tpl.id,
        authorRole: 'template',
        createdAt: Date.now() + importedCount
      });
      importedCount += 1;
    }
  }
  return importedCount;
}

export async function getQuickQuestions() {
  try {
    const list = await getAllFromStore(STORE_QUESTIONS);
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch {
    return [];
  }
}

export async function saveQuickQuestion(question) {
  const isChoice = Boolean(question.optionA?.text && question.optionB?.text);
  const payload = {
    id: question.id || `qq-${Date.now()}`,
    title: (question.title || '').trim() || 'Pregunta del día',
    icon: question.icon || question.optionA?.icon || '❓',
    imageData: question.imageData || question.optionA?.imageData || null,
    optionA: isChoice
      ? {
          text: (question.optionA?.text || '').trim(),
          icon: question.optionA?.icon || '🅰️',
          imageData: question.optionA?.imageData || null
        }
      : null,
    optionB: isChoice
      ? {
          text: (question.optionB?.text || '').trim(),
          icon: question.optionB?.icon || '🅱️',
          imageData: question.optionB?.imageData || null
        }
      : null,
    createdAt: question.createdAt || Date.now()
  };

  await putInStore(STORE_QUESTIONS, payload);
  notifyLocalSync('questions');

  if (fb) {
    const { pairingCode } = getSettings();
    await fb.setDoc(fb.doc(fb.db, 'boards', pairingCode, 'quickQuestions', payload.id), payload);
  }
  return payload;
}

export async function removeQuickQuestion(id) {
  await deleteFromStore(STORE_QUESTIONS, id);
  notifyLocalSync('questions');

  if (fb) {
    const { pairingCode } = getSettings();
    await fb.deleteDoc(fb.doc(fb.db, 'boards', pairingCode, 'quickQuestions', id));
  }
}

export async function ensureSeedData() {
  const settings = getSettings();
  const cards = await getCards();
  const questions = await getQuickQuestions();

  if (cards.length === 0 || (settings.starterVersion || 0) < CURRENT_STARTER_VERSION) {
    // Importar las 50 tarjetas base (sin duplicar las que ya existen ni borrar personalizadas)
    for (const pack of TEMPLATE_PACKS) {
      await importTemplatePack(pack.id);
    }
    saveSettings({ seeded: true, starterVersion: CURRENT_STARTER_VERSION });
  } else {
    const allTemplates = TEMPLATE_PACKS.flatMap((p) => p.cards);
    const byText = new Map(allTemplates.map((t) => [t.text.toLowerCase(), t.imageData]));
    for (const c of cards) {
      if (!c.imageData && byText.has(c.text.toLowerCase())) {
        await saveCard({ ...c, imageData: byText.get(c.text.toLowerCase()) });
      }
    }
  }

  const existingQuestionIds = new Set(questions.map((q) => q.id));
  for (const q of DEFAULT_QUICK_QUESTIONS) {
    if (!existingQuestionIds.has(q.id)) {
      await putInStore(STORE_QUESTIONS, q);
    }
  }

  return {
    cards: await getCards(),
    quickQuestions: await getQuickQuestions(),
    liveEvents: await getLiveEvents()
  };
}

/* ==========================================================================
   COMUNICACIÓN EN VIVO DE DOBLE VÍA (Avisos Adolescente <-> Preguntas Familia)
   ========================================================================== */
export async function getLiveEvents() {
  try {
    const list = await getAllFromStore(STORE_EVENTS);
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 30);
  } catch {
    return [];
  }
}

async function saveLiveEvent(eventObj) {
  // Escribir primero en Firestore para que un fallo local de IndexedDB nunca bloquee el envío en vivo
  if (fb) {
    const { pairingCode } = getSettings();
    await fb.setDoc(fb.doc(fb.db, 'boards', pairingCode, 'events', eventObj.id), eventObj);
    console.log('[Mi Espacio] Evento guardado en Firebase:', pairingCode, eventObj.type, eventObj.label || eventObj.questionText);
  } else {
    console.warn('[Mi Espacio] Firebase no activo, guardado solo local.');
  }

  try {
    await putInStore(STORE_EVENTS, eventObj);
  } catch (err) {
    console.warn('IndexedDB liveEvents local omitido:', err);
  }
  notifyLocalSync('events');
  return eventObj;
}

/**
 * El adolescente envía un pedido/aviso silencioso o mensaje de voz a Familia.
 */
export async function sendTeenRequest({ label, category = 'general', audioData = null, transcript = '' }) {
  const cleanTranscript = (transcript || '').trim();
  const ev = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'teen_request',
    label,
    category,
    audioData: audioData || null,
    transcript: cleanTranscript || null,
    status: 'sent', // 'sent' -> 'replied' / 'seen'
    createdAt: Date.now()
  };
  const saved = await saveLiveEvent(ev);
  triggerBackgroundPush({
    targetRole: 'family',
    title: audioData ? '🎙️ Mi Espacio — Mensaje de voz' : 'Mi Espacio — Nuevo aviso',
    body: cleanTranscript || (audioData ? 'Te envió un mensaje hablado. Tocá para escuchar.' : label)
  });
  return saved;
}

/**
 * Sincroniza opciones compartidas del tablero (como habilitar mensaje hablado) con Firestore.
 */
export async function saveBoardPreference(partial) {
  saveSettings(partial);
  if (fb) {
    const { pairingCode } = getSettings();
    await fb.setDoc(
      fb.doc(fb.db, 'boards', pairingCode, 'meta', 'settings'),
      partial,
      { merge: true }
    );
  }
}

/**
 * Familia envía una pregunta al dispositivo del adolescente.
 */
export async function sendParentQuestion({
  kind = 'yesno',
  questionText = '',
  icon = '❓',
  imageData = null,
  optionA = null,
  optionB = null
}) {
  const ev = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'parent_question',
    kind, // 'yesno' | 'choice'
    questionText: (questionText || '').trim(),
    icon,
    imageData,
    optionA,
    optionB,
    status: 'pending', // 'pending' -> 'answered' -> 'seen'
    answer: null,
    answerText: null,
    createdAt: Date.now()
  };
  const saved = await saveLiveEvent(ev);
  const pushBody =
    kind === 'choice' && optionA && optionB
      ? `${optionA.text} o ${optionB.text}`
      : (questionText || 'Tenés una pregunta nueva');
  triggerBackgroundPush({
    targetRole: 'communicator',
    title: 'Mi Espacio — Pregunta de Familia',
    body: pushBody
  });
  return saved;
}

/**
 * El adolescente responde una pregunta enviada por Familia.
 */
export async function answerParentQuestion(eventId, side, answerText) {
  const patch = {
    status: 'answered',
    answer: side,
    answerText,
    answeredAt: Date.now()
  };

  if (fb) {
    const { pairingCode } = getSettings();
    await fb.setDoc(
      fb.doc(fb.db, 'boards', pairingCode, 'events', eventId),
      patch,
      { merge: true }
    );
  }

  triggerBackgroundPush({
    targetRole: 'family',
    title: 'Mi Espacio — Respuesta recibida',
    body: `Respondió: ${answerText}`
  });

  const all = await getLiveEvents();
  const target = all.find((e) => e.id === eventId);
  if (target) {
    await putInStore(STORE_EVENTS, { ...target, ...patch });
    notifyLocalSync('events');
  }
  return patch;
}

/**
 * Familia responde a un pedido del adolescente con audio y/o texto.
 */
export async function replyToTeenRequest(eventId, { replyText = '', replyAudioData = null, replyImageData = null }) {
  const patch = {
    status: 'replied',
    replyText: (replyText || '').trim(),
    replyAudioData: replyAudioData || null,
    replyImageData: replyImageData || null,
    repliedAt: Date.now()
  };

  if (fb) {
    const { pairingCode } = getSettings();
    await fb.setDoc(
      fb.doc(fb.db, 'boards', pairingCode, 'events', eventId),
      patch,
      { merge: true }
    );
  }

  triggerBackgroundPush({
    targetRole: 'communicator',
    title: 'Mi Espacio — Respuesta de Familia',
    body: replyText || 'Tenés un mensaje de voz de Familia'
  });

  const all = await getLiveEvents();
  const target = all.find((e) => e.id === eventId);
  if (target) {
    await putInStore(STORE_EVENTS, { ...target, ...patch });
    notifyLocalSync('events');
  }
  return patch;
}

/**
 * El adolescente confirma que ya leyó/escuchó la respuesta de Familia.
 */
export async function acknowledgeReply(eventId) {
  const patch = {
    status: 'acknowledged',
    acknowledgedAt: Date.now()
  };

  if (fb) {
    const { pairingCode } = getSettings();
    await fb.setDoc(
      fb.doc(fb.db, 'boards', pairingCode, 'events', eventId),
      patch,
      { merge: true }
    );
  }

  const all = await getLiveEvents();
  const target = all.find((e) => e.id === eventId);
  if (target) {
    await putInStore(STORE_EVENTS, { ...target, ...patch });
    notifyLocalSync('events');
  }
  return patch;
}

/**
 * Familia marca un aviso o respuesta como "Visto".
 */
export async function markEventSeen(eventId) {
  const patch = {
    status: 'seen',
    seenAt: Date.now()
  };

  if (fb) {
    const { pairingCode } = getSettings();
    await fb.setDoc(
      fb.doc(fb.db, 'boards', pairingCode, 'events', eventId),
      patch,
      { merge: true }
    );
  }

  const all = await getLiveEvents();
  const target = all.find((e) => e.id === eventId);
  if (target) {
    await putInStore(STORE_EVENTS, { ...target, ...patch });
    notifyLocalSync('events');
  }
  return patch;
}

export async function clearLiveEvents() {
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EVENTS, 'readwrite');
    tx.objectStore(STORE_EVENTS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  notifyLocalSync('events');

  if (fb) {
    const { pairingCode } = getSettings();
    const snap = await fb.getDocs(fb.collection(fb.db, 'boards', pairingCode, 'events'));
    await Promise.all(snap.docs.map((d) => fb.deleteDoc(d.ref)));
  }
}

/**
 * Suscripción en tiempo real (Firestore si está configurado, o BroadcastChannel local).
 */
export function subscribeToBoard(pairingCode, callbacks = {}) {
  const unsubs = [];

  if (fb && pairingCode) {
    const cardsRef = fb.collection(fb.db, 'boards', pairingCode, 'cards');
    unsubs.push(
      fb.onSnapshot(cardsRef, (snap) => {
        const cards = snap.docs
          .map((d) => d.data())
          .sort((a, b) => (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0));
        callbacks.onCards?.(cards);
      })
    );

    const qqRef = fb.collection(fb.db, 'boards', pairingCode, 'quickQuestions');
    unsubs.push(
      fb.onSnapshot(qqRef, (snap) => {
        const list = snap.docs
          .map((d) => d.data())
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        callbacks.onQuestions?.(list);
      })
    );

    const evQuery = fb.query(
      fb.collection(fb.db, 'boards', pairingCode, 'events'),
      fb.orderBy('createdAt', 'desc'),
      fb.limit(30)
    );
    unsubs.push(
      fb.onSnapshot(evQuery, (snap) => {
        const events = snap.docs.map((d) => d.data());
        callbacks.onLiveEvents?.(events);
      })
    );

    const metaRef = fb.doc(fb.db, 'boards', pairingCode, 'meta', 'settings');
    unsubs.push(
      fb.onSnapshot(metaRef, (snap) => {
        if (snap.exists()) {
          callbacks.onBoardSettings?.(snap.data());
        }
      })
    );
  } else if (syncChannel) {
    const handler = async (msg) => {
      const topic = msg?.data?.topic;
      if (topic === 'cards') callbacks.onCards?.(await getCards());
      if (topic === 'questions') callbacks.onQuestions?.(await getQuickQuestions());
      if (topic === 'events') callbacks.onLiveEvents?.(await getLiveEvents());
    };
    syncChannel.addEventListener('message', handler);
    unsubs.push(() => syncChannel.removeEventListener('message', handler));
  }

  return () => unsubs.forEach((fn) => fn());
}

/* ==========================================================================
   Historial Simple de Uso
   ========================================================================== */
export async function logUsageEvent({ actionType, label, category = 'general' }) {
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actionType,
    label,
    category,
    timestamp: Date.now()
  };
  try {
    await putInStore(STORE_LOGS, entry);
  } catch {}
  return entry;
}

export async function getTodayUsageLogs() {
  try {
    const all = await getAllFromStore(STORE_LOGS);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return all
      .filter((item) => item.timestamp >= startOfDay.getTime())
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export async function clearUsageLogs() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LOGS, 'readwrite');
    tx.objectStore(STORE_LOGS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ==========================================================================
   Compresión de Imágenes Locales
   ========================================================================== */
export function compressImageFile(file, maxSize = 480, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

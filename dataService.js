/**
 * dataService.js — Capa de Servicios de Datos (Local IndexedDB + BroadcastChannel + Firebase Firestore)
 *
 * - Si firebaseConfig.js tiene credenciales reales: sincroniza en tiempo real con
 *   Firebase Authentication (anónimo) y Cloud Firestore bajo boards/{pairingCode}.
 * - Si aún está en modo local: usa IndexedDB + BroadcastChannel para probar la
 *   comunicación de doble vía en tiempo real entre dos pestañas del navegador.
 */

import { firebaseConfig } from './firebaseConfig.js';

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
  seeded: false
};

export const TEMPLATE_PACKS = [
  {
    id: 'pack-adolescente',
    title: 'Pack Adolescente',
    description: 'Autonomía diaria, privacidad y rutinas básicas para jóvenes.',
    badge: 'Base recomendada',
    cards: [
      { id: 'tpl-adol-1', text: 'Quiero tomar agua', category: 'necesidades', icon: '💧', imageData: './assets/cards/agua.svg' },
      { id: 'tpl-adol-2', text: 'Tengo hambre', category: 'necesidades', icon: '🍽️', imageData: './assets/cards/comida.svg' },
      { id: 'tpl-adol-3', text: 'Necesito ir al baño', category: 'necesidades', icon: '🚻', imageData: './assets/cards/bano.svg' },
      { id: 'tpl-adol-4', text: 'Quiero estar en mi pieza', category: 'limites', icon: '🚪', imageData: './assets/cards/pieza.svg' },
      { id: 'tpl-adol-5', text: 'Necesito mis auriculares', category: 'limites', icon: '🎧', imageData: './assets/cards/auriculares.svg' },
      { id: 'tpl-adol-6', text: 'Quiero usar mi celular', category: 'ocio', icon: '📱', imageData: './assets/cards/celular.svg' }
    ]
  },
  {
    id: 'pack-emociones',
    title: 'Pack Emociones y Límites',
    description: 'Expresión clara de sobrecarga sensorial, pausas y bienestar.',
    badge: 'Regulación',
    cards: [
      { id: 'tpl-emo-1', text: 'Hay mucho ruido', category: 'limites', icon: '🔇', imageData: './assets/cards/ruido.svg' },
      { id: 'tpl-emo-2', text: 'Necesito una pausa', category: 'limites', icon: '⏸️', imageData: './assets/cards/pausa.svg' },
      { id: 'tpl-emo-3', text: 'No me toquen ahora', category: 'limites', icon: '✋', imageData: './assets/cards/espacio.svg' },
      { id: 'tpl-emo-4', text: 'Me siento abrumada', category: 'limites', icon: '🌊', imageData: './assets/cards/abrumada.svg' },
      { id: 'tpl-emo-5', text: 'Me duele algo', category: 'necesidades', icon: '🩹', imageData: './assets/cards/dolor.svg' },
      { id: 'tpl-emo-6', text: 'Estoy tranquila', category: 'limites', icon: '✨', imageData: './assets/cards/tranquila.svg' }
    ]
  },
  {
    id: 'pack-salidas',
    title: 'Pack Salidas y Ocio',
    description: 'Planes, música, series y decisiones para el tiempo libre.',
    badge: 'Tiempo libre',
    cards: [
      { id: 'tpl-oci-1', text: 'Quiero escuchar música', category: 'ocio', icon: '🎵', imageData: './assets/cards/musica.svg' },
      { id: 'tpl-oci-2', text: 'Quiero ver una serie', category: 'ocio', icon: '🎬', imageData: './assets/cards/serie.svg' },
      { id: 'tpl-oci-3', text: 'Quiero salir a caminar', category: 'ocio', icon: '🚶‍♀️', imageData: './assets/cards/caminar.svg' },
      { id: 'tpl-oci-4', text: 'Quiero volver a casa', category: 'necesidades', icon: '🏠', imageData: './assets/cards/casa.svg' },
      { id: 'tpl-oci-5', text: 'Prefiero quedarme acá', category: 'limites', icon: '🛋️', imageData: './assets/cards/quedarme.svg' }
    ]
  },
  {
    id: 'pack-familia',
    title: 'Pack Familia y Amigos',
    description: 'Vínculos cercanos, familia a distancia y equipo terapéutico.',
    badge: 'Vínculos',
    cards: [
      { id: 'tpl-fam-1', text: 'Quiero hablar con mamá', category: 'familia', icon: '👩', imageData: './assets/cards/mama.svg' },
      { id: 'tpl-fam-2', text: 'Quiero hablar con papá', category: 'familia', icon: '👨', imageData: './assets/cards/papa.svg' },
      { id: 'tpl-fam-3', text: 'Mandar mensaje a mi familia', category: 'familia', icon: '💌', imageData: './assets/cards/mensaje.svg' },
      { id: 'tpl-fam-4', text: 'Quiero ver a mis amigos', category: 'familia', icon: '👥', imageData: './assets/cards/amigos.svg' },
      { id: 'tpl-fam-5', text: 'Necesito ayuda', category: 'necesidades', icon: '🤝', imageData: './assets/cards/ayuda.svg' }
    ]
  }
];

export const DEFAULT_QUICK_QUESTIONS = [
  {
    id: 'qq-1',
    title: '🍨 Plan de tarde',
    optionA: { text: '¿Querés helado?', icon: '🍨', imageData: './assets/cards/helado.svg' },
    optionB: { text: '¿Querés ver una peli?', icon: '🎬', imageData: './assets/cards/serie.svg' },
    createdAt: 1700000001
  },
  {
    id: 'qq-2',
    title: '🚶‍♀️ Salir o casa',
    optionA: { text: '¿Querés salir a caminar?', icon: '🚶‍♀️', imageData: './assets/cards/caminar.svg' },
    optionB: { text: '¿Preferís quedarte en casa?', icon: '🏠', imageData: './assets/cards/casa.svg' },
    createdAt: 1700000002
  },
  {
    id: 'qq-3',
    title: '💧 Agua o comida',
    optionA: { text: '¿Querés tomar agua?', icon: '💧', imageData: './assets/cards/agua.svg' },
    optionB: { text: '¿Tenés hambre?', icon: '🍽️', imageData: './assets/cards/comida.svg' },
    createdAt: 1700000003
  },
  {
    id: 'qq-4',
    title: '🎧 Música o serie',
    optionA: { text: '¿Querés escuchar música?', icon: '🎵', imageData: './assets/cards/musica.svg' },
    optionB: { text: '¿Querés ver una serie?', icon: '🎬', imageData: './assets/cards/serie.svg' },
    createdAt: 1700000004
  },
  {
    id: 'qq-5',
    title: '⏸️ Pausa o seguir',
    optionA: { text: '¿Necesitás una pausa?', icon: '⏸️', imageData: './assets/cards/pausa.svg' },
    optionB: { text: '¿Querés auriculares?', icon: '🎧', imageData: './assets/cards/auriculares.svg' },
    createdAt: 1700000005
  },
  {
    id: 'qq-6',
    title: '🚪 Pieza o familia',
    optionA: { text: '¿Querés estar en tu pieza?', icon: '🚪', imageData: './assets/cards/pieza.svg' },
    optionB: { text: '¿Querés hablar con mamá?', icon: '👩', imageData: './assets/cards/mama.svg' },
    createdAt: 1700000006
  }
];

/* ==========================================================================
   Inicialización Firebase (opcional, cero dependencias locales)
   ========================================================================== */
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
    const db = fsMod.getFirestore(app);
    fb = { db, ...fsMod };
    return true;
  } catch (err) {
    console.warn('No se pudo conectar a Firebase, usando modo local:', err);
    fb = null;
    return false;
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

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
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
    return list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  } catch {
    return [];
  }
}

export async function saveCard(card) {
  const payload = {
    id: card.id || `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: (card.text || '').trim(),
    category: card.category || 'necesidades',
    icon: card.icon || '💬',
    imageData: card.imageData || null,
    audioData: card.audioData || null,
    authorRole: card.authorRole || 'family',
    createdAt: card.createdAt || Date.now()
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
        id: `${tpl.id}-${Date.now()}-${importedCount}`,
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
  const payload = {
    id: question.id || `qq-${Date.now()}`,
    title: (question.title || '').trim() || 'Pregunta del día',
    optionA: {
      text: (question.optionA?.text || '').trim(),
      icon: question.optionA?.icon || '🅰️',
      imageData: question.optionA?.imageData || null
    },
    optionB: {
      text: (question.optionB?.text || '').trim(),
      icon: question.optionB?.icon || '🅱️',
      imageData: question.optionB?.imageData || null
    },
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

  if (!settings.seeded && cards.length === 0) {
    await importTemplatePack('pack-adolescente');
    await importTemplatePack('pack-emociones');
    saveSettings({ seeded: true });
  } else if (cards.length > 0) {
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
  await putInStore(STORE_EVENTS, eventObj);
  notifyLocalSync('events');

  if (fb) {
    const { pairingCode } = getSettings();
    await fb.setDoc(fb.doc(fb.db, 'boards', pairingCode, 'events', eventObj.id), eventObj);
  }
  return eventObj;
}

/**
 * El adolescente envía un pedido/aviso silencioso a Familia.
 */
export async function sendTeenRequest({ label, category = 'general' }) {
  const ev = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'teen_request',
    label,
    category,
    status: 'sent', // 'sent' -> 'seen'
    createdAt: Date.now()
  };
  return saveLiveEvent(ev);
}

/**
 * Familia envía una pregunta de 2 opciones al dispositivo del adolescente.
 */
export async function sendParentQuestion({ title, optionA, optionB }) {
  const ev = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'parent_question',
    title: title || 'Pregunta de Familia',
    optionA,
    optionB,
    status: 'pending', // 'pending' -> 'answered'
    answer: null,
    answerText: null,
    createdAt: Date.now()
  };
  return saveLiveEvent(ev);
}

/**
 * El adolescente responde una pregunta enviada por Familia.
 */
export async function answerParentQuestion(eventId, side, answerText) {
  const all = await getLiveEvents();
  const target = all.find((e) => e.id === eventId);
  if (!target) return null;

  const updated = {
    ...target,
    status: 'answered',
    answer: side,
    answerText,
    answeredAt: Date.now()
  };
  return saveLiveEvent(updated);
}

/**
 * Familia marca un aviso o respuesta como "Visto".
 */
export async function markEventSeen(eventId) {
  const all = await getLiveEvents();
  const target = all.find((e) => e.id === eventId);
  if (!target) return null;

  const updated = {
    ...target,
    status: 'seen',
    seenAt: Date.now()
  };
  return saveLiveEvent(updated);
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
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
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

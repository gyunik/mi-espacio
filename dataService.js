/**
 * dataService.js — Capa de Servicios de Datos (Local IndexedDB/localStorage + Estructura Firebase-Ready)
 *
 * Diseñada para funcionar 100% offline en este MVP mediante IndexedDB + localStorage,
 * manteniendo un esquema JSON y una interfaz de métodos compatible con:
 *  - Firebase Authentication (anónimo / email)
 *  - Cloud Firestore (colecciones: boards/{pairingCode}/cards, quickQuestions, usageLogs)
 *  - Firebase Storage (fotos y notas de voz)
 */

const DB_NAME = 'mi_espacio_db';
const DB_VERSION = 1;
const STORE_CARDS = 'cards';
const STORE_QUESTIONS = 'quickQuestions';
const STORE_LOGS = 'usageLogs';
const SETTINGS_KEY = 'mi_espacio_settings_v1';

/**
 * Placeholder de configuración para conectar Firebase sin reescribir la UI.
 * Para activar sincronización remota en tiempo real, completar las credenciales
 * e implementar el adaptador Firestore dentro de este módulo.
 */
export const FIREBASE_CONFIG = {
  enabled: false,
  apiKey: 'TU_API_KEY',
  authDomain: 'tu-proyecto.firebaseapp.com',
  projectId: 'tu-proyecto',
  storageBucket: 'tu-proyecto.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:000000000000'
};

export const CATEGORIES = [
  { id: 'all', label: 'Todas' },
  { id: 'limites', label: 'Límites y Calma' },
  { id: 'necesidades', label: 'Necesidades' },
  { id: 'familia', label: 'Familia y Amigos' },
  { id: 'ocio', label: 'Música y Ocio' }
];

export const DEFAULT_SETTINGS = {
  role: null, // 'communicator' | 'family' | null (primer inicio)
  pairingCode: '', // Código de vinculación de 6 dígitos
  speechRate: 0.95,
  voiceURI: '',
  showPhraseBar: true,
  seeded: false
};

/**
 * Biblioteca de plantillas listas para importar con un clic ("Explorar / Plantillas").
 */
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

/**
 * Preguntas rápidas iniciales para el modo "Te Pregunto".
 */
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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllFromStore(storeName) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function putInStore(storeName, item) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

async function deleteFromStore(storeName, id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* ==========================================================================
   Configuración y Código de Vinculación de 6 dígitos
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
   Tarjetas (CRUD + Importación de Plantillas)
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
  return putInStore(STORE_CARDS, payload);
}

export async function removeCard(id) {
  return deleteFromStore(STORE_CARDS, id);
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

export async function ensureSeedData() {
  const settings = getSettings();
  const cards = await getCards();
  const questions = await getQuickQuestions();

  if (!settings.seeded && cards.length === 0) {
    // Cargar Pack Adolescente + Pack Emociones como base inicial
    await importTemplatePack('pack-adolescente');
    await importTemplatePack('pack-emociones');
    saveSettings({ seeded: true });
  } else if (cards.length > 0) {
    // Enriquecer tarjetas precargadas que aún no tengan imagen asignada
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
    quickQuestions: await getQuickQuestions()
  };
}

/* ==========================================================================
   Preguntas Rápidas del Día (Modo Familia -> Modo Comunicador "Te Pregunto")
   ========================================================================== */
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
  return putInStore(STORE_QUESTIONS, payload);
}

export async function removeQuickQuestion(id) {
  return deleteFromStore(STORE_QUESTIONS, id);
}

/* ==========================================================================
   Historial Simple de Uso (Qué botones tocó hoy)
   ========================================================================== */
export async function logUsageEvent({ actionType, label, category = 'general' }) {
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actionType, // 'quick' | 'card' | 'choice'
    label,
    category,
    timestamp: Date.now()
  };
  try {
    await putInStore(STORE_LOGS, entry);
  } catch (err) {
    console.warn('No se pudo registrar historial:', err);
  }
  return entry;
}

export async function getTodayUsageLogs() {
  try {
    const all = await getAllFromStore(STORE_LOGS);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const minTs = startOfDay.getTime();

    return all
      .filter((item) => item.timestamp >= minTs)
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
   Compresión de Imágenes Locales (listo para IndexedDB o Firebase Storage)
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

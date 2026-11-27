/**
 * voiceAssistant.js — Motor híbrido del Asistente de Voz de Mi Espacio
 *
 * Arquitectura orientada a costo $0 y seguridad para personas mayores:
 * 1) Intenciones locales (0 tokens / gratis):
 *    - Llamar a un contacto autorizado (con confirmación visual grande antes de marcar)
 *    - Consultar día y hora (offline)
 *    - Consultar clima actual (Open-Meteo, gratis)
 *    - Escuchar noticias del día (RSS/Worker, gratis)
 *    - Prender/apagar o buscar radio en vivo (Radio Browser, gratis)
 *    - Avisar a la familia en tiempo real (Firestore + Push)
 * 2) IA conversacional opcional (solo para preguntas abiertas/ambiguas):
 *    - Pasa siempre por el Cloudflare Worker propio (/assistant), nunca API keys en el frontend.
 *    - Respeta una cuota diaria configurable (pensada para control de costos / futuro plan).
 */

const AI_USAGE_STORAGE_KEY = 'mi_espacio_ai_usage_v1';

/**
 * Normaliza un texto para comparación tolerante (minúsculas, sin tildes ni puntuación).
 * @param {string} str
 * @returns {string}
 */
export function normalizeVoiceText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[¿?¡!.,;:()"""']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Combina los contactos de voz configurados en la agenda con los contactos
 * clásicos de la app (Persona de Contacto y Obra Social/Salud) si existen.
 * @param {Object} settings
 * @returns {Array<{ id: string, name: string, phone: string, mode: string, aliases: string[], roleHint: string }>}
 */
export function buildAuthorizedContacts(settings = {}) {
  const list = [];
  const seenPhones = new Set();

  const pushContact = ({ id, name, phone, mode = 'tel', aliases = '', roleHint = '' }) => {
    const cleanPhone = String(phone || '').replace(/[^\d+*#]/g, '');
    const cleanName = String(name || '').trim();
    if (!cleanName || !cleanPhone) return;

    const aliasList = Array.isArray(aliases)
      ? aliases
      : String(aliases || '')
          .split(/[,;/]+/)
          .map((s) => s.trim())
          .filter(Boolean);

    const key = `${cleanName.toLowerCase()}|${cleanPhone}|${mode}`;
    if (seenPhones.has(key)) return;
    seenPhones.add(key);

    list.push({
      id: id || `vc-${list.length + 1}`,
      name: cleanName,
      phone: cleanPhone,
      mode: mode === 'whatsapp' ? 'whatsapp' : 'tel',
      aliases: aliasList,
      roleHint
    });
  };

  if (Array.isArray(settings.voiceContacts)) {
    settings.voiceContacts.forEach((c) => pushContact(c));
  }

  // Respaldo automático: si la familia ya cargó Persona de Contacto o Salud, sumarlos como autorizados
  if (settings.contactCallName && settings.contactCallPhone) {
    pushContact({
      id: 'legacy-contact',
      name: settings.contactCallName,
      phone: settings.contactCallPhone,
      mode: settings.contactCallMode || 'tel',
      aliases: ['contacto', 'familiar'],
      roleHint: 'Persona de contacto'
    });
  }

  if (settings.healthCallName && settings.healthCallPhone) {
    pushContact({
      id: 'legacy-health',
      name: settings.healthCallName,
      phone: settings.healthCallPhone,
      mode: 'tel',
      aliases: ['medico', 'doctor', 'doctora', 'emergencia', 'emergencias', 'ambulancia', 'obra social', 'salud'],
      roleHint: 'Salud / Emergencias'
    });
  }

  return list;
}

/**
 * Busca el mejor contacto autorizado que coincida con el pedido de voz.
 * @param {string} targetText
 * @param {Array} contacts
 * @returns {Object|null}
 */
export function matchAuthorizedContact(targetText, contacts = []) {
  const cleanTarget = normalizeVoiceText(targetText)
    .replace(/^(a|al|la|el|con|mi|mis|por|favor|telefono|whatsapp)\s+/g, '')
    .trim();

  if (!cleanTarget || !Array.isArray(contacts) || contacts.length === 0) return null;

  const targetWords = cleanTarget
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !['mi', 'el', 'la', 'los', 'las', 'al', 'de', 'del', 'un', 'una', 'por', 'favor'].includes(w));

  let best = null;
  let bestScore = 0;

  for (const contact of contacts) {
    const candidates = [contact.name, ...(contact.aliases || [])]
      .map((c) => normalizeVoiceText(c))
      .filter(Boolean);

    let score = 0;
    for (const cand of candidates) {
      if (!cand) continue;
      if (cand === cleanTarget) {
        score = Math.max(score, 100);
      } else if (cleanTarget.includes(cand) && cand.length >= 3) {
        score = Math.max(score, 85);
      } else if (cand.includes(cleanTarget) && cleanTarget.length >= 3) {
        score = Math.max(score, 80);
      } else {
        const candWords = cand.split(/\s+/).filter((w) => w.length >= 2);
        const matches = targetWords.filter((tw) =>
          candWords.some((cw) => cw === tw || (cw.length >= 4 && tw.length >= 4 && (cw.startsWith(tw) || tw.startsWith(cw))))
        );
        if (matches.length > 0) {
          score = Math.max(score, 55 + matches.length * 15);
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = contact;
    }
  }

  return bestScore >= 60 ? best : null;
}

/**
 * Detecta la temática de noticias si el usuario mencionó alguna en particular.
 */
function detectNewsTopic(norm) {
  if (/\b(deporte|deportes|futbol|boca|river|seleccion)\b/.test(norm)) return 'deportes';
  if (/\b(mundo|internacional|internacionales|exterior)\b/.test(norm)) return 'mundo';
  if (/\b(salud|medicina|bienestar)\b/.test(norm)) return 'salud';
  if (/\b(cultura|espectaculo|espectaculos|cine|musica|teatro)\b/.test(norm)) return 'cultura';
  if (/\b(ciencia|tecnologia)\b/.test(norm)) return 'ciencia';
  if (/\b(pais|nacional|politica|economia)\b/.test(norm)) return 'nacional';
  return null;
}

/**
 * Analiza una frase hablada en español y clasifica la intención de forma 100% local (0 tokens).
 *
 * Posibles resultados:
 * - { type: 'call_contact', contact, requestedTarget, preferredMode }
 * - { type: 'call_not_found', requestedTarget }
 * - { type: 'notify_family', message }
 * - { type: 'time' }
 * - { type: 'weather' }
 * - { type: 'news', topic }
 * - { type: 'radio_on', query }
 * - { type: 'radio_off' }
 * - { type: 'help' }
 * - { type: 'open_query', text } -> candidata a IA conversacional (si está activada)
 *
 * @param {string} rawText
 * @param {Object} settings
 */
export function parseLocalVoiceIntent(rawText, settings = {}) {
  const original = String(rawText || '').trim();
  const norm = normalizeVoiceText(original);

  if (!norm) {
    return { type: 'empty', text: '' };
  }

  // 1. Llamadas a contactos autorizados (prioridad alta por seguridad)
  const callMatch = norm.match(
    /\b(?:llama|llamar|llamale|llamame|comunicame|marcale|marca|hablar con|quiero hablar con|mandar whatsapp|whatsapp a|whatsappear a)\s+(?:a\s+|al\s+|con\s+)?(.+)$/i
  );
  if (callMatch && callMatch[1]) {
    const requestedTarget = callMatch[1]
      .replace(/\b(por telefono|por whatsapp|por favor|ahora|ya)\b/g, '')
      .trim();
    const contacts = buildAuthorizedContacts(settings);
    const matched = matchAuthorizedContact(requestedTarget, contacts);
    const wantsWa = /\bwhatsapp\b/.test(norm);

    if (matched) {
      return {
        type: 'call_contact',
        contact: matched,
        requestedTarget,
        preferredMode: wantsWa ? 'whatsapp' : matched.mode || 'tel'
      };
    }

    return {
      type: 'call_not_found',
      requestedTarget
    };
  }

  // 2. Avisar / mandar mensaje a la familia
  const notifyMatch = original.match(
    /(?:avisale|avisa|avisar|mandale|manda|enviar|decile)\s+(?:a\s+)?(?:mi\s+)?(?:familia|hijos|todos|casa)(?:\s+que)?\s*(.*)$/i
  );
  if (notifyMatch) {
    const msg = (notifyMatch[1] || '').trim();
    return {
      type: 'notify_family',
      message: msg || 'Necesito que se comuniquen conmigo'
    };
  }

  // 3. Día y hora (100% offline)
  if (
    /\b(que hora es|que hora son|dime la hora|decime la hora|la hora|que dia es|que fecha es|fecha de hoy|que dia estamos)\b/.test(
      norm
    )
  ) {
    return { type: 'time' };
  }

  // 4. Clima / pronóstico
  if (
    /\b(clima|tiempo hace|como esta el tiempo|como esta afuera|temperatura|va a llover|llueve|pronostico|hace frio|hace calor)\b/.test(
      norm
    )
  ) {
    return { type: 'weather' };
  }

  // 5. Noticias
  if (
    /\b(noticia|noticias|titular|titulares|que paso hoy|novedades del dia|diario)\b/.test(norm)
  ) {
    return {
      type: 'news',
      topic: detectNewsTopic(norm)
    };
  }

  // 6. Radio (apagar o prender)
  if (
    /\b(apaga|apagar|detene|detener|para|parar|saca|sacar|silencia|silenciar|corta|cortar)\b/.test(norm) &&
    /\b(radio|musica|audio|sonido)\b/.test(norm)
  ) {
    return { type: 'radio_off' };
  }

  if (/\b(pone|poner|prende|prender|escuchar|abri|abrir|sintoniza|sintonizar)\b/.test(norm) && /\bradio\b/.test(norm)) {
    const stationMatch = norm.match(/\bradio\s+([a-z0-9\s]{2,30})$/i);
    const rawStation = stationMatch ? stationMatch[1].replace(/\b(por favor|en vivo|ahora)\b/g, '').trim() : '';
    return {
      type: 'radio_on',
      query: rawStation
    };
  }

  if (norm === 'radio' || norm === 'la radio') {
    return { type: 'radio_on', query: '' };
  }

  // 7. Ayuda / qué podés hacer
  if (/\b(ayuda|que podes hacer|que puedes hacer|como funciona|comandos)\b/.test(norm)) {
    return { type: 'help' };
  }

  // 8. Resto: consulta abierta (candidata a IA si está habilitada)
  return {
    type: 'open_query',
    text: original
  };
}

/**
 * Devuelve la fecha local en formato YYYY-MM-DD para el contador diario de IA.
 */
export function getLocalDateKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Lee el uso diario actual de consultas IA en este dispositivo.
 */
export function getDailyAiUsage(now = new Date()) {
  const today = getLocalDateKey(now);
  try {
    const raw = localStorage.getItem(AI_USAGE_STORAGE_KEY);
    if (!raw) return { date: today, count: 0 };
    const parsed = JSON.parse(raw);
    if (parsed?.date !== today) return { date: today, count: 0 };
    return { date: today, count: Math.max(0, Number(parsed.count) || 0) };
  } catch {
    return { date: today, count: 0 };
  }
}

/**
 * Incrementa en 1 el contador diario de consultas IA.
 */
export function incrementDailyAiUsage(now = new Date()) {
  const current = getDailyAiUsage(now);
  const next = { date: current.date, count: current.count + 1 };
  try {
    localStorage.setItem(AI_USAGE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sin storage disponible
  }
  return next;
}

/**
 * Consulta al Cloudflare Worker propio (/assistant) para responder preguntas abiertas.
 * Nunca usa API keys en el cliente.
 */
export async function askAssistantAI({
  workerUrl,
  question,
  boardId = '',
  city = 'Buenos Aires',
  dailyLimit = 10
}) {
  const cleanWorker = String(workerUrl || '').trim().replace(/\/+$/, '');
  if (!cleanWorker) {
    return {
      ok: false,
      code: 'no_worker',
      reply: 'El asistente con inteligencia artificial todavía no está conectado al servidor.'
    };
  }

  const limit = Math.max(1, Number(dailyLimit) || 10);
  const usage = getDailyAiUsage();
  if (usage.count >= limit) {
    return {
      ok: false,
      code: 'quota_exceeded',
      usage,
      reply: `Hoy ya usaste tus ${limit} consultas con inteligencia artificial. Podés seguir pidiéndome la hora, el clima, las noticias, la radio o llamar a tu familia sin límite.`
    };
  }

  const res = await fetch(`${cleanWorker}/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: String(question || '').trim().slice(0, 320),
      boardId: String(boardId || 'local').slice(0, 32),
      city: String(city || 'Buenos Aires').slice(0, 60)
    })
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data?.ok) {
    const errCode = data?.error || `http_${res.status}`;
    if (errCode === 'ai_not_configured') {
      return {
        ok: false,
        code: 'ai_not_configured',
        reply: 'La familia todavía no activó la clave de inteligencia artificial en el servidor. Mientras tanto, puedo decirte la hora, el clima, las noticias, poner la radio o llamar a un familiar.'
      };
    }
    if (res.status === 429 || errCode === 'rate_limited') {
      return {
        ok: false,
        code: 'rate_limited',
        reply: 'Hiciste muchas preguntas seguidas. Esperá un minutito y volvemos a intentar.'
      };
    }
    return {
      ok: false,
      code: errCode,
      reply: 'En este momento no pude consultar la respuesta. Intentemos de nuevo en unos segundos.'
    };
  }

  const nextUsage = incrementDailyAiUsage();
  return {
    ok: true,
    reply: String(data.reply || '').trim(),
    usage: nextUsage
  };
}

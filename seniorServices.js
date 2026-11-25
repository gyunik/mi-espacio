/**
 * seniorServices.js — Servicios gratuitos (sin API key) para Radio en vivo, Clima y Día/Hora.
 * - Radio: Radio Browser API (https://api.radio-browser.info)
 * - Clima y Ciudades: Open-Meteo API (https://open-meteo.com)
 * - Día y Hora: 100% local / offline
 */

const RADIO_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info'
];

async function fetchJsonWithFallback(paths) {
  let lastErr = null;
  for (const url of paths) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok) return await res.json();
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Sin conexión');
}

let cachedArStations = null;

function normalizeText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function detectBand(name, tags) {
  const txt = `${normalizeText(name)} ${normalizeText(tags)}`;
  const isAm =
    /\bam\b/.test(txt) ||
    /\bam\s?\d{3,4}\b/.test(txt) ||
    /\b(530|540|550|590|630|650|670|680|700|710|750|770|790|810|830|870|910|950|990|1030|1070|1110|1150|1190|1230|1270|1300|1350|1400|1420|1550)\b/.test(txt) ||
    /\b(mitre|rivadavia|continental|la red|cadena 3|del plata|radio 10|radio nacional|splendid|colonia)\b/.test(txt);

  const isFm =
    /\bfm\b/.test(txt) ||
    /\b(8[7-9]|9\d|10[0-8])[.,]\d\b/.test(txt);

  if (isAm && !isFm) return 'AM';
  if (isFm && !isAm) return 'FM';
  // Si menciona explícitamente FM y frecuencia (ej. "Mitre Mendoza FM 100.3"), priorizar FM
  if (/\bfm\b/.test(normalizeText(name)) || /\b(8[7-9]|9\d|10[0-8])[.,]\d\b/.test(normalizeText(name))) {
    return 'FM';
  }
  if (isAm) return 'AM';
  return 'other';
}

/**
 * Carga y cachea las principales radios argentinas HTTPS para filtrado instantáneo al escribir.
 */
export async function loadArgentineStations() {
  if (cachedArStations && cachedArStations.length > 0) {
    return cachedArStations;
  }
  const urls = RADIO_SERVERS.map(
    (s) =>
      `${s}/json/stations/bycountrycodeexact/AR?hidebroken=true&order=clickcount&reverse=true&limit=300`
  );
  const raw = await fetchJsonWithFallback(urls);
  cachedArStations = filterHttpsStations(raw);
  return cachedArStations;
}

/**
 * Filtra localmente estaciones por texto y banda ('all' | 'AM' | 'FM') en 0ms.
 */
export function filterStationsLocal(stations, { query = '', band = 'all' } = {}) {
  const q = normalizeText(query).trim();
  const terms = q ? q.split(/\s+/).filter(Boolean) : [];

  return (stations || []).filter((st) => {
    if (band === 'AM' && st.band !== 'AM') return false;
    if (band === 'FM' && st.band !== 'FM') return false;
    if (terms.length === 0) return true;
    const hay = normalizeText(`${st.name} ${st.state || ''} ${st.country || ''}`);
    return terms.every((t) => hay.includes(t));
  });
}

/**
 * Busca estaciones de radio con stream HTTPS (priorizando Argentina).
 */
export async function searchRadioStations(query) {
  const q = String(query || '').trim();
  if (!q) return [];

  const encoded = encodeURIComponent(q);
  const arUrls = RADIO_SERVERS.map(
    (s) =>
      `${s}/json/stations/search?name=${encoded}&countrycode=AR&hidebroken=true&order=clickcount&reverse=true&limit=12`
  );

  let raw = [];
  try {
    raw = await fetchJsonWithFallback(arUrls);
  } catch {
    raw = [];
  }

  let filtered = filterHttpsStations(raw);

  // Si en Argentina hubo pocos resultados, ampliar búsqueda global
  if (filtered.length < 3) {
    const globalUrls = RADIO_SERVERS.map(
      (s) =>
        `${s}/json/stations/search?name=${encoded}&hidebroken=true&order=clickcount&reverse=true&limit=12`
    );
    try {
      const globalRaw = await fetchJsonWithFallback(globalUrls);
      const extra = filterHttpsStations(globalRaw);
      const seen = new Set(filtered.map((s) => s.url));
      extra.forEach((st) => {
        if (!seen.has(st.url)) {
          seen.add(st.url);
          filtered.push(st);
        }
      });
    } catch {}
  }

  return filtered.slice(0, 10);
}

function filterHttpsStations(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const st of list) {
    const url = (st.url_resolved || st.url || '').trim();
    const name = (st.name || '').trim();
    if (!url.startsWith('https://') || !name) continue;
    // Evitar playlists .pls/.m3u y streams HLS (.m3u8) que <audio> no reproduce directo en Chrome/Android
    if (st.hls === 1 || /\.(pls|m3u|m3u8)(\?|$)/i.test(url)) continue;
    const key = `${name.toLowerCase()}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: name.slice(0, 52),
      url,
      country: st.country || st.countrycode || '',
      state: st.state || '',
      band: detectBand(name, st.tags || '')
    });
  }
  return out;
}

/**
 * Busca ciudades con Open-Meteo Geocoding (sin API key).
 */
export async function searchCities(query) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=es&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo buscar la ciudad');
  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];

  return results.map((item) => {
    const parts = [item.name, item.admin1, item.country].filter(Boolean);
    return {
      name: item.name,
      label: parts.join(', '),
      lat: item.latitude,
      lon: item.longitude
    };
  });
}

function describeWmoCode(code) {
  if (code === 0) return { text: 'despejado', icon: '☀️' };
  if (code === 1) return { text: 'mayormente despejado', icon: '🌤️' };
  if (code === 2) return { text: 'parcialmente nublado', icon: '⛅' };
  if (code === 3) return { text: 'nublado', icon: '☁️' };
  if (code === 45 || code === 48) return { text: 'con neblina', icon: '🌫️' };
  if ([51, 53, 55, 56, 57].includes(code)) return { text: 'con llovizna', icon: '🌦️' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { text: 'con lluvia', icon: '🌧️' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { text: 'con nieve', icon: '❄️' };
  if ([95, 96, 99].includes(code)) return { text: 'con tormenta', icon: '⛈️' };
  return { text: 'templado', icon: '🌤️' };
}

/**
 * Obtiene el clima actual y resumen del día desde Open-Meteo.
 */
export async function fetchWeatherSummary({ city, lat, lon }) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&current=temperature_2m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=auto&forecast_days=1`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo consultar el clima');
  const data = await res.json();

  const temp = Math.round(data.current?.temperature_2m ?? 20);
  const wmo = describeWmoCode(data.current?.weather_code ?? 0);
  const maxT = Math.round(data.daily?.temperature_2m_max?.[0] ?? temp);
  const minT = Math.round(data.daily?.temperature_2m_min?.[0] ?? temp);
  const rainProb = Math.round(data.daily?.precipitation_probability_max?.[0] ?? 0);

  const cityName = city || 'tu ciudad';
  let rainSpeech = 'No se esperan lluvias.';
  if (rainProb >= 60) {
    rainSpeech = `Hay probabilidad alta de lluvia, del ${rainProb} por ciento.`;
  } else if (rainProb >= 30) {
    rainSpeech = `Hay posibilidad de alguna lluvia, del ${rainProb} por ciento.`;
  }

  const headline = `${temp}°C · ${wmo.text.charAt(0).toUpperCase() + wmo.text.slice(1)}`;
  const details = `${cityName} · Máx ${maxT}° / Mín ${minT}° · Lluvia: ${rainProb}%`;
  const speechText = `En ${cityName} hace ${temp} grados y está ${wmo.text}. Hoy la máxima será de ${maxT} grados y la mínima de ${minT}. ${rainSpeech}`;

  return {
    icon: wmo.icon,
    headline,
    details,
    speechText
  };
}

/**
 * Genera el resumen hablado y visual de día y hora actual (100% offline).
 */
export function getDateTimeSummary(now = new Date()) {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const dayName = days[now.getDay()];
  const dayNum = now.getDate();
  const monthName = months[now.getMonth()];
  const hours24 = now.getHours();
  const minutes = now.getMinutes();

  const hh = String(hours24).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const headline = `${hh}:${mm}`;
  const details = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNum} de ${monthName}`;

  // Frase natural en español rioplatense
  let period = 'de la mañana';
  if (hours24 >= 12 && hours24 < 20) period = 'de la tarde';
  else if (hours24 >= 20 || hours24 < 5) period = 'de la noche';

  const h12 = hours24 % 12 || 12;
  const hourPhrase = h12 === 1 ? 'Es la una' : `Son las ${h12}`;
  let minPhrase = 'en punto';
  if (minutes === 15) minPhrase = 'y cuarto';
  else if (minutes === 30) minPhrase = 'y media';
  else if (minutes > 0) minPhrase = `y ${minutes}`;

  const speechText = `Hoy es ${dayName} ${dayNum} de ${monthName}. ${hourPhrase} ${minPhrase} ${period}.`;

  return {
    icon: '🕒',
    headline,
    details,
    speechText
  };
}

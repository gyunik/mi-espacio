/**
 * worker/push-worker.js — Cloudflare Worker gratuito para enviar Push Notifications vía FCM HTTP v1
 *
 * Cómo desplegarlo en 2 minutos (gratis, sin tarjeta):
 * 1. Creá una cuenta gratis en https://dash.cloudflare.com -> Workers & Pages -> Create -> Create Worker.
 * 2. Ponelo de nombre "mi-espacio-push", tocá Deploy y luego "Edit code".
 * 3. Pegá este archivo completo y tocá "Deploy".
 * 4. En Settings -> Variables and Secrets del Worker, agregá estos 3 Secrets
 *    (sacados de Firebase -> Configuración del proyecto -> Cuentas de servicio -> Generar nueva clave privada):
 *      - FIREBASE_PROJECT_ID   (ej: mi-espacio-b77c1)
 *      - FIREBASE_CLIENT_EMAIL (el campo "client_email" del JSON)
 *      - FIREBASE_PRIVATE_KEY  (el campo "private_key" completo del JSON)
 *    Opcional (solo si activás el modo "Con IA conversacional" en el Asistente de Voz):
 *      - GEMINI_API_KEY        (clave gratuita/paga de Google AI Studio: https://aistudio.google.com/apikey)
 *      - AI_MODEL              (opcional, por defecto: gemini-flash-lite-latest)
 * 5. Copiá la URL del Worker (ej: https://mi-espacio-push.tu-usuario.workers.dev)
 *    y pegala en firebaseConfig.js -> pushConfig.workerUrl.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const NEWS_RSS_FEEDS = {
  argentina: 'https://news.google.com/rss?hl=es-419&gl=AR&ceid=AR:es-419',
  nacional: 'https://news.google.com/rss/headlines/section/topic/NATION?hl=es-419&gl=AR&ceid=AR:es-419',
  mundo: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=es-419&gl=AR&ceid=AR:es-419',
  deportes: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=es-419&gl=AR&ceid=AR:es-419',
  cultura: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=es-419&gl=AR&ceid=AR:es-419',
  salud: 'https://news.google.com/rss/headlines/section/topic/HEALTH?hl=es-419&gl=AR&ceid=AR:es-419',
  ciencia: 'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=es-419&gl=AR&ceid=AR:es-419'
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const urlObj = new URL(request.url);

    // Endpoint GET /news?topic=argentina&limit=5 — Titulares de noticias en español (sin API key)
    if (request.method === 'GET' && urlObj.pathname.replace(/\/+$/, '') === '/news') {
      return handleNewsRequest(urlObj);
    }

    // Endpoint POST /assistant — Respuestas conversacionales breves para el Asistente de Voz (IA opcional)
    if (request.method === 'POST' && urlObj.pathname.replace(/\/+$/, '') === '/assistant') {
      return handleAssistantRequest(request, env);
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
    }

    try {
      const { tokens, title, body, url = 'https://gyunik.github.io/mi-espacio/' } = await request.json();

      if (!Array.isArray(tokens) || tokens.length === 0) {
        return jsonResponse({ ok: true, sent: 0 });
      }

      const accessToken = await getGoogleAccessToken(env);
      const endpoint = `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`;

      const results = await Promise.all(
        tokens.slice(0, 10).map(async (token) => {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: {
                token,
                data: {
                  title: String(title || 'Mi Espacio'),
                  body: String(body || 'Tenés un nuevo aviso'),
                  url: String(url)
                },
                webpush: {
                  headers: { Urgency: 'high' },
                  notification: {
                    title: String(title || 'Mi Espacio'),
                    body: String(body || 'Tenés un nuevo aviso'),
                    icon: 'https://gyunik.github.io/mi-espacio/icons/icon.svg'
                  },
                  fcm_options: { link: String(url) }
                }
              }
            })
          });
          return res.ok;
        })
      );

      return jsonResponse({ ok: true, sent: results.filter(Boolean).length });
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message || 'push_error' }, 500);
    }
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

async function getGoogleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64UrlEncode(
    JSON.stringify({
      iss: env.FIREBASE_CLIENT_EMAIL,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    })
  );

  const signingInput = `${header}.${claim}`;
  const privateKeyPem = (env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const key = await importPrivateKey(privateKeyPem);
  const sigBuf = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  );
  const jwt = `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(sigBuf))}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) {
    throw new Error('No se pudo obtener access_token de Google');
  }
  return tokenJson.access_token;
}

async function importPrivateKey(pem) {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function base64UrlEncode(str) {
  return base64UrlEncodeBytes(new TextEncoder().encode(str));
}

function base64UrlEncodeBytes(bytes) {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function handleNewsRequest(urlObj) {
  try {
    const rawTopic = (urlObj.searchParams.get('topic') || 'argentina').toLowerCase().trim();
    const topic = NEWS_RSS_FEEDS[rawTopic] ? rawTopic : 'argentina';
    const limit = Math.min(12, Math.max(1, Number(urlObj.searchParams.get('limit')) || 6));
    const rssUrl = NEWS_RSS_FEEDS[topic];

    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'MiEspacioNewsReader/1.0 (+https://gyunik.github.io/mi-espacio/)',
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
      },
      cf: { cacheTtl: 900, cacheEverything: true }
    });

    if (!res.ok) {
      return jsonResponse({ ok: false, error: `rss_http_${res.status}` }, 502);
    }

    const xml = await res.text();
    const items = parseRssItems(xml, limit);

    return new Response(JSON.stringify({ ok: true, topic, items }), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=600'
      }
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message || 'news_error' }, 500);
  }
}

function parseRssItems(xml, limit) {
  const items = [];
  const seen = new Set();
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const block = match[1];
    const rawTitle = extractXmlTag(block, 'title');
    if (!rawTitle) continue;

    let title = cleanXmlText(rawTitle);
    let source = cleanXmlText(extractXmlTag(block, 'source') || '');
    const pubDate = cleanXmlText(extractXmlTag(block, 'pubDate') || '');

    // Google News suele anexar " - Nombre del Medio" al final del título
    const lastDash = title.lastIndexOf(' - ');
    if (lastDash > 18) {
      const candidateSource = title.slice(lastDash + 3).trim();
      if (candidateSource.length > 0 && candidateSource.length <= 48) {
        if (!source) source = candidateSource;
        title = title.slice(0, lastDash).trim();
      }
    }

    const key = title.toLowerCase();
    if (!title || seen.has(key)) continue;
    seen.add(key);

    items.push({
      title,
      source,
      pubDate
    });
  }

  return items;
}

function extractXmlTag(block, tagName) {
  const re = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const m = block.match(re);
  return m ? m[1] : '';
}

function cleanXmlText(raw) {
  if (!raw) return '';
  let text = String(raw).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return text.replace(/\s+/g, ' ').trim();
}

/* ==========================================================================
   Asistente de Voz con IA (POST /assistant) — Proxy seguro sin exponer keys
   ========================================================================== */
const assistantRateWindow = new Map();

async function handleAssistantRequest(request, env) {
  try {
    const apiKey = (env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return jsonResponse({ ok: false, error: 'ai_not_configured' }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const question = String(body.question || '').trim().slice(0, 320);
    const boardId = String(body.boardId || 'anon').trim().slice(0, 40);
    const city = String(body.city || 'Buenos Aires').trim().slice(0, 60);

    if (!question) {
      return jsonResponse({ ok: false, error: 'empty_question' }, 400);
    }

    // Protección básica anti-ráfaga en memoria del isolate (máx. 6 req/min por tablero/IP)
    const ip = request.headers.get('CF-Connecting-IP') || 'ip';
    const rateKey = `${boardId}:${ip}`;
    const now = Date.now();
    const recent = (assistantRateWindow.get(rateKey) || []).filter((ts) => now - ts < 60_000);
    if (recent.length >= 6) {
      return jsonResponse({ ok: false, error: 'rate_limited' }, 429);
    }
    recent.push(now);
    assistantRateWindow.set(rateKey, recent);

    const model = (env.AI_MODEL || 'gemini-flash-lite-latest').trim();
    const systemInstruction =
      `Sos el asistente de voz amable de la app "Mi Espacio", diseñado para acompañar a personas mayores en Argentina (ubicación de referencia: ${city}). ` +
      'Respondé SIEMPRE en español rioplatense cálido, respetuoso y claro, en máximo 2 o 3 oraciones cortas pensadas para leerse en voz alta. ' +
      'No uses markdown, asteriscos, listas con viñetas ni emojis. ' +
      'Si te piden un consejo médico serio, respondé con prudencia y sugerí consultar con su médico o familiar.';

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const aiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: question }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 160
        }
      })
    });

    if (!aiRes.ok) {
      return jsonResponse({ ok: false, error: `ai_http_${aiRes.status}` }, 502);
    }

    const aiJson = await aiRes.json();
    const rawReply =
      aiJson?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join(' ')
        .trim() || '';

    const cleanReply = rawReply
      .replace(/[*_`#]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanReply) {
      return jsonResponse({ ok: false, error: 'empty_ai_reply' }, 502);
    }

    return jsonResponse({ ok: true, reply: cleanReply });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message || 'assistant_error' }, 500);
  }
}

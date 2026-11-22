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
 * 5. Copiá la URL del Worker (ej: https://mi-espacio-push.tu-usuario.workers.dev)
 *    y pegala en firebaseConfig.js -> pushConfig.workerUrl.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
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

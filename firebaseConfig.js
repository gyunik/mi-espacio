/**
 * firebaseConfig.js — Configuración de Firebase para sincronización en tiempo real
 */

export const firebaseConfig = {
  apiKey: "AIzaSyDmsiIYAzEjHVDkugP_JliNnt5AsjzhGIc",
  authDomain: "mi-espacio-b77c1.firebaseapp.com",
  projectId: "mi-espacio-b77c1",
  storageBucket: "mi-espacio-b77c1.firebasestorage.app",
  messagingSenderId: "162260072052",
  appId: "1:162260072052:web:59a3d32bbaf9950e1ac321"
};

/**
 * Configuración para Push Notifications en segundo plano (con la app cerrada o en otra app):
 * 1. vapidKey: Firebase -> Configuración del proyecto -> Cloud Messaging -> Certificados Push Web -> Generar par de claves.
 * 2. workerUrl: URL de tu Cloudflare Worker desplegado con worker/push-worker.js.
 */
export const pushConfig = {
  vapidKey: "BPgfEdRIb1EnXGdSfV3bX4Z0j9rG9n9j_20z5RcFMsWgyVAi22MwlL9-avMLBsHVtFoOxXRBqqtCnIf3wh2ccN4",
  workerUrl: "https://mi-espacio-push.gpy1174.workers.dev"
};

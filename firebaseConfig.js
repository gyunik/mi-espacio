/**
 * firebaseConfig.js — Configuración de Firebase para sincronización en tiempo real
 *
 * Pasos para activar la sincronización entre celulares:
 * 1. Entrá a https://console.firebase.google.com y creá un proyecto gratis.
 * 2. Activá:
 *    - Authentication -> Sign-in method -> Anónimo (habilitar)
 *    - Firestore Database -> Crear base de datos (modo prueba o reglas por código)
 * 3. En Configuración del proyecto -> Tus apps -> Web (</>), copiá tu firebaseConfig
 *    y pegalo acá abajo reemplazando los valores de ejemplo.
 */

export const firebaseConfig = {
  apiKey: 'TU_API_KEY',
  authDomain: 'tu-proyecto.firebaseapp.com',
  projectId: 'tu-proyecto',
  storageBucket: 'tu-proyecto.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:000000000000'
};

/**
 * musicCatalog.js — Catálogo de música precargada por categoría para "Mi Espacio"
 * Colocá tus archivos .mp3 libres de derechos en:
 *  - assets/music/calma/1.mp3 .. 5.mp3
 *  - assets/music/ritmo/1.mp3 .. 5.mp3
 *  - assets/music/noche/1.mp3 .. 5.mp3
 */

export const MUSIC_CATEGORIES = {
  calma: {
    id: 'calma',
    label: '🌊 Calma y Regulación',
    description: 'Piano suave, lluvia y melodías lentas para bajar la sobrecarga.',
    tracks: [
      { id: 'calma-1', title: 'Calma 1 — Piano suave', src: './assets/music/calma/1.mp3' },
      { id: 'calma-2', title: 'Calma 2 — Lluvia tranquila', src: './assets/music/calma/2.mp3' },
      { id: 'calma-3', title: 'Calma 3 — Respiro lento', src: './assets/music/calma/3.mp3' },
      { id: 'calma-4', title: 'Calma 4 — Brisa', src: './assets/music/calma/4.mp3' },
      { id: 'calma-5', title: 'Calma 5 — Silencio cálido', src: './assets/music/calma/5.mp3' }
    ]
  },
  ritmo: {
    id: 'ritmo',
    label: '🎧 Ritmo Suave / Enfoque',
    description: 'Instrumental moderno y chill-hop constante para acompañar el día.',
    tracks: [
      { id: 'ritmo-1', title: 'Ritmo 1 — Lo-fi suave', src: './assets/music/ritmo/1.mp3' },
      { id: 'ritmo-2', title: 'Ritmo 2 — Tarde tranquila', src: './assets/music/ritmo/2.mp3' },
      { id: 'ritmo-3', title: 'Ritmo 3 — Paseo', src: './assets/music/ritmo/3.mp3' },
      { id: 'ritmo-4', title: 'Ritmo 4 — Enfoque', src: './assets/music/ritmo/4.mp3' },
      { id: 'ritmo-5', title: 'Ritmo 5 — Pop instrumental', src: './assets/music/ritmo/5.mp3' }
    ]
  },
  noche: {
    id: 'noche',
    label: '🌙 Descanso y Noche',
    description: 'Ambiental lento y guitarra suave para bajar revoluciones.',
    tracks: [
      { id: 'noche-1', title: 'Noche 1 — Descanso', src: './assets/music/noche/1.mp3' },
      { id: 'noche-2', title: 'Noche 2 — Guitarra suave', src: './assets/music/noche/2.mp3' },
      { id: 'noche-3', title: 'Noche 3 — Estrellas', src: './assets/music/noche/3.mp3' },
      { id: 'noche-4', title: 'Noche 4 — Ambiente cálido', src: './assets/music/noche/4.mp3' },
      { id: 'noche-5', title: 'Noche 5 — Sueño calmo', src: './assets/music/noche/5.mp3' }
    ]
  }
};

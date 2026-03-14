// ─── Alira Design System ───────────────────────────────────────────────────
// Espejo exacto de los CSS vars de la web

export const Colors = {
  bg:      '#0b1220',
  card:    '#111a2e',
  text:    '#e8eefc',
  muted:   '#a9b7d6',
  accent:  '#7aa2ff',
  danger:  '#ff5b6e',
  success: '#22c55e',
  warning: '#f59e0b',
  border:  'rgba(255,255,255,0.08)',
  overlay: 'rgba(0,0,0,0.55)',
};

export const Radius = {
  sm:  10,
  md:  14,
  lg:  18,
  xl:  22,
  full: 999,
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  14,
  lg:  20,
  xl:  32,
};

// Estado → color + label
export const ESTADO_META: Record<string, { color: string; label: string }> = {
  leido:    { color: '#22c55e', label: '✓ Leído' },
  leyendo:  { color: '#7aa2ff', label: '📖 Leyendo' },
  pendiente:{ color: '#f59e0b', label: '⏳ Pendiente' },
};

export const UBICACION_OPTIONS = [
  { value: 'estanteria', label: '🏠 Estantería' },
  { value: 'prestado',   label: '🤝 Prestado' },
  { value: 'digital',    label: '📱 Digital' },
  { value: 'vendido',    label: '💰 Vendido' },
  { value: 'perdido',    label: '🔍 Perdido' },
];

export const ESTADO_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'leyendo',   label: 'Leyendo' },
  { value: 'leido',     label: 'Leído' },
];

export const PRIORIDAD_OPTIONS = [
  { value: 'alta',  label: '🔴 Alta' },
  { value: 'media', label: '🟡 Media' },
  { value: 'baja',  label: '🟢 Baja' },
];

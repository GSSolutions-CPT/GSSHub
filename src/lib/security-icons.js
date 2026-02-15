// Security Industry Icon Library for Site Planner
// Each icon is an inline SVG data URL optimized for canvas rendering

const svgToDataUrl = (svg) => `data:image/svg+xml;base64,${btoa(svg)}`

export const SECURITY_ICONS = [
    {
        id: 'cctv-camera',
        name: 'CCTV Camera',
        category: 'surveillance',
        svg: svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#1e40af" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="32" cy="28" r="14" fill="#dbeafe" stroke="#1e40af"/>
      <circle cx="32" cy="28" r="7" fill="#3b82f6" stroke="#1e40af"/>
      <circle cx="32" cy="28" r="3" fill="#1e40af"/>
      <line x1="32" y1="42" x2="32" y2="52"/>
      <rect x="24" y="52" width="16" height="4" rx="1" fill="#1e40af"/>
      <line x1="32" y1="14" x2="32" y2="8" stroke="#3b82f6" stroke-width="1.5"/>
      <circle cx="32" cy="6" r="2" fill="#ef4444" stroke="none"/>
    </svg>`)
    },
    {
        id: 'motion-sensor',
        name: 'Motion Sensor',
        category: 'detection',
        svg: svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="22" y="18" width="20" height="28" rx="4" fill="#d1fae5" stroke="#059669"/>
      <circle cx="32" cy="28" r="5" fill="#10b981" stroke="#059669"/>
      <rect x="28" y="38" width="8" height="4" rx="1" fill="#059669" stroke="none"/>
      <path d="M16 20 Q10 32 16 44" stroke="#10b981" stroke-width="1.5" fill="none"/>
      <path d="M12 16 Q4 32 12 48" stroke="#10b981" stroke-width="1" fill="none" opacity="0.5"/>
      <path d="M48 20 Q54 32 48 44" stroke="#10b981" stroke-width="1.5" fill="none"/>
      <path d="M52 16 Q60 32 52 48" stroke="#10b981" stroke-width="1" fill="none" opacity="0.5"/>
    </svg>`)
    },
    {
        id: 'keypad',
        name: 'Keypad',
        category: 'access',
        svg: svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="16" y="8" width="32" height="48" rx="4" fill="#ede9fe" stroke="#7c3aed"/>
      <rect x="22" y="14" width="20" height="8" rx="2" fill="#8b5cf6" stroke="none"/>
      <circle cx="26" cy="30" r="2.5" fill="#7c3aed" stroke="none"/>
      <circle cx="32" cy="30" r="2.5" fill="#7c3aed" stroke="none"/>
      <circle cx="38" cy="30" r="2.5" fill="#7c3aed" stroke="none"/>
      <circle cx="26" cy="38" r="2.5" fill="#7c3aed" stroke="none"/>
      <circle cx="32" cy="38" r="2.5" fill="#7c3aed" stroke="none"/>
      <circle cx="38" cy="38" r="2.5" fill="#7c3aed" stroke="none"/>
      <circle cx="26" cy="46" r="2.5" fill="#7c3aed" stroke="none"/>
      <circle cx="32" cy="46" r="2.5" fill="#7c3aed" stroke="none"/>
      <circle cx="38" cy="46" r="2.5" fill="#7c3aed" stroke="none"/>
    </svg>`)
    },
    {
        id: 'siren',
        name: 'Siren',
        category: 'alarm',
        svg: svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 36 L20 24 Q20 12 32 12 Q44 12 44 24 L44 36" fill="#fef2f2" stroke="#dc2626"/>
      <rect x="18" y="36" width="28" height="8" rx="2" fill="#fca5a5" stroke="#dc2626"/>
      <line x1="32" y1="44" x2="32" y2="52"/>
      <rect x="26" y="52" width="12" height="4" rx="1" fill="#dc2626" stroke="none"/>
      <line x1="32" y1="8" x2="32" y2="4" stroke="#ef4444" stroke-width="2"/>
      <line x1="18" y1="14" x2="14" y2="10" stroke="#ef4444" stroke-width="1.5"/>
      <line x1="46" y1="14" x2="50" y2="10" stroke="#ef4444" stroke-width="1.5"/>
      <line x1="12" y1="28" x2="6" y2="28" stroke="#ef4444" stroke-width="1.5"/>
      <line x1="52" y1="28" x2="58" y2="28" stroke="#ef4444" stroke-width="1.5"/>
    </svg>`)
    },
    {
        id: 'electric-fence',
        name: 'Electric Fence',
        category: 'perimeter',
        svg: svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="12" y="16" width="8" height="36" rx="1" fill="#fef3c7" stroke="#d97706"/>
      <rect x="44" y="16" width="8" height="36" rx="1" fill="#fef3c7" stroke="#d97706"/>
      <line x1="20" y1="22" x2="44" y2="22" stroke="#f59e0b" stroke-width="1.5"/>
      <line x1="20" y1="30" x2="44" y2="30" stroke="#f59e0b" stroke-width="1.5"/>
      <line x1="20" y1="38" x2="44" y2="38" stroke="#f59e0b" stroke-width="1.5"/>
      <line x1="20" y1="46" x2="44" y2="46" stroke="#f59e0b" stroke-width="1.5"/>
      <path d="M30 8 L32 14 L28 14 L30 20" stroke="#eab308" stroke-width="2" fill="none"/>
      <path d="M36 8 L38 14 L34 14 L36 20" stroke="#eab308" stroke-width="2" fill="none"/>
    </svg>`)
    },
    {
        id: 'gate-motor',
        name: 'Gate Motor',
        category: 'access',
        svg: svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#475569" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="8" y="24" width="24" height="20" rx="3" fill="#f1f5f9" stroke="#475569"/>
      <circle cx="20" cy="34" r="6" fill="#94a3b8" stroke="#475569"/>
      <circle cx="20" cy="34" r="2" fill="#475569"/>
      <line x1="32" y1="30" x2="56" y2="30" stroke="#64748b" stroke-width="3"/>
      <line x1="32" y1="38" x2="56" y2="38" stroke="#64748b" stroke-width="3"/>
      <line x1="38" y1="26" x2="38" y2="42" stroke="#94a3b8" stroke-width="1.5"/>
      <line x1="44" y1="26" x2="44" y2="42" stroke="#94a3b8" stroke-width="1.5"/>
      <line x1="50" y1="26" x2="50" y2="42" stroke="#94a3b8" stroke-width="1.5"/>
      <path d="M16 24 L16 18 L24 18 L24 24" stroke="#475569" stroke-width="1.5" fill="none"/>
    </svg>`)
    }
]

export const getIconById = (id) => SECURITY_ICONS.find(icon => icon.id === id)
export const getIconsByCategory = (category) => SECURITY_ICONS.filter(icon => icon.category === category)

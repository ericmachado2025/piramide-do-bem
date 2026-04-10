export interface AvatarCharacter {
  name: string
  archetype: string | null
  tier: number
  communityColor?: string | null
}

const ARCH = {
  HERO:      { bg: '#E1F5EE', stroke: '#0F6E56', text: '#0F6E56' },
  ANTI_HERO: { bg: '#FAECE7', stroke: '#993C1D', text: '#993C1D' },
  VILLAIN:   { bg: '#EEEDFE', stroke: '#534AB7', text: '#534AB7' },
  NEUTRAL:   { bg: '#F1EFE8', stroke: '#5F5E5A', text: '#5F5E5A' },
}

const TIER_BADGE = ['', '#B4B2A9', '#85B7EB', '#3B6D11', '#888', '#B8860B']

function getArch(archetype: string | null) {
  return ARCH[(archetype as keyof typeof ARCH)] ?? ARCH.NEUTRAL
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).join('').substring(0, 2).toUpperCase()
}

function starPath(cx: number, cy: number, r1: number, r2: number, points: number): string {
  const step = Math.PI / points
  let d = ''
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? r1 : r2
    const a = i * step - Math.PI / 2
    const x = (cx + r * Math.cos(a)).toFixed(2)
    const y = (cy + r * Math.sin(a)).toFixed(2)
    d += (i === 0 ? 'M' : 'L') + x + ' ' + y
  }
  return d + 'Z'
}

function shapeInner(tier: number, ac: typeof ARCH.HERO, ini: string): string {
  const fs = ini.length > 1 ? 16 : 20
  const ty = ini.length > 1 ? 55 : 57
  const font = '-apple-system,BlinkMacSystemFont,sans-serif'

  if (tier === 1) {
    return `
      <circle cx="50" cy="50" r="38" fill="${ac.bg}" stroke="${ac.stroke}" stroke-width="3"/>
      <text x="50" y="${ty}" text-anchor="middle" font-family="${font}" font-weight="700" font-size="${fs}" fill="${ac.text}">${ini}</text>`
  }
  if (tier === 2) {
    return `
      <rect x="10" y="10" width="80" height="80" rx="10" fill="${ac.bg}" stroke="${ac.stroke}" stroke-width="3"/>
      <text x="50" y="${ty}" text-anchor="middle" font-family="${font}" font-weight="700" font-size="${fs}" fill="${ac.text}">${ini}</text>`
  }
  if (tier === 3) {
    return `
      <polygon points="50,8 92,84 8,84" fill="${ac.bg}" stroke="${ac.stroke}" stroke-width="3"/>
      <text x="50" y="66" text-anchor="middle" font-family="${font}" font-weight="700" font-size="${Math.min(fs, 15)}" fill="${ac.text}">${ini}</text>`
  }
  if (tier === 4) {
    const d = starPath(50, 50, 42, 18, 4)
    return `
      <path d="${d}" fill="#C0C0C0" stroke="#888" stroke-width="2.5"/>
      <path d="${d}" fill="${ac.bg}" opacity="0.5"/>
      <text x="50" y="${ty}" text-anchor="middle" font-family="${font}" font-weight="700" font-size="${Math.min(fs, 15)}" fill="${ac.text}">${ini}</text>`
  }
  const d = starPath(50, 50, 44, 18, 5)
  return `
    <path d="${d}" fill="#FFD700" stroke="#B8860B" stroke-width="2.5"/>
    <path d="${d}" fill="${ac.bg}" opacity="0.45"/>
    <text x="50" y="${ty}" text-anchor="middle" font-family="${font}" font-weight="700" font-size="${Math.min(fs, 15)}" fill="${ac.text}">${ini}</text>`
}

export function generateCharacterAvatar(char: AvatarCharacter, size = 80): string {
  const tier = Math.max(1, Math.min(5, char.tier || 1))
  const ac = getArch(char.archetype)
  const ini = initials(char.name || '?')
  const inner = shapeInner(tier, ac, ini)
  const badgeColor = TIER_BADGE[tier]
  const commColor = char.communityColor || '#888780'
  const commLetter = (char.name || '?').charAt(0).toUpperCase()

  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    ${inner}
    <circle cx="76" cy="76" r="12" fill="${badgeColor}"/>
    <text x="76" y="80.5" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-weight="700" font-size="10" fill="white">${tier}</text>
    <circle cx="76" cy="24" r="10" fill="${commColor}" opacity="0.9"/>
    <text x="76" y="28.2" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-weight="700" font-size="9" fill="white">${commLetter}</text>
  </svg>`
}

export function avatarToDataUrl(svgString: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svgString)}`
}

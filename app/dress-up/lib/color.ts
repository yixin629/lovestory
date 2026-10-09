function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((character) => character + character)
          .join('')
      : clean

  return {
    r: parseInt(full.substring(0, 2), 16),
    g: parseInt(full.substring(2, 4), 16),
    b: parseInt(full.substring(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

export function lighten(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex)
  const nextRed = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)))
  const nextGreen = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)))
  const nextBlue = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)))

  return rgbToHex(nextRed, nextGreen, nextBlue)
}

export function darken(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex)
  const nextRed = Math.max(0, Math.floor(r * (1 - percent / 100)))
  const nextGreen = Math.max(0, Math.floor(g * (1 - percent / 100)))
  const nextBlue = Math.max(0, Math.floor(b * (1 - percent / 100)))

  return rgbToHex(nextRed, nextGreen, nextBlue)
}

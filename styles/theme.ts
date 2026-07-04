export type Theme = "light" | "dark"

export type ThemeTokens = {
  background: string
  panel: string
  text: string
  accent: string
  accentText: string
  muted: string
  border: string
  borderStrong: string
}

const light: ThemeTokens = {
  background: "#f5f0eb",
  panel: "#faf7f4",
  text: "#2c2420",
  accent: "#c0392b",
  accentText: "#faf7f4",
  muted: "#8c7b6b",
  border: "#e8ddd0",
  borderStrong: "#c8b8a2",
}

const dark: ThemeTokens = {
  background: "#1a1512",
  panel: "#241d19",
  text: "#f5f0eb",
  accent: "#d9544a",
  accentText: "#f5f0eb",
  muted: "#a89484",
  border: "#2a2119",
  borderStrong: "#3d322b",
}

export const themes: Record<Theme, ThemeTokens> = { light, dark }
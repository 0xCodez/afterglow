import type { ThemeBackdropGlass, ThemeColors } from 'claude-code'

import { makeColors } from './make-colors.js'
import { GALLERY } from './scenes/gallery.js'
import type { GalleryTheme } from './scenes/gallery.js'

/** What `makeColors` takes. */
type Palette = Parameters<typeof makeColors>[0]

/**
 * One look of the catalog: the words the list shows, the colors the interface is repainted with,
 * the glass its panels are frosted with, and the scene drawn behind the chat.
 * The looks themselves live in `scenes/gallery.js`, exported from the Afterglow gallery.
 */
export type Theme = {
  /** What the person types: lower case, digits and dashes. */
  id: string
  title: string
  /** One line for the list, and what a screen reader says of the scene. */
  blurb: string
  /** The kind of window the look is made for. */
  window: 'dark' | 'light'
  palette: Palette
  glass: ThemeBackdropGlass
  scene: () => string
}

/** A gallery palette in the shape `makeColors` reads: one mode, the one the scene is made for. */
/** Relative luminance of a six-digit hex color, for ordering surfaces. */
function luminance(hex: string): number {
  const v = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255

    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function paletteOf(g: GalleryTheme): Palette {
  const p = g.palette
  // Desktop wants surface-0 (the page) as the darkest surface and each later one as light or lighter,
  // in both modes, and in light mode surface-2 and surface-3 the same. The gallery lists light
  // surfaces from lightest to darkest, so order them by luminance here.
  const [s0, s1, s2, s3] = [p.s0, p.s1, p.s2, p.s3].sort((a, b) => luminance(a) - luminance(b)) as [string, string, string, string]
  const anchors = {
    'surface-0': s0,
    'surface-1': s1,
    'surface-2': g.window === 'light' ? s3 : s2,
    'surface-3': s3,
    'text-primary': p.text,
    'text-secondary': p.text2,
    'text-muted': p.muted,
  }
  const mode = { gray: { anchors } }

  return {
    label: g.title,
    id: g.id,
    only: g.window,
    roles: { accent: p.accent, danger: p.danger, success: p.success, warning: p.warning },
    ...(g.window === 'dark' ? { dark: mode } : { light: mode }),
  }
}

export const THEMES: readonly Theme[] = GALLERY.map(g => ({
  id: g.id,
  title: g.title,
  blurb: g.blurb,
  window: g.window,
  palette: paletteOf(g),
  glass: { blur: g.glass.blur, tint: g.glass.tint, opacity: g.glass.opacity },
  scene: g.scene,
}))

/** A community theme as the Afterglow site serves it at /api/themes/<id>. */
export type RemoteTheme = {
  id: string
  title: string
  blurb: string
  window: 'dark' | 'light'
  palette: GalleryTheme['palette']
  glass: { blur: number; tint: string; opacity: number }
  scene: string
  author?: string
  updatedAt?: string
}

/** Community themes this session has loaded, from the store or the network. */
const REMOTE = new Map<string, Theme>()

/** Why a downloaded theme can't be used, or nothing. The app also refuses unsafe scenes on its own. */
export function remoteProblem(r: unknown): string | undefined {
  const t = r as Partial<RemoteTheme> | null
  if (!t || typeof t !== 'object') return 'not a theme'
  if (typeof t.id !== 'string' || !/^[a-z0-9-]{3,40}$/.test(t.id)) return 'bad id'
  if (typeof t.title !== 'string' || typeof t.blurb !== 'string') return 'missing title or description'
  if (t.window !== 'dark' && t.window !== 'light') return 'bad window kind'
  if (typeof t.scene !== 'string' || t.scene.length > 131072 || !/^<svg[\s>]/i.test(t.scene.trim())) return 'bad scene'
  if (/<script|<foreignObject|\son[a-z]+\s*=|javascript:/i.test(t.scene)) return 'unsafe scene'
  const hex = /^#[0-9a-fA-F]{6}$/
  const p = t.palette as Record<string, unknown> | undefined
  if (!p || !['s0', 's1', 's2', 's3', 'text', 'text2', 'muted', 'accent', 'danger', 'success', 'warning'].every(k => typeof p[k] === 'string' && hex.test(p[k] as string))) return 'bad palette'
  const g = t.glass
  if (!g || typeof g.blur !== 'number' || typeof g.opacity !== 'number' || typeof g.tint !== 'string' || !hex.test(g.tint)) return 'bad glass'
  return undefined
}

export function addRemote(r: RemoteTheme): Theme {
  const theme: Theme = {
    id: r.id,
    title: r.title,
    blurb: r.blurb,
    window: r.window,
    palette: paletteOf(r as unknown as GalleryTheme),
    glass: { blur: Math.max(0, Math.min(64, r.glass.blur)), tint: r.glass.tint, opacity: Math.max(0, Math.min(1, r.glass.opacity)) },
    scene: () => r.scene,
  }
  REMOTE.set(r.id, theme)
  scenes.delete(r.id)
  palettes.delete(r.id)

  return theme
}

export function isBuiltin(id: string): boolean {
  return THEMES.some(theme => theme.id === id)
}

export function themeOf(id: string | undefined): Theme | undefined {
  return THEMES.find(theme => theme.id === id) ?? (id === undefined ? undefined : REMOTE.get(id))
}

/** Finds a look by what a person typed: its id or its title, in any case, spaces or dashes. */
export function themeNamed(typed: string): Theme | undefined {
  const slug = typed.trim().toLowerCase().replace(/[\s_]+/g, '-')

  return THEMES.find(theme => theme.id === slug || theme.title.toLowerCase().replace(/[\s_,]+/g, '-') === slug)
}

const scenes = new Map<string, string>()
const palettes = new Map<string, { theme: ThemeColors; problems: string[] }>()

/** A look's scene, built the first time it is asked for: a session pays only for the looks it shows. */
export function sceneOf(theme: Theme): string {
  let ready = scenes.get(theme.id)

  if (ready === undefined) {
    ready = theme.scene()
    scenes.set(theme.id, ready)
  }

  return ready
}

/** A look's whole palette and what `makeColors` found wrong with it, built once. */
export function colorsOf(theme: Theme): { theme: ThemeColors; problems: string[] } {
  let ready = palettes.get(theme.id)

  if (ready === undefined) {
    ready = makeColors(theme.palette)
    palettes.set(theme.id, ready)
  }

  return ready
}

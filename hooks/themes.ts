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
function paletteOf(g: GalleryTheme): Palette {
  const p = g.palette
  const anchors = {
    'surface-0': p.s0,
    'surface-1': p.s1,
    'surface-2': p.s2,
    // In light mode surface-2 and surface-3 must match.
    'surface-3': g.window === 'light' ? p.s2 : p.s3,
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

export function themeOf(id: string | undefined): Theme | undefined {
  return THEMES.find(theme => theme.id === id)
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

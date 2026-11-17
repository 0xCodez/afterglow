/** One theme as the Afterglow gallery defines it. */
export type GalleryTheme = {
  id: string
  title: string
  blurb: string
  window: 'dark' | 'light'
  mascot?: boolean
  tags?: string[]
  palette: {
    s0: string
    s1: string
    s2: string
    s3: string
    text: string
    text2: string
    muted: string
    accent: string
    danger: string
    success: string
    warning: string
  }
  glass: { blur: number; tint: string; opacity: number }
  /** The matching terminal palette. The terminal draws no look, so the mod does not apply it. */
  cli: Record<string, string>
  /** Builds the scene: one SVG string animated by its own CSS. */
  scene: () => string
}

export declare const GALLERY: readonly GalleryTheme[]

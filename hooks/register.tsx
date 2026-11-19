import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { THEMES, addRemote, colorsOf, isBuiltin, remoteProblem, sceneOf, themeNamed, themeOf } from './themes'
import type { RemoteTheme, Theme } from './themes'

const PLUGIN = 'afterglow'
const COMMAND = 'afterglow'
/** Where the chosen look's id is kept across sessions. */
const CHOICE = 'choice'

/**
 * The Afterglow site: its live catalog of community themes. Empty means community themes are off and only
 * the built-in looks are offered; nothing is fetched.
 */
const SITE = 'https://afterglow-site-ashy.vercel.app'
const CATALOG = 'catalog'
/** Community themes kept for offline use, newest last; the store holds at most this many. */
const KEPT = 'kept'
const KEEP = 6
const CATALOG_TTL = 60 * 60 * 1000

type Entry = { id: string; title: string; blurb: string; window: 'dark' | 'light'; author?: string; builtin?: boolean }
type Catalog = { at: number; themes: Entry[] }

/** Sets a look whole: colors, scene and glass in one call. Resolves why nothing draws it, or nothing. */
async function show($: EngineInterface, theme: Theme): Promise<string | undefined> {
  const look: ThemeSetArgs = {
    colors: colorsOf(theme).theme,
    backdrop: { scene: theme.id, glass: theme.glass },
    overrideColorScheme: theme.window,
  }
  const set = await $.theme.set(look)

  return set.isDrawn ? undefined : set.reason
}

/** The community catalog: from the store while fresh, else from the site. Never throws. */
async function catalog($: EngineInterface, fresh = false): Promise<Entry[]> {
  if (!SITE) return []
  const cached = (await $.store.get(CATALOG)) as Catalog | undefined
  if (!fresh && cached && Date.now() - cached.at < CATALOG_TTL) return cached.themes
  try {
    const res = await $.http.fetch(`${SITE}/api/catalog`)
    if (!res.ok) return cached?.themes ?? []
    const data = JSON.parse(res.text) as { themes?: Entry[] }
    const themes = (data.themes ?? []).filter(t => typeof t.id === 'string' && !isBuiltin(t.id)).slice(0, 500)
    await $.store.set(CATALOG, { at: Date.now(), themes } satisfies Catalog)

    return themes
  } catch {
    return cached?.themes ?? []
  }
}

/** A community theme by id: from this session, the store, or the site (then kept). */
async function community($: EngineInterface, id: string): Promise<Theme | string> {
  const known = themeOf(id)
  if (known) return known
  const stored = (await $.store.get(`theme:${id}`)) as RemoteTheme | undefined
  if (stored && !remoteProblem(stored)) return addRemote(stored)
  if (!SITE) return `No theme named "${id}".`
  try {
    const res = await $.http.fetch(`${SITE}/api/themes/${encodeURIComponent(id)}`)
    if (res.status === 404) return `No theme named "${id}". /${COMMAND} list names them.`
    if (!res.ok) return `The theme site answered ${res.status}. Try again in a moment.`
    const r = JSON.parse(res.text) as RemoteTheme
    const problem = remoteProblem(r)
    if (problem) return `"${id}" could not be used: ${problem}.`
    await keep($, r)

    return addRemote(r)
  } catch (error) {
    return `Could not reach the theme site: ${String(error)}`
  }
}

/** Keeps a downloaded theme in the store for offline use, dropping the oldest beyond KEEP. */
async function keep($: EngineInterface, r: RemoteTheme) {
  const kept = (((await $.store.get(KEPT)) as string[] | undefined) ?? []).filter(x => x !== r.id)
  kept.push(r.id)
  while (kept.length > KEEP) {
    const old = kept.shift()!
    await $.store.delete(`theme:${old}`)
  }
  await $.store.set(`theme:${r.id}`, r)
  await $.store.set(KEPT, kept)
}

async function list($: EngineInterface): Promise<string> {
  const of = (window: Theme['window']): string =>
    THEMES.filter(theme => theme.window === window)
      .map(theme => `  ${theme.id}: ${theme.title}. ${theme.blurb}`)
      .join('\n')
  const dark = of('dark')
  const light = of('light')
  const shared = await catalog($)
  const sharedText = shared.map(t => `  ${t.id}: ${t.title} (${t.window}${t.author ? `, by ${t.author}` : ''}). ${t.blurb}`).join('\n')

  return [
    `Afterglow themes (${THEMES.length} built in${SITE ? `, ${shared.length} from the community` : ''}):`,
    dark && `For dark windows:\n${dark}`,
    light && `For light windows:\n${light}`,
    sharedText && `From the community:\n${sharedText}`,
    `Apply one with /${COMMAND} <name>. /${COMMAND} random picks one, /${COMMAND} off clears it.`,
    SITE ? `Browse and make your own at ${SITE}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

async function pick($: EngineInterface, theme: Theme): Promise<string> {
  const unshown = await show($, theme)
  await $.store.set(CHOICE, theme.id)
  const made = `Made for ${theme.window} windows.`

  return unshown === undefined
    ? `${theme.title} applied. ${made}`
    : `${theme.title} saved. ${made} Nothing draws it here yet: ${unshown}`
}

async function run($: EngineInterface, typed: string): Promise<string> {
  const word = typed.trim()
  const lower = word.toLowerCase()

  if (word === '' || lower === 'list') {
    return list($)
  }

  if (lower === 'off') {
    await $.store.delete(CHOICE)
    await $.theme.clear()

    return 'Theme cleared.'
  }

  if (lower === 'refresh') {
    const shared = await catalog($, true)

    return SITE ? `Community catalog refreshed: ${shared.length} themes.` : 'Community themes are off in this build.'
  }

  if (lower === 'random') {
    const now = await $.store.get(CHOICE)
    const pool = [...THEMES.map(t => t.id), ...(await catalog($)).map(t => t.id)].filter(id => id !== now)
    const id = pool[Math.floor(Math.random() * pool.length)] ?? THEMES[0]!.id
    const theme = themeOf(id) ?? (await community($, id))

    return typeof theme === 'string' ? theme : pick($, theme)
  }

  const builtin = themeNamed(word)
  if (builtin) return pick($, builtin)
  const slug = lower.replace(/[\s_]+/g, '-')
  const theme = await community($, slug)

  return typeof theme === 'string' ? theme : pick($, theme)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // Neither step may cost the session its start: a refused name or a look that cannot be set is said and passed.
    try {
      await $.command.register({
        name: COMMAND,
        description: 'Afterglow themes: lists the looks; with a name it applies one, "random" picks one, "off" clears.',
        argumentHint: '[name | list | random | refresh | off]',
      })
      const chosen = await $.store.get(CHOICE)
      if (typeof chosen === 'string') {
        // A community choice comes back from the store, so a session starts its look without the network.
        const theme = themeOf(chosen) ?? (await community($, chosen))
        if (typeof theme !== 'string') await show($, theme)
      }
    } catch (error) {
      void $.ui.toast(`${PLUGIN}: ${String(error)}`)
    }

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    try {
      return { text: await run($, e.args) }
    } catch (error) {
      return { text: `${PLUGIN}: ${String(error)}` }
    }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    // Another plugin's backdrop is its own to draw.
    if (e.props.plugin !== PLUGIN || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const theme = themeOf(e.props.scene)

    if (theme === undefined) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={sceneOf(theme)} alt={theme.blurb} isInteractive />
  })
}

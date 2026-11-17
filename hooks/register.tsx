import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { THEMES, colorsOf, sceneOf, themeNamed, themeOf } from './themes'
import type { Theme } from './themes'

const PLUGIN = 'afterglow'
const COMMAND = 'afterglow'
/** Where the chosen look's id is kept across sessions. */
const CHOICE = 'choice'

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

function list(): string {
  const of = (window: Theme['window']): string =>
    THEMES.filter(theme => theme.window === window)
      .map(theme => `  ${theme.id}: ${theme.title}. ${theme.blurb}`)
      .join('\n')
  const dark = of('dark')
  const light = of('light')

  return [
    `Afterglow themes (${THEMES.length}):`,
    dark && `For dark windows:\n${dark}`,
    light && `For light windows:\n${light}`,
    `Apply one with /${COMMAND} <name>. /${COMMAND} random picks one, /${COMMAND} off clears it.`,
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

  if (word === '' || word.toLowerCase() === 'list') {
    return list()
  }

  if (word.toLowerCase() === 'off') {
    await $.store.delete(CHOICE)
    await $.theme.clear()

    return 'Theme cleared.'
  }

  if (word.toLowerCase() === 'random') {
    const now = await $.store.get(CHOICE)
    const others = THEMES.filter(theme => theme.id !== now)
    const pool = others.length > 0 ? others : THEMES

    return pick($, pool[Math.floor(Math.random() * pool.length)]!)
  }

  const theme = themeNamed(word)

  return theme === undefined ? `No theme named "${word}". /${COMMAND} list names them.` : pick($, theme)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // Neither step may cost the session its start: a refused name or a look that cannot be set is said and passed.
    try {
      await $.command.register({
        name: COMMAND,
        description: 'Afterglow themes: lists the looks; with a name it applies one, "random" picks one, "off" clears.',
        argumentHint: '[name | list | random | off]',
      })
      const chosen = await $.store.get(CHOICE)
      const theme = typeof chosen === 'string' ? themeOf(chosen) : undefined

      if (theme !== undefined) {
        await show($, theme)
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

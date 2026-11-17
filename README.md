# Afterglow

Living backdrops for Claude Code on desktop. Each Afterglow theme repaints the whole app, frosts its
panels like glass and plays a hand-built animated scene behind the chat. Every scene is a single SVG
animated by its own CSS: no scripts, nothing loaded from the network, and it rests in a composed still
picture when your system asks for reduced motion.

This is an early preview with four themes:

- **Spec Sheet** (`spec-sheet`, dark): a cyanotype blueprint where a watercolour ticket stub swings on a
  visibly underdamped spring, with live engineering notes and dimension lines around it.
- **Voice Aurora** (`voice-aurora`, dark): a listening glow pools under dark glass at the foot of the
  window, breathing in silk and prism light, with a prismatic comet running along the glass rim.
- **Glyph Reef** (`glyph-reef`, dark): a black reef where a leopard shark, a hammerhead and a manta, all set
  in flickering glyph tiles, lap the edges of the window; an orange critter made of type peeks out of its
  diving bubble.
- **Cypress Hill** (`cypress-hill`, light): a naturalist's gouache plate on gridded drafting paper: one
  windy hill of painted grass, one cypress, cloud shadows crossing, and a tiny critter that walks the ridge,
  naps under the tree and waves.

More themes from the Afterglow gallery will follow.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install afterglow --marketplace 0xCodez/afterglow
```

Answer `y` to add the marketplace, then pick a scope (user scope makes it available in every session).

From a shell:

```
claude plugin install afterglow --marketplace 0xCodez/afterglow
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**,
**Add marketplace** with `0xCodez/afterglow`, then **Add plugin**.

## Use

- `/afterglow` or `/afterglow list` lists the themes.
- `/afterglow <name>` applies one, for example `/afterglow glyph-reef`. Your choice is remembered across sessions.
- `/afterglow random` picks one at random.
- `/afterglow off` clears the theme.

Themes draw in the Claude Code desktop and mobile apps. The terminal and editors draw no backdrop, so
the command only saves your choice there.

## License

MIT, see LICENSE.

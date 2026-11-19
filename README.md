# Afterglow

Living backdrops for Claude Code on desktop. Each Afterglow theme repaints the whole app, frosts its
panels like glass and plays a hand-built animated scene behind the chat. Every scene is a single SVG
animated by its own CSS: no scripts, and it rests in a composed still picture when your system asks for
reduced motion.

Browse every theme live, try them on and make your own at **https://afterglow-site-ashy.vercel.app**.

## Themes

25 built in, and more from the community as they are approved on the site:

ascii-atlas · cypress-hill · sticker-bomb · paper-trail · spec-sheet · sticker-notebook · puppet-strings ·
green-light · heat-map · record-shop · offline-hill · glyph-reef · prism-foil · cloud-nine · repo-town ·
sketch-kit · rubber-hose · pocket-arcade · gilded-pear · delft-harbor · departures · dithered-coast ·
secret-files · tool-tray · voice-aurora

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

- `/afterglow` or `/afterglow list` lists every theme, community ones included.
- `/afterglow <name>` applies one, for example `/afterglow cloud-nine`. Your choice is remembered.
- `/afterglow random` picks one at random.
- `/afterglow refresh` reloads the community catalog.
- `/afterglow off` clears the theme.

Themes draw in the Claude Code desktop and mobile apps. The terminal and editors draw no backdrop, so
the command only saves your choice there.

## Network and storage

Built-in themes need no network. For community themes the mod fetches the public catalog
(`/api/catalog`, at most once an hour) and a theme you apply (`/api/themes/<name>`) from the Afterglow site,
through Claude Code's own network. It sends nothing about you. It keeps your chosen theme's name, the
catalog and up to six community themes you applied, so they work offline.

## Update

```
claude plugin marketplace update afterglow
claude plugin update afterglow@afterglow
```

## License

MIT, see LICENSE.

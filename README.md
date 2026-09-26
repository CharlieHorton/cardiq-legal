# CardIQ website: landing page, privacy, terms and support

Public pages for the CardIQ iPhone app, served with GitHub Pages at https://playcardiq.com/ (the `CNAME` file). The old https://charliehorton.github.io/cardiq-legal/ URLs redirect there.

| Page | URL | Used for |
| --- | --- | --- |
| `index.html` | https://playcardiq.com/ | App Store marketing URL; the link at the end of every shared result |
| `privacy.md` | https://playcardiq.com/privacy | App Store privacy policy URL; the in-app Profile → About link |
| `terms.md` | https://playcardiq.com/terms | In-app Profile → About link |
| `support.md` | https://playcardiq.com/support | App Store support URL; the in-app Profile → About link |
| `.well-known/apple-app-site-association` | https://playcardiq.com/.well-known/apple-app-site-association | Universal links: `/c/*` challenge links open in the app. Must be served over HTTPS with no redirect |

`privacy.md` must match the App Privacy answers in the app repo (`docs/app-store/app-privacy.md`). Update both whenever the app changes what it collects.

## How the site is built

- `_layouts/base.html` is the page shell, with the meta tags, link preview and icons in `_includes/head.html`. `_layouts/default.html` wraps the Markdown pages in the shared header and footer.
- `assets/site.css` holds every style, in the app's "Trading Floor" look (tokens from `src/constants/theme.ts` in the app repo).
- The landing page's playable demo, Daily countdown and score chart are in `assets/home.js`. Its scoring, price nudges and Daily numbering copy the app's `src/engine/scoring.ts`, `src/lib/price-entry.ts` and `src/engine/dates.ts`, so change them together.
- `assets/img/` holds the app screens (cropped from the App Store screenshots), the link preview image `og.jpg` and the icons.

## Market data

The ticker, demo cards and stats come from `_data/showcase.json`, which `scripts/showcase.mjs` builds from the app's public card pool:

```sh
node scripts/showcase.mjs
```

`.github/workflows/showcase.yml` runs it every night at 04:30 UTC, an hour after the app's ingest, and commits any change. Like the app's ticker, it only uses cards above the £1,000 game price cap. No Classic, Daily or pack challenge deals those cards, so the site can't give an answer away.

## At launch

Set `app_store_id: 6816035368` in `_config.yml`. Every "Coming soon to iPhone" button becomes the App Store badge, and Safari shows its Smart App Banner.

## Preview locally

```sh
docker run --rm -v "$PWD":/site -p 4000:4000 ruby:3.3 sh -c "gem install github-pages webrick --no-document && jekyll serve --source /site --destination /tmp/site --host 0.0.0.0"
```

Then open http://localhost:4000.

CardIQ is not affiliated with, endorsed or sponsored by Nintendo, The Pokémon Company, Creatures or GAME FREAK.

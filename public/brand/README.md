# Drive Finance brand assets

Drop the official Drive Finance logo here so it appears across the app
(login, password-reset pages, and every portal sidebar).

## Required file

- `drive-logo.svg` — the full Drive Finance logo / wordmark (preferred, scales crisply)

If you only have a raster file, save it as `drive-logo.png` instead and change
`LOGO_SRC` in `components/shared/BrandLogo.tsx` to `/brand/drive-logo.png`.

### Recommendations
- Use the **white/light** version of the logo — the app is a dark theme (`#0f0f0f`).
- Transparent background.
- Roughly 4:1 to 5:1 aspect ratio works best in the sidebar (height is ~26px).

Until a `drive-logo.svg` exists, the app shows a clean indigo "drive finance"
wordmark fallback automatically — nothing breaks.

## Brand palette in use
- Primary indigo: `#5757e6`  (hover `#4444cc`, light `#7d7dee`)
- Secondary (Direct Sales): teal `#14B8A6`
- Surfaces: `#0f0f0f` base, `#161616` cards, `#1c1c22` panels
- Favicon: `favicon.svg` (indigo "d" mark — replace with the real icon if desired)

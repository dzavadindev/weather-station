# Weather station dashboard

React + TypeScript dashboard for the sensor readings API.

## Run locally

Start the backend from `backend/` with `uv run fastapi dev` (port 8000), then from `frontend/`:

```sh
yarn install
yarn dev
```

Vite proxies `/api` requests to the backend. Run `yarn test` for Vitest + React Testing Library interaction tests, and `yarn build` and `yarn lint` for production and lint checks.

## Code organization

- `src/consts.ts` defines reading types, metrics, time ranges, plot dimensions, and sensor color theme references.
- `src/api.ts` fetches sensor readings by period, last-24-hour sensor summaries, and registered sensor descriptions; `src/useReadings.ts` manages loading, errors, cancellation, and period changes. No query library is needed for these requests yet.
- `src/components/` contains the overview, section headings, chart and its tabs/legend, and selected readings. The chart keeps its SVG renderer to support the existing draggable and keyboard-accessible date marker without introducing a plotting dependency.
- `src/index.scss` defines the theme with CSS custom properties; `src/styles/` groups dashboard SCSS by section. Edit colors there rather than in components.

The overview has a single-choice sensor selector above its cards, showing the selected sensor's average temperature and humidity over the rolling last 24 hours and its latest battery level (or an empty state if it has no recent readings). This selection is independent of the chart's legend. The graph can show a day, week, month, or all available history. Click or drag the chart to select a reading; arrow keys, Home, and End also move the selection when the chart is focused. Both sensors start selected. Select either, both, or neither in the legend to focus their lines and control the readings below the chart; with neither selected, both lines are dimmed and no per-sensor readings are shown.

The dashboard groups readings by their `uuid` and uses descriptions from `GET /api/sensor/` for sensor names. The backend calculates rolling 24-hour, 7-day, and 30-day windows for `period=day|week|month`; `period=all` returns all history. A production deployment must route `/api` to the backend as well; Vite's proxy is development-only.

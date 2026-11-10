# Weather station dashboard

React + TypeScript dashboard for the sensor readings API.

## Run locally

Start the backend from `backend/` with `uv run fastapi dev` (port 8000), then from `frontend/`:

```sh
yarn install
yarn dev
```

Vite proxies `/api` requests to the backend. Run `yarn build` and `yarn lint` to check the frontend.

## Code organization

- `src/consts.ts` defines reading types, metrics, time ranges, plot dimensions, and sensor color theme references.
- `src/api.ts` fetches sensor readings by period and registered sensor descriptions; `src/useReadings.ts` manages loading, errors, cancellation, and period changes. No query library is needed for these requests yet.
- `src/components/` contains the overview, section headings, chart and its tabs/legend, and selected readings. The chart keeps its SVG renderer to support the existing draggable and keyboard-accessible date marker without introducing a plotting dependency.
- `src/index.scss` defines the theme with CSS custom properties; `src/styles/` groups dashboard SCSS by section. Edit colors there rather than in components.

The overview displays the most recent reading from the last 24 hours. The graph can show a day, week, month, or all available history. Click or drag the chart to select a reading; arrow keys, Home, and End also move the selection when the chart is focused. Select sensor circles in the legend to focus their lines and show their readings below the chart.

The dashboard groups readings by their `uuid` and uses descriptions from `GET /api/sensor/` for sensor names. The backend calculates rolling 24-hour, 7-day, and 30-day windows for `period=day|week|month`; `period=all` returns all history. The overview shows the most recent reading across all sensors in the last 24 hours. A production deployment must route `/api` to the backend as well; Vite's proxy is development-only.

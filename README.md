# Weather Station

**Active work in progress.** Weather Station is a project for growing plants indoors and outdoors. It collects temperature and humidity data from [UNNI sensors](https://unni.store/products/wireless-weather-stations-0585) to help make better plant-care decisions over time.

## Run locally

You'll need [uv](https://docs.astral.sh/uv/), Python 3.14 or newer, Node.js, and Yarn.

**Backend**

```sh
cd backend
uv run fastapi dev
```

The API runs at http://localhost:8000, with interactive docs at http://localhost:8000/docs. Its SQLite database is created at `backend/data/sensor_data.sqlite3` on first use. To populate demo readings, run `uv run python -m backend.seed` from `backend/`.

**Frontend**

```sh
cd frontend
yarn install
yarn dev
```

Vite serves the dashboard at http://localhost:5173. During development, it proxies `/api` requests to the backend on port 8000, so keep both running.

## Checks

From `backend/`:

```sh
uv run python -m unittest discover -s tests
```

From `frontend/`:

```sh
yarn lint
yarn build
```

## In progress

These are planned or under development, **not shipped yet**:

- ESP32 integration to intercept and collect sensor signals
- A CI pipeline
- GCP cloud deployment and continuous delivery (CD)
- AI integration for personalized plant-care advice based on historical data

See the [backend README](backend/README.md) and [frontend README](frontend/README.md) for more detail.

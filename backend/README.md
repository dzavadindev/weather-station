# Weather station backend

FastAPI service backed by a local SQLite file (no separate database server required).

## Run

From `backend/`:

```sh
uv run fastapi dev
```

By default, data is stored in `backend/data/sensor_data.sqlite3`. Set `DATABASE_PATH` to use another SQLite file; the database and table are created on first use.

## API

- `POST /api/sensor-data` accepts a JSON **array** of `{ "humidity": 0.55, "temperature": 21.4, "battery": 0.9, "timestamp": 1730000000000 }` readings. Humidity and battery must be finite numbers between 0 and 1; temperature must be a finite number; timestamp must be a nonnegative integer Unix UTC timestamp in milliseconds. Returns HTTP 201 and `{"inserted": N}`. Invalid input returns HTTP 422.
- `GET /api/sensor-data?from=1730000000000&to=1730000060000` returns readings in ascending timestamp order. `from` is required and `to` is optional; both bounds are inclusive. Missing `from` or an inverted range returns HTTP 400. Invalid timestamps return HTTP 422.

## Seed mock data

```sh
uv run python -m backend.seed
```

Inserts 48 readings, one minute apart, ending at the current UTC minute. Running it again adds another 48 readings.

## Tests

```sh
uv run python -m unittest discover -s tests
```

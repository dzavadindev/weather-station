# Weather station backend

FastAPI service backed by a local SQLite file (no separate database server required).

## Run

From `backend/`:

```sh
uv run fastapi dev
```

By default, data is stored in `backend/data/sensor_data.sqlite3`. Set `DATABASE_PATH` to use another SQLite file; the database and tables are created on first use. Schema migrations are not supported during development: delete the old SQLite file (including any `-wal` and `-shm` files) while the backend is stopped before starting with a changed schema.

## API

- `POST /api/sensor/register` accepts `{ "uuid": "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa", "description": "Outside" }`. `description` is optional; when omitted, it becomes `Sensor N`, where N is the current number of registered sensors plus one. Returns HTTP 201 with `{ "uuid", "description" }`; duplicate UUIDs return HTTP 409.
- `GET /api/sensor/` returns all registered sensors as `{ "uuid", "description" }` objects.
- `POST /api/sensor/data` accepts a JSON **array** of `{ "uuid": "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa", "humidity": 0.55, "temperature": 21.4, "battery": 0.9, "timestamp": 1730000000000 }` readings. Every UUID must already be registered, or the whole batch is rejected with HTTP 400. Humidity and battery must be finite numbers between 0 and 1; temperature must be a finite number; timestamp must be a nonnegative integer Unix UTC timestamp in milliseconds. Returns HTTP 201 and `{"inserted": N}`. Invalid input returns HTTP 422.
- `GET /api/sensor/data/today` returns one summary per sensor with readings in the rolling last 24 hours: `{ "uuid", "average_humidity", "average_temperature", "battery", "latest_timestamp" }`. Humidity and temperature are arithmetic means of all readings for that sensor in the window; battery and `latest_timestamp` come from its most recent reading (ties at the same timestamp use the most recently inserted reading). The window includes its start and the current server time, excluding future readings. Sensors without recent readings are omitted. Despite the endpoint name, this is not a local calendar-day summary.
- `GET /api/sensor/data?period=week&device=aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa` returns readings in ascending timestamp order. `period` accepts `day` (rolling 24 hours), `week` (rolling 7 days), `month` (rolling 30 days), or `all` (no time bound). Rolling windows start inclusively and include readings through the current server time; future readings are excluded. Repeat `device` to select multiple sensor UUIDs; omit it for all devices. Alternatively, optional `from` (inclusive) and `to` (exclusive) select an explicit range using nonnegative Unix UTC milliseconds. Either bound can be omitted, and equal bounds return no readings. `period` cannot be combined with `from` or `to` (even for `all`); omit all time parameters to return all readings. Invalid parameters or `from > to` return HTTP 422.

## Seed mock data

```sh
uv run python -m backend.seed
```

Registers stable `Bathroom` and `Balcony` UUIDs (if not already present) and inserts 48 readings per sensor, 30 minutes apart, ending at the current UTC minute. Bathroom stays near 23–25 °C and 45–50% humidity; Balcony warms from roughly 4–5 °C toward 9–10 °C and cools again, with 30–45% humidity. Small deterministic variations keep the curves realistic. Rerunning the seed adds another 96 readings; it does not delete existing data, including sensors from an earlier seed version. For exactly these two sensors, start with a fresh database.

## Tests

```sh
uv run python -m unittest discover -s tests
```

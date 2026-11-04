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
- `GET /api/sensor/data?filter=aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa&filter=bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb&date=1730000000000` returns readings in ascending timestamp order. Repeat the optional `filter` query parameter to select multiple sensor UUIDs; omit it for all sensors. Optional `date` selects the UTC calendar day containing that Unix-millisecond timestamp (midnight inclusive to next midnight exclusive); omit it for all dates. With no query parameters, all readings are returned. Invalid parameters return HTTP 422.

## Seed mock data

```sh
uv run python -m backend.seed
```

Registers a stable `Demo sensor` UUID (if not already present) and inserts 48 readings for it, one minute apart, ending at the current UTC minute. Running it again adds another 48 readings.

## Tests

```sh
uv run python -m unittest discover -s tests
```

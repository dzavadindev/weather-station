"""Populate the SQLite database with 48 one-minute-apart sensor readings."""

import random
from datetime import UTC, datetime

from backend.database import connect


def main() -> None:
    minute_ms = 60_000
    last_timestamp = int(datetime.now(UTC).timestamp() * 1000) // minute_ms * minute_ms
    rng = random.Random(42)
    records = [
        (
            round(rng.uniform(0.35, 0.75), 3),
            round(rng.uniform(17.0, 26.0), 2),
            round(0.95 - index * 0.002, 3),
            last_timestamp - (47 - index) * minute_ms,
        )
        for index in range(48)
    ]
    with connect() as connection:
        connection.executemany(
            "INSERT INTO sensor_data (humidity, temperature, battery, timestamp) VALUES (?, ?, ?, ?)",
            records,
        )
    print(f"Inserted {len(records)} sensor readings ending at {last_timestamp} (UTC milliseconds).")


if __name__ == "__main__":
    main()

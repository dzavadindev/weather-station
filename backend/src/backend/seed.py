"""Populate the SQLite database with 24 hours of half-hourly demo readings."""

import math
import random
from datetime import UTC, datetime
from uuid import NAMESPACE_URL, uuid5

from backend.database import connect


def main() -> None:
    interval_ms = 30 * 60_000
    sample_count = 48
    last_timestamp = int(datetime.now(UTC).timestamp() * 1000) // 60_000 * 60_000
    rng = random.Random(42)
    bathroom_uuid = str(uuid5(NAMESPACE_URL, "weather-station/bathroom"))
    balcony_uuid = str(uuid5(NAMESPACE_URL, "weather-station/balcony"))
    records = []
    for index in range(sample_count):
        progress = index / (sample_count - 1)
        rise = 1 - abs(2 * progress - 1)
        timestamp = last_timestamp - (sample_count - 1 - index) * interval_ms
        records.extend([
            (
                bathroom_uuid,
                round(0.475 + 0.014 * math.sin(math.tau * progress) + rng.uniform(-0.004, 0.004), 3),
                round(24 + 0.35 * math.sin(math.tau * progress) + rng.uniform(-0.12, 0.12), 2),
                round(0.93 + rng.uniform(-0.005, 0.005), 3),
                timestamp,
            ),
            (
                balcony_uuid,
                round(0.42 - 0.10 * rise + rng.uniform(-0.01, 0.01), 3),
                round(4.5 + 5 * rise + rng.uniform(-0.25, 0.25), 2),
                round(0.85 + rng.uniform(-0.005, 0.005), 3),
                timestamp,
            ),
        ])
    with connect() as connection:
        connection.executemany(
            "INSERT OR IGNORE INTO sensors (uuid, description) VALUES (?, ?)",
            [(bathroom_uuid, "Bathroom"), (balcony_uuid, "Balcony")],
        )
        connection.executemany(
            "INSERT INTO sensor_data (uuid, humidity, temperature, battery, timestamp) "
            "VALUES (?, ?, ?, ?, ?)",
            records,
        )
    print(f"Inserted {len(records)} readings for Bathroom and Balcony ending at {last_timestamp} (UTC milliseconds).")


if __name__ == "__main__":
    main()

import os
import sqlite3
import tempfile
import unittest
from contextlib import closing
from datetime import UTC, datetime
from itertools import pairwise
from pathlib import Path
from uuid import UUID
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.main import app
from backend.seed import main as seed_database


class SensorDataTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.database_path = Path(self.directory.name) / "sensor.sqlite3"
        database_env = patch.dict(os.environ, {"DATABASE_PATH": str(self.database_path)})
        database_env.start()
        self.addCleanup(database_env.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def test_register_and_list_sensors(self):
        first = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"
        second = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb"
        self.assertEqual(
            self.client.post("/api/sensor/register", json={"uuid": first}).json(),
            {"uuid": first, "description": "Sensor 1"},
        )
        self.assertEqual(
            self.client.post("/api/sensor/register", json={"uuid": second, "description": "Outside"}).json(),
            {"uuid": second, "description": "Outside"},
        )
        self.assertEqual(
            self.client.get("/api/sensor/").json(),
            [{"uuid": first, "description": "Sensor 1"}, {"uuid": second, "description": "Outside"}],
        )
        self.assertEqual(self.client.post("/api/sensor/register", json={"uuid": first}).status_code, 409)
        self.assertEqual(self.client.post("/api/sensor/register", json={"uuid": "invalid"}).status_code, 422)
        third = "cccccccc-cccc-4ccc-accc-cccccccccccc"
        self.assertEqual(
            self.client.post("/api/sensor/register", json={"uuid": third}).json()["description"],
            "Sensor 3",
        )

    def test_post_and_get_filtered_by_sensor_and_utc_day(self):
        first = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"
        second = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb"
        for uuid in (first, second):
            self.client.post("/api/sensor/register", json={"uuid": uuid})
        midnight = int(datetime(2025, 1, 2, tzinfo=UTC).timestamp() * 1000)
        records = [
            {"uuid": first, "humidity": 0.4, "temperature": -3.5, "battery": 1.0, "timestamp": midnight},
            {"uuid": second, "humidity": 0.5, "temperature": 20.0, "battery": 0.0, "timestamp": midnight + 1000},
            {"uuid": first, "humidity": 0.6, "temperature": 25.0, "battery": 0.8, "timestamp": midnight + 86_400_000},
        ]
        response = self.client.post("/api/sensor/data", json=records)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json(), {"inserted": 3})
        self.assertEqual(self.client.get("/api/sensor/data").json(), records)
        self.assertEqual(
            self.client.get("/api/sensor/data", params={"filter": first, "date": midnight + 5000}).json(),
            records[:1],
        )
        self.assertEqual(
            self.client.get("/api/sensor/data", params=[("filter", first), ("filter", second), ("date", midnight)]).json(),
            records[:2],
        )
        self.assertEqual(self.client.get("/api/sensor/data", params={"filter": second}).json(), records[1:2])
        self.assertEqual(self.client.get("/api/sensor/data", params={"date": midnight}).json(), records[:2])
        self.assertEqual(self.client.get("/api/sensor/data?date=bad").status_code, 422)
        self.assertEqual(self.client.get("/api/sensor/data?filter=bad").status_code, 422)

    def test_unregistered_sensor_and_invalid_batch_are_not_written(self):
        uuid = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"
        other = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb"
        valid = {"uuid": uuid, "humidity": 0.5, "temperature": 21.0, "battery": 0.9, "timestamp": 1000}
        self.assertEqual(self.client.post("/api/sensor/data", json=[valid]).status_code, 400)
        self.client.post("/api/sensor/register", json={"uuid": uuid})
        self.assertEqual(self.client.post("/api/sensor/data", json=[valid, {**valid, "uuid": other}]).status_code, 400)
        for invalid in (
            {**valid, "humidity": 1.1},
            {**valid, "battery": -0.1},
            {**valid, "temperature": "21.0"},
            {**valid, "timestamp": 1.5},
            {**valid, "timestamp": -1},
            {**valid, "humidity": "0.5"},
            {key: value for key, value in valid.items() if key != "uuid"},
        ):
            self.assertEqual(self.client.post("/api/sensor/data", json=[valid, invalid]).status_code, 422)
        self.assertEqual(self.client.get("/api/sensor/data").json(), [])

    def test_seed_produces_one_minute_intervals(self):
        seed_database()
        with closing(sqlite3.connect(self.database_path)) as connection:
            rows = connection.execute("SELECT timestamp FROM sensor_data ORDER BY timestamp").fetchall()
        self.assertEqual(len(rows), 48)
        self.assertTrue(all(right[0] - left[0] == 60_000 for left, right in pairwise(rows)))
        self.assertEqual(len(self.client.get("/api/sensor/data").json()), 48)
        self.assertEqual(len(self.client.get("/api/sensor/").json()), 1)
        self.assertIsInstance(UUID(self.client.get("/api/sensor/").json()[0]["uuid"]), UUID)



if __name__ == "__main__":
    unittest.main()

import os
import sqlite3
import tempfile
import unittest
from itertools import pairwise
from pathlib import Path
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

    def test_post_and_get_inclusive_range(self):
        records = [
            {"humidity": 0.4, "temperature": -3.5, "battery": 1.0, "timestamp": 60_000},
            {"humidity": 0.5, "temperature": 20.0, "battery": 0.0, "timestamp": 120_000},
            {"humidity": 0.6, "temperature": 25.0, "battery": 0.8, "timestamp": 180_000},
        ]
        self.assertEqual(self.client.post("/api/sensor-data", json=records).status_code, 201)
        response = self.client.get("/api/sensor-data", params={"from": 60_000, "to": 120_000})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), records[:2])
        self.assertEqual(
            self.client.get("/api/sensor-data", params={"from": 120_000}).json(), records[1:]
        )

    def test_missing_or_inverted_range(self):
        response = self.client.get("/api/sensor-data")
        self.assertEqual(response.status_code, 400)
        self.assertIn("from", response.json()["detail"])
        self.assertEqual(self.client.get("/api/sensor-data?to=100").status_code, 400)
        self.assertEqual(self.client.get("/api/sensor-data?from=200&to=100").status_code, 400)
        self.assertEqual(self.client.get("/api/sensor-data?from=bad").status_code, 422)

    def test_invalid_batch_is_not_written(self):
        valid = {"humidity": 0.5, "temperature": 21.0, "battery": 0.9, "timestamp": 1000}
        for invalid in (
            {**valid, "humidity": 1.1},
            {**valid, "battery": -0.1},
            {**valid, "temperature": "21.0"},
            {**valid, "timestamp": 1.5},
            {**valid, "timestamp": -1},
            {**valid, "humidity": "0.5"},
        ):
            self.assertEqual(self.client.post("/api/sensor-data", json=[valid, invalid]).status_code, 422)
        self.assertEqual(self.client.get("/api/sensor-data?from=0").json(), [])

    def test_seed_produces_one_minute_intervals(self):
        seed_database()
        with sqlite3.connect(self.database_path) as connection:
            rows = connection.execute("SELECT timestamp FROM sensor_data ORDER BY timestamp").fetchall()
        self.assertEqual(len(rows), 48)
        self.assertTrue(all(right[0] - left[0] == 60_000 for left, right in pairwise(rows)))
        self.assertEqual(len(self.client.get("/api/sensor-data?from=0").json()), 48)


if __name__ == "__main__":
    unittest.main()

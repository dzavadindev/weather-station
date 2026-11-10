import os
import tempfile
import unittest
from datetime import UTC, datetime
from itertools import pairwise
from pathlib import Path
from unittest.mock import patch
from uuid import UUID

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

    def test_post_and_get_filtered_by_device(self):
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
        self.assertEqual(self.client.get("/api/sensor/data", params={"device": first}).json(), records[::2])
        self.assertEqual(
            self.client.get("/api/sensor/data", params=[("device", first), ("device", second)]).json(),
            records,
        )
        self.assertEqual(self.client.get("/api/sensor/data", params={"device": second}).json(), records[1:2])
        self.assertEqual(self.client.get("/api/sensor/data?device=bad").status_code, 422)

    def test_get_filtered_by_time_range(self):
        first = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"
        second = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb"
        for uuid in (first, second):
            self.client.post("/api/sensor/register", json={"uuid": uuid})
        midnight = int(datetime(2025, 1, 2, tzinfo=UTC).timestamp() * 1000)
        records = [
            {"uuid": first, "humidity": 0.4, "temperature": 20.0, "battery": 0.9, "timestamp": 0},
            {"uuid": first, "humidity": 0.5, "temperature": 21.0, "battery": 0.8, "timestamp": midnight},
            {"uuid": second, "humidity": 0.6, "temperature": 22.0, "battery": 0.7, "timestamp": midnight + 1},
            {"uuid": first, "humidity": 0.7, "temperature": 23.0, "battery": 0.6, "timestamp": midnight + 86_400_000},
        ]
        self.assertEqual(self.client.post("/api/sensor/data", json=records).status_code, 201)
        self.assertEqual(self.client.get("/api/sensor/data", params={"from": midnight}).json(), records[1:])
        self.assertEqual(self.client.get("/api/sensor/data", params={"to": midnight + 1}).json(), records[:2])
        self.assertEqual(
            self.client.get("/api/sensor/data", params={"from": midnight, "to": midnight + 1}).json(),
            records[1:2],
        )
        self.assertEqual(self.client.get("/api/sensor/data", params={"from": 0, "to": 0}).json(), [])
        self.assertEqual(
            self.client.get("/api/sensor/data", params={"device": first,
                                                        "from": midnight + 1, "to": midnight + 86_400_001}).json(),
            records[3:],
        )
        self.assertEqual(
            self.client.get("/api/sensor/data", params={"device": second,
                                                        "from": midnight, "to": midnight + 2}).json(),
            records[2:3],
        )
        for params in ({"from": -1}, {"to": -1}, {"from": "bad"}, {"to": "bad"},
                       {"from": midnight + 1, "to": midnight}):
            self.assertEqual(self.client.get("/api/sensor/data", params=params).status_code, 422)

    def test_get_filtered_by_period(self):
        first = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"
        second = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb"
        for uuid in (first, second):
            self.client.post("/api/sensor/register", json={"uuid": uuid})
        now = int(datetime(2025, 2, 2, tzinfo=UTC).timestamp() * 1000)
        day = 86_400_000
        records = [
            {"uuid": uuid, "humidity": 0.5, "temperature": 21.0, "battery": 0.9, "timestamp": timestamp}
            for uuid, timestamp in (
                (first, now - 30 * day - 1),
                (first, now - 30 * day),
                (second, now - 7 * day),
                (first, now - day),
                (second, now),
                (first, now + 1),
            )
        ]
        self.assertEqual(self.client.post("/api/sensor/data", json=records).status_code, 201)
        with patch("backend.main.time_ns", return_value=now * 1_000_000):
            self.assertEqual(self.client.get("/api/sensor/data", params={"period": "day"}).json(), records[3:5])
            self.assertEqual(self.client.get("/api/sensor/data", params={"period": "week"}).json(), records[2:5])
            self.assertEqual(self.client.get("/api/sensor/data", params={"period": "month"}).json(), records[1:5])
            self.assertEqual(self.client.get("/api/sensor/data", params={"period": "all"}).json(), records)
            self.assertEqual(self.client.get("/api/sensor/data").json(), records)
            self.assertEqual(
                self.client.get("/api/sensor/data", params={"device": second, "period": "week"}).json(),
                [records[2], records[4]],
            )
        for params in ({"period": "year"}, {"period": ""}, {"period": "day", "from": 0},
                       {"period": "all", "to": now}):
            self.assertEqual(self.client.get("/api/sensor/data", params=params).status_code, 422)

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

    def test_seed_produces_two_realistic_sources(self):
        seed_database()
        sensors = self.client.get("/api/sensor/").json()
        self.assertEqual({sensor["description"] for sensor in sensors}, {"Bathroom", "Balcony"})
        self.assertEqual(len({sensor["uuid"] for sensor in sensors}), 2)
        for sensor in sensors:
            self.assertIsInstance(UUID(sensor["uuid"]), UUID)

        readings = self.client.get("/api/sensor/data", params={"period": "day"}).json()
        self.assertEqual(len(readings), 96)
        for sensor in sensors:
            source = [reading for reading in readings if reading["uuid"] == sensor["uuid"]]
            self.assertEqual(len(source), 48)
            self.assertTrue(all(right["timestamp"] - left["timestamp"] == 30 * 60_000
                                for left, right in pairwise(source)))
            temperatures = [reading["temperature"] for reading in source]
            humidities = [reading["humidity"] for reading in source]
            batteries = [reading["battery"] for reading in source]
            if sensor["description"] == "Bathroom":
                self.assertTrue(all(23 <= value <= 25 for value in temperatures))
                self.assertTrue(all(0.45 <= value <= 0.50 for value in humidities))
                self.assertLess(max(temperatures) - min(temperatures), 1)
            else:
                self.assertTrue(all(4 <= value <= 10 for value in temperatures))
                self.assertTrue(all(0.30 <= value <= 0.45 for value in humidities))
                self.assertLess(temperatures[0], temperatures[23])
                self.assertGreater(temperatures[23], temperatures[-1])
            self.assertTrue(all(0 <= value <= 1 for value in batteries))
            self.assertEqual(
                self.client.get("/api/sensor/data", params={"period": "day", "device": sensor["uuid"]}).json(),
                source,
            )



if __name__ == "__main__":
    unittest.main()

import os
import sqlite3
from collections.abc import Generator
from contextlib import closing, contextmanager
from pathlib import Path

DEFAULT_DATABASE_PATH = Path(__file__).resolve().parents[2] / "data" / "sensor_data.sqlite3"


@contextmanager
def connect() -> Generator[sqlite3.Connection]:
    path = Path(os.environ.get("DATABASE_PATH", DEFAULT_DATABASE_PATH))
    path.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(path, timeout=10)) as connection:
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        with connection:
            connection.execute("""
                CREATE TABLE IF NOT EXISTS sensors (
                    uuid TEXT PRIMARY KEY,
                    description TEXT NOT NULl
                )
            """)
            connection.execute("""
                CREATE TABLE IF NOT EXISTS sensor_data (
                    id INTEGER PRIMARY KEY,
                    uuid TEXT NOT NULL REFERENCES sensors(uuid),
                    humidity REAL NOT NULL,
                    temperature REAL NOT NULL,
                    battery REAL NOT NULL,
                    timestamp INTEGER NOT NULL
                )
            """)
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON sensor_data (timestamp)"
            )
            yield connection

import sqlite3
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from backend.database import connect

app = FastAPI()


class SensorRegistration(BaseModel):
    uuid: UUID
    description: str | None = None


class Sensor(BaseModel):
    uuid: UUID
    description: str


class SensorData(BaseModel):
    uuid: UUID
    humidity: float = Field(strict=True, ge=0, le=1, allow_inf_nan=False)
    temperature: float = Field(strict=True, allow_inf_nan=False)
    battery: float = Field(strict=True, ge=0, le=1, allow_inf_nan=False)
    timestamp: int = Field(strict=True, ge=0)



@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/sensor/register", status_code=201, response_model=Sensor)
def register_sensor(sensor: SensorRegistration):
    with connect() as connection:
        connection.execute("BEGIN IMMEDIATE")
        if connection.execute("SELECT 1 FROM sensors WHERE uuid = ?", (str(sensor.uuid),)).fetchone():
            raise HTTPException(status_code=409, detail="Sensor UUID is already registered.")
        description = sensor.description
        if description is None:
            count = connection.execute("SELECT COUNT(*) FROM sensors").fetchone()[0]
            description = f"Sensor {count + 1}"
        connection.execute(
            "INSERT INTO sensors (uuid, description) VALUES (?, ?)",
            (str(sensor.uuid), description),
        )
    return {"uuid": sensor.uuid, "description": description}


@app.get("/api/sensor/", response_model=list[Sensor])
def list_sensors():
    with connect() as connection:
        rows = connection.execute("SELECT uuid, description FROM sensors ORDER BY rowid").fetchall()
    return [dict(row) for row in rows]


@app.post("/api/sensor/data", status_code=201)
def create_sensor_data(records: list[SensorData]):
    with connect() as connection:
        uuids = {str(record.uuid) for record in records}
        if uuids:
            placeholders = ", ".join("?" for _ in uuids)
            registered = {
                row["uuid"] for row in connection.execute(
                    f"SELECT uuid FROM sensors WHERE uuid IN ({placeholders})", tuple(uuids)
                )
            }
            if uuids - registered:
                raise HTTPException(status_code=400, detail="All sensor UUIDs must be registered.")
        try:
            connection.executemany(
                "INSERT INTO sensor_data (uuid, humidity, temperature, battery, timestamp) "
                "VALUES (?, ?, ?, ?, ?)",
                [(str(record.uuid), record.humidity, record.temperature, record.battery, record.timestamp)
                 for record in records],
            )
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=400, detail="All sensor UUIDs must be registered.") from exc
    return {"inserted": len(records)}


@app.get("/api/sensor/data", response_model=list[SensorData])
def get_sensor_data(
    filter: Annotated[list[UUID] | None, Query()] = None,
    date: Annotated[int | None, Query(ge=0)] = None,
):
    conditions = []
    parameters = []
    if filter is not None:
        uuids = [str(uuid) for uuid in filter]
        conditions.append(f"uuid IN ({', '.join('?' for _ in uuids)})")
        parameters.extend(uuids)
    if date is not None:
        try:
            day = datetime.fromtimestamp(date / 1000, UTC).date()
            start = datetime.combine(day, datetime.min.time(), UTC)
            end = start + timedelta(days=1)
        except (OverflowError, ValueError) as exc:
            raise HTTPException(status_code=422, detail="Invalid UTC date timestamp.") from exc
        conditions.append("timestamp >= ? AND timestamp < ?")
        parameters.extend((int(start.timestamp() * 1000), int(end.timestamp() * 1000)))

    query = "SELECT uuid, humidity, temperature, battery, timestamp FROM sensor_data"
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY timestamp, id"
    with connect() as connection:
        rows = connection.execute(query, parameters).fetchall()
    return [dict(row) for row in rows]

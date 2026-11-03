from typing import Annotated

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from backend.database import connect

app = FastAPI()


class SensorData(BaseModel):
    humidity: float = Field(strict=True, ge=0, le=1, allow_inf_nan=False)
    temperature: float = Field(strict=True, allow_inf_nan=False)
    battery: float = Field(strict=True, ge=0, le=1, allow_inf_nan=False)
    timestamp: int = Field(strict=True, ge=0)


@app.get("/")
def root():
    return {"message": "Hello from FastAPI!"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/sensor-data", status_code=201)
def create_sensor_data(records: list[SensorData]):
    with connect() as connection:
        connection.executemany(
            "INSERT INTO sensor_data (humidity, temperature, battery, timestamp) VALUES (?, ?, ?, ?)",
            [(record.humidity, record.temperature, record.battery, record.timestamp) for record in records],
        )
    return {"inserted": len(records)}


@app.get("/api/sensor-data", response_model=list[SensorData])
def get_sensor_data(
    from_timestamp: Annotated[int | None, Query(alias="from", ge=0)] = None,
    to_timestamp: Annotated[int | None, Query(alias="to", ge=0)] = None,
):
    if from_timestamp is None:
        raise HTTPException(status_code=400, detail="A time range is required (at least 'from').")
    if to_timestamp is not None and to_timestamp < from_timestamp:
        raise HTTPException(status_code=400, detail="'to' must be greater than or equal to 'from'.")

    with connect() as connection:
        if to_timestamp is None:
            rows = connection.execute(
                "SELECT humidity, temperature, battery, timestamp FROM sensor_data "
                "WHERE timestamp >= ? ORDER BY timestamp, id",
                (from_timestamp,),
            ).fetchall()
        else:
            rows = connection.execute(
                "SELECT humidity, temperature, battery, timestamp FROM sensor_data "
                "WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp, id",
                (from_timestamp, to_timestamp),
            ).fetchall()
    return [dict(row) for row in rows]

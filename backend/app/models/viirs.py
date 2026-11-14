import uuid
from datetime import date, datetime
from typing import Optional, Dict, Any
from sqlalchemy import (
    String,
    Numeric,
    Date,
    DateTime,
    CheckConstraint,
    PrimaryKeyConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry

from app.models.base import Base, utc_now


class RawViirsHotspot(Base):
    __tablename__ = "raw_viirs_hotspots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, nullable=False
    )
    acq_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    latitude: Mapped[float] = mapped_column(Numeric(8, 5), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(8, 5), nullable=False)
    bright_ti4: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    bright_ti5: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    scan: Mapped[float] = mapped_column(Numeric(4, 2), nullable=False, default=0.375)
    track: Mapped[float] = mapped_column(Numeric(4, 2), nullable=False, default=0.375)

    acq_time: Mapped[str] = mapped_column(String(4), nullable=False)
    acq_datetime: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    satellite: Mapped[str] = mapped_column(String(20), nullable=False)  # SNPP, NOAA20, NOAA21
    instrument: Mapped[str] = mapped_column(String(10), nullable=False, default="VIIRS")
    confidence: Mapped[str] = mapped_column(String(10), nullable=False)  # low, nominal, high
    version: Mapped[Optional[str]] = mapped_column(String(10), default="2.0N")
    frp: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    daynight: Mapped[str] = mapped_column(String(1), nullable=False)  # D, N

    # Spatial geometries
    geom: Mapped[Any] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=True
    )
    pixel_geom: Mapped[Any] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326), nullable=True
    )

    # Hierarchical H3 spatial index resolutions
    h3_r7: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    h3_r8: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    h3_r9: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)

    raw_properties: Mapped[Dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default="{}"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    __table_args__ = (
        PrimaryKeyConstraint("id", "acq_date"),
        CheckConstraint("confidence IN ('low', 'nominal', 'high')", name="chk_viirs_confidence"),
        {"postgresql_partition_by": "RANGE (acq_date)"},
    )

    def __repr__(self) -> str:
        return f"<RawViirsHotspot id={self.id} date={self.acq_date} sat={self.satellite} conf={self.confidence}>"

import uuid
from datetime import datetime, date
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    String,
    Numeric,
    Integer,
    DateTime,
    Date,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from geoalchemy2 import Geometry

from app.models.base import Base, utc_now


class HarmonizedFireEvent(Base):
    __tablename__ = "harmonized_fire_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_code: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_hours: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)

    modis_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    viirs_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_pixels: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    total_frp: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0.0)
    mean_frp: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.0)
    max_frp: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.0)
    hfii: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False, default=0.0)  # Harmonized Fire Intensity Index
    estimated_area_ha: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), default=0.0)

    dominant_sensor: Mapped[str] = mapped_column(String(10), default="VIIRS")  # MODIS, VIIRS
    cluster_algorithm: Mapped[str] = mapped_column(String(20), default="stdbscan")  # stdbscan, h3, manual
    eps_spatial_m: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), default=750.0)
    eps_temporal_hours: Mapped[Optional[float]] = mapped_column(Numeric(4, 2), default=4.0)
    confidence_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), default=85.00)

    # Spatial geometries
    convex_hull: Mapped[Any] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326), nullable=True
    )
    centroid: Mapped[Any] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=True
    )

    h3_indices: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), default=list)

    region_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regions.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(50), default="confirmed")
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(
        "metadata", JSONB, default=dict, server_default="{}"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    sources: Mapped[List["EventSourceHotspot"]] = relationship(
        "EventSourceHotspot", back_populates="event", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<HarmonizedFireEvent id={self.id} code='{self.event_code}' hfii={self.hfii}>"


class EventSourceHotspot(Base):
    __tablename__ = "event_source_hotspots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("harmonized_fire_events.id", ondelete="CASCADE"), nullable=False
    )
    hotspot_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    hotspot_acq_date: Mapped[date] = mapped_column(Date, nullable=False)
    sensor_type: Mapped[str] = mapped_column(String(10), nullable=False)  # MODIS, VIIRS
    contribution_weight: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), default=1.0)
    distance_to_centroid_m: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    event: Mapped[HarmonizedFireEvent] = relationship("HarmonizedFireEvent", back_populates="sources")

    __table_args__ = (
        UniqueConstraint("event_id", "hotspot_id", "sensor_type", name="idx_event_source_unique"),
    )

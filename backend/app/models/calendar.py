import uuid
from datetime import date, datetime
from typing import Optional, Dict, Any
from sqlalchemy import (
    String,
    Numeric,
    Integer,
    SmallInteger,
    Date,
    DateTime,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    PrimaryKeyConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry

from app.models.base import Base, utc_now


class BurningCalendarDaily(Base):
    __tablename__ = "burning_calendar_daily"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    region_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    calendar_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    year: Mapped[int] = mapped_column(SmallInteger, nullable=False, index=True)
    month: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    day_of_year: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    raw_modis_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    raw_viirs_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    harmonized_event_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    total_burned_area_est_ha: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), default=0.0)
    mean_hfii: Mapped[Optional[float]] = mapped_column(Numeric(10, 3), default=0.0)
    max_hfii: Mapped[Optional[float]] = mapped_column(Numeric(10, 3), default=0.0)
    fire_regime_classification: Mapped[str] = mapped_column(String(50), default="Normal")
    anomaly_index: Mapped[Optional[float]] = mapped_column(Numeric(8, 3), default=0.0)

    metadata_json: Mapped[Dict[str, Any]] = mapped_column(
        "metadata", JSONB, default=dict, server_default="{}"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    __table_args__ = (
        UniqueConstraint("region_id", "calendar_date", name="uq_region_calendar_date"),
        CheckConstraint("month BETWEEN 1 AND 12", name="chk_calendar_month"),
        CheckConstraint("day_of_year BETWEEN 1 AND 366", name="chk_calendar_doy"),
    )

    def __repr__(self) -> str:
        return f"<BurningCalendarDaily region={self.region_id} date={self.calendar_date} events={self.harmonized_event_count}>"


class H3DailyCells(Base):
    __tablename__ = "h3_daily_cells"

    h3_index: Mapped[str] = mapped_column(String(15), primary_key=True)
    cell_date: Mapped[date] = mapped_column(Date, primary_key=True)
    resolution: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    modis_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    viirs_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_hotspots: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    total_frp_modis: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), default=0.0)
    total_frp_viirs: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), default=0.0)
    hfii_mean: Mapped[Optional[float]] = mapped_column(Numeric(10, 3), default=0.0)
    hfii_max: Mapped[Optional[float]] = mapped_column(Numeric(10, 3), default=0.0)

    geom: Mapped[Any] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    __table_args__ = (
        PrimaryKeyConstraint("h3_index", "cell_date"),
        CheckConstraint("resolution BETWEEN 0 AND 15", name="chk_h3_res"),
    )

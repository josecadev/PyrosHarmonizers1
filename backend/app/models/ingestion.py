import uuid
from datetime import date, datetime
from typing import Optional, Dict, Any
from sqlalchemy import String, Integer, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models.base import Base, utc_now


class IngestionLog(Base):
    __tablename__ = "ingestion_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_url_or_file: Mapped[str] = mapped_column(Text, nullable=False)
    sensor: Mapped[str] = mapped_column(String(10), nullable=False)  # MODIS, VIIRS
    satellite: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Terra, Aqua, SNPP, NOAA20, NOAA21

    batch_date_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    batch_date_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    end_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    records_processed: Mapped[int] = mapped_column(Integer, default=0)
    records_inserted: Mapped[int] = mapped_column(Integer, default=0)
    records_duplicated: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )  # pending, running, completed, failed
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    execution_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default="{}"
    )

    def __repr__(self) -> str:
        return f"<IngestionLog id={self.id} sensor='{self.sensor}' status='{self.status}' inserted={self.records_inserted}>"

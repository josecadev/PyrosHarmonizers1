import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry

from app.models.base import Base, utc_now


class Region(Base):
    __tablename__ = "regions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # department, municipality, protected_area, ecoregion
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regions.id", ondelete="SET NULL"), nullable=True
    )
    department_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    area_km2: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)

    # GeoSpatial fields
    geometry: Mapped[Any] = mapped_column(
        Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=True
    )
    centroid: Mapped[Any] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=True
    )

    properties: Mapped[Dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default="{}"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    # Relationships
    parent: Mapped[Optional["Region"]] = relationship(
        "Region", remote_side=[id], backref="children"
    )

    def __repr__(self) -> str:
        return f"<Region id={self.id} name='{self.name}' type='{self.type}'>"

import uuid
from datetime import datetime, timezone
from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

# Shared metadata with default schema 'pyrosharmonizer'
metadata_obj = MetaData(schema="pyrosharmonizer")


class Base(DeclarativeBase):
    metadata = metadata_obj


def utc_now() -> datetime:
    return datetime.now(timezone.utc)

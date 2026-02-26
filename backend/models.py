from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db import Base

class Repository(Base):
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    github_repo_id = Column(Integer, unique=True, index=True, nullable=False)
    full_name = Column(String(255), unique=True, index=True, nullable=False)  # owner/repo
    html_url = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    language = Column(String(100), nullable=True)
    stargazers_count = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    fetched_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    readme = relationship("Readme", back_populates="repo", uselist=False, cascade="all, delete-orphan")


class Readme(Base):
    __tablename__ = "readmes"

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), unique=True, nullable=False)
    content = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    fetched_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    repo = relationship("Repository", back_populates="readme")

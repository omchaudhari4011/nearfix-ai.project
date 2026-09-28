import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # 'customer', 'technician', 'admin'
    phone = Column(String(30), nullable=True)

    # Relationships
    technician_profile = relationship("Technician", back_populates="user", uselist=False)
    complaints = relationship("Complaint", back_populates="customer", foreign_keys="Complaint.customer_id")


class Technician(Base):
    __tablename__ = "technicians"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    specialization = Column(String(100), nullable=False, default="AC")  # e.g., 'AC', 'Fridge', 'TV', 'All-Rounder'
    latitude = Column(Float, nullable=False, default=12.9716)   # default coordinates (e.g. Bangalore center)
    longitude = Column(Float, nullable=False, default=77.5946)
    is_available = Column(Boolean, nullable=False, default=True)

    # Relationships
    user = relationship("User", back_populates="technician_profile")
    assigned_complaints = relationship("Complaint", back_populates="assigned_technician", foreign_keys="Complaint.assigned_technician_id")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)  # e.g. cooling_issue, gas_leak, noise_issue, power_issue, remote_issue, water_leakage, installation
    appliance_type = Column(String(50), nullable=False, default="AC")  # e.g. AC, Fridge, TV

    # Relationships
    price_item = relationship("PriceList", back_populates="category", uselist=False, cascade="all, delete-orphan")


class PriceList(Base):
    __tablename__ = "price_list"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, unique=True)
    min_price = Column(Float, nullable=False)
    max_price = Column(Float, nullable=False)

    # Relationships
    category = relationship("Category", back_populates="price_item")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    complaint_text = Column(Text, nullable=False)
    predicted_category = Column(String(100), nullable=False)
    price_estimate = Column(String(100), nullable=False)  # e.g. "₹500 - ₹900" or "$30 - $55"
    assigned_technician_id = Column(Integer, ForeignKey("technicians.id"), nullable=True)
    status = Column(String(50), nullable=False, default="Pending")  # 'Pending', 'Assigned', 'In Progress', 'Resolved'
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    customer = relationship("User", back_populates="complaints", foreign_keys=[customer_id])
    assigned_technician = relationship("Technician", back_populates="assigned_complaints", foreign_keys=[assigned_technician_id])

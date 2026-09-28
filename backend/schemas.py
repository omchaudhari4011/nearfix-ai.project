from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# User & Auth Schemas
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=5)
    role: str = Field(default="customer")  # 'customer', 'technician', 'admin'
    phone: Optional[str] = None
    # If registering as technician
    specialization: Optional[str] = "AC"
    latitude: Optional[float] = 12.9716
    longitude: Optional[float] = 77.5946


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# Technician Schemas
class TechnicianOut(BaseModel):
    id: int
    user_id: int
    name: str
    email: str
    phone: Optional[str]
    specialization: str
    latitude: float
    longitude: float
    is_available: bool
    distance_km: Optional[float] = None

    class Config:
        from_attributes = True


class TechnicianUpdate(BaseModel):
    specialization: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_available: Optional[bool] = None


# Category Schemas
class CategoryCreate(BaseModel):
    name: str
    appliance_type: str = "AC"


class CategoryOut(BaseModel):
    id: int
    name: str
    appliance_type: str

    class Config:
        from_attributes = True


# Price List Schemas
class PriceListCreate(BaseModel):
    category_id: int
    min_price: float
    max_price: float


class PriceListOut(BaseModel):
    id: int
    category_id: int
    category_name: Optional[str] = None
    min_price: float
    max_price: float

    class Config:
        from_attributes = True


# Complaint Schemas
class ComplaintCreate(BaseModel):
    complaint_text: str = Field(..., min_length=5)
    appliance_type: Optional[str] = "AC"
    customer_latitude: Optional[float] = None
    customer_longitude: Optional[float] = None
    auto_assign: Optional[bool] = True


class ComplaintClassificationResult(BaseModel):
    predicted_category: str
    confidence: float
    price_estimate: str
    min_price: float
    max_price: float
    probabilities: dict


class AssignTechnicianRequest(BaseModel):
    complaint_id: int
    customer_latitude: float
    customer_longitude: float
    appliance_type: Optional[str] = "AC"


class ComplaintOut(BaseModel):
    id: int
    customer_id: int
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    complaint_text: str
    predicted_category: str
    price_estimate: str
    assigned_technician_id: Optional[int] = None
    assigned_technician: Optional[TechnicianOut] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

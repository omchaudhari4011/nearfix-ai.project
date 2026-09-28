import os
import sys
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models
import schemas
import auth
import ml_service
import allocation_service

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-Powered Complaint Classification & Technician Allocation API",
    description="Final-year B.Tech project combining TF-IDF + SVM classification, rule-based pricing, and geopy distance allocation.",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Seed initial categories, prices, technicians and sample users on startup
@app.on_event("startup")
def startup_seed_data():
    db = next(get_db())
    try:
        # 1. Seed Categories & Price Lists
        initial_categories = [
            ("cooling_issue", "AC", 600.0, 1200.0),
            ("gas_leak", "AC", 1800.0, 3200.0),
            ("noise_issue", "AC", 500.0, 950.0),
            ("power_issue", "AC", 750.0, 1600.0),
            ("remote_issue", "AC", 350.0, 700.0),
            ("water_leakage", "AC", 400.0, 800.0),
            ("installation", "AC", 1200.0, 2500.0),
        ]

        for cat_name, app_type, min_p, max_p in initial_categories:
            existing_cat = db.query(models.Category).filter(models.Category.name == cat_name).first()
            if not existing_cat:
                new_cat = models.Category(name=cat_name, appliance_type=app_type)
                db.add(new_cat)
                db.commit()
                db.refresh(new_cat)

                new_price = models.PriceList(category_id=new_cat.id, min_price=min_p, max_price=max_p)
                db.add(new_price)
                db.commit()

        # 2. Seed Default Admin
        admin_user = db.query(models.User).filter(models.User.email == "admin@repair.com").first()
        if not admin_user:
            admin_user = models.User(
                name="Project Admin",
                email="admin@repair.com",
                password_hash=auth.hash_password("admin123"),
                role="admin",
                phone="+91-9876543200"
            )
            db.add(admin_user)
            db.commit()

        # 3. Seed Default Customer
        cust_user = db.query(models.User).filter(models.User.email == "customer@test.com").first()
        if not cust_user:
            cust_user = models.User(
                name="Rahul Sharma",
                email="customer@test.com",
                password_hash=auth.hash_password("customer123"),
                role="customer",
                phone="+91-9880011223"
            )
            db.add(cust_user)
            db.commit()

        # 4. Seed Real Technicians with realistic GPS coordinates (Bangalore Metro cluster)
        initial_technicians = [
            {
                "name": "Suresh Kumar",
                "email": "tech.suresh@repair.com",
                "phone": "+91-9448101010",
                "specialization": "AC Specialist",
                "lat": 12.9716,   # MG Road / City Center
                "lon": 77.5946,
                "is_available": True
            },
            {
                "name": "Ramesh Patel",
                "email": "tech.ramesh@repair.com",
                "phone": "+91-9448202020",
                "specialization": "AC / Refrigeration",
                "lat": 12.9279,   # Jayanagar / South Bangalore
                "lon": 77.5828,
                "is_available": True
            },
            {
                "name": "Anil Verma",
                "email": "tech.anil@repair.com",
                "phone": "+91-9448303030",
                "specialization": "AC Inverter & PCB Electronics",
                "lat": 12.9784,   # Indiranagar / East Bangalore
                "lon": 77.6408,
                "is_available": True
            },
            {
                "name": "Karthik Raj",
                "email": "tech.karthik@repair.com",
                "phone": "+91-9448404040",
                "specialization": "AC Installation & Piping",
                "lat": 13.0358,   # Hebbal / North Bangalore
                "lon": 77.5970,
                "is_available": True
            }
        ]

        for tech_info in initial_technicians:
            existing_tech_user = db.query(models.User).filter(models.User.email == tech_info["email"]).first()
            if not existing_tech_user:
                t_user = models.User(
                    name=tech_info["name"],
                    email=tech_info["email"],
                    password_hash=auth.hash_password("tech123"),
                    role="technician",
                    phone=tech_info["phone"]
                )
                db.add(t_user)
                db.commit()
                db.refresh(t_user)

                t_profile = models.Technician(
                    user_id=t_user.id,
                    specialization=tech_info["specialization"],
                    latitude=tech_info["lat"],
                    longitude=tech_info["lon"],
                    is_available=tech_info["is_available"]
                )
                db.add(t_profile)
                db.commit()

    finally:
        db.close()


# -------------------------------------------------------------
# AUTHENTICATION ENDPOINTS
# -------------------------------------------------------------
@app.post("/auth/register", response_model=schemas.Token)
def register(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        name=user_data.name,
        email=user_data.email,
        password_hash=auth.hash_password(user_data.password),
        role=user_data.role,
        phone=user_data.phone
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if user_data.role == "technician":
        tech_profile = models.Technician(
            user_id=new_user.id,
            specialization=user_data.specialization or "AC",
            latitude=user_data.latitude or 12.9716,
            longitude=user_data.longitude or 77.5946,
            is_available=True
        )
        db.add(tech_profile)
        db.commit()

    access_token = auth.create_access_token(data={"sub": str(new_user.id), "role": new_user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }


@app.post("/auth/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not auth.verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = auth.create_access_token(data={"sub": str(user.id), "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@app.get("/auth/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# -------------------------------------------------------------
# COMPLAINT & ALLOCATION ENDPOINTS
# -------------------------------------------------------------
@app.post("/complaints/classify", response_model=schemas.ComplaintClassificationResult)
def test_classify_only(complaint_text: str):
    """Standalone endpoint to run AI classification and pricing lookup without persisting"""
    result = ml_service.classify_complaint_text(complaint_text)
    db = next(get_db())
    try:
        cat_rec = db.query(models.Category).filter(models.Category.name == result["category"]).first()
        min_p = result["min_price"]
        max_p = result["max_price"]
        if cat_rec and cat_rec.price_item:
            min_p = cat_rec.price_item.min_price
            max_p = cat_rec.price_item.max_price
    finally:
        db.close()

    return {
        "predicted_category": result["category"],
        "confidence": result["confidence"],
        "price_estimate": f"₹{int(min_p)} - ₹{int(max_p)}",
        "min_price": min_p,
        "max_price": max_p,
        "probabilities": result["probabilities"]
    }


@app.post("/complaints/submit")
def submit_complaint(
    payload: schemas.ComplaintCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accepts complaint text, runs TF-IDF + SVM classifier, looks up rule-based price range,
    and optionally executes intelligent Haversine technician allocation.
    """
    # 1. AI Classification
    ai_result = ml_service.classify_complaint_text(payload.complaint_text)
    category_name = ai_result["category"]

    # 2. Rule-Based Price Lookup from Database price_list
    cat_rec = db.query(models.Category).filter(models.Category.name == category_name).first()
    if cat_rec and cat_rec.price_item:
        min_p = cat_rec.price_item.min_price
        max_p = cat_rec.price_item.max_price
    else:
        min_p = ai_result["min_price"]
        max_p = ai_result["max_price"]

    price_str = f"₹{int(min_p)} - ₹{int(max_p)}"

    # 3. Technician Allocation
    assigned_tech = None
    distance_km = None
    customer_care = None

    cust_lat = payload.customer_latitude or 12.9716
    cust_lon = payload.customer_longitude or 77.5946

    if payload.auto_assign:
        assigned_tech, distance_km, customer_care = allocation_service.allocate_nearest_technician(
            db=db,
            customer_lat=cust_lat,
            customer_lon=cust_lon,
            appliance_type=payload.appliance_type or "AC"
        )

    complaint = models.Complaint(
        customer_id=current_user.id,
        complaint_text=payload.complaint_text,
        predicted_category=category_name,
        price_estimate=price_str,
        assigned_technician_id=assigned_tech.id if assigned_tech else None,
        status="Assigned" if assigned_tech else "Pending",
        created_at=datetime.utcnow()
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    response_data = {
        "complaint_id": complaint.id,
        "predicted_category": category_name,
        "category_title": ai_result["title"],
        "category_description": ai_result["description"],
        "confidence": ai_result["confidence"],
        "probabilities": ai_result["probabilities"],
        "price_estimate": price_str,
        "min_price": min_p,
        "max_price": max_p,
        "status": complaint.status,
        "created_at": complaint.created_at,
        "assigned_technician": None,
        "customer_care": None
    }

    if assigned_tech:
        response_data["assigned_technician"] = {
            "id": assigned_tech.id,
            "name": assigned_tech.user.name,
            "email": assigned_tech.user.email,
            "phone": assigned_tech.user.phone,
            "specialization": assigned_tech.specialization,
            "distance_km": distance_km,
            "latitude": assigned_tech.latitude,
            "longitude": assigned_tech.longitude
        }
    else:
        response_data["customer_care"] = customer_care or allocation_service.CUSTOMER_CARE_CONTACT

    return response_data


@app.post("/complaints/assign-technician")
def assign_technician(
    req: schemas.AssignTechnicianRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually triggers or updates technician allocation based on customer coordinates.
    Filters by specialization + availability, sorts by Haversine distance using geopy.
    """
    complaint = db.query(models.Complaint).filter(models.Complaint.id == req.complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    tech, distance_km, care = allocation_service.allocate_nearest_technician(
        db=db,
        customer_lat=req.customer_latitude,
        customer_lon=req.customer_longitude,
        appliance_type=req.appliance_type or "AC"
    )

    if tech:
        complaint.assigned_technician_id = tech.id
        complaint.status = "Assigned"
        db.commit()
        return {
            "success": True,
            "assigned_technician": {
                "id": tech.id,
                "name": tech.user.name,
                "email": tech.user.email,
                "phone": tech.user.phone,
                "specialization": tech.specialization,
                "distance_km": distance_km
            },
            "status": complaint.status
        }
    else:
        return {
            "success": False,
            "message": "No nearby technician available within service radius",
            "customer_care": care
        }


@app.get("/complaints/customer/me")
def get_my_complaints(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Complaint history for logged-in customer"""
    complaints = (
        db.query(models.Complaint)
        .filter(models.Complaint.customer_id == current_user.id)
        .order_by(models.Complaint.created_at.desc())
        .all()
    )
    result = []
    for c in complaints:
        t_data = None
        if c.assigned_technician:
            t_data = {
                "id": c.assigned_technician.id,
                "name": c.assigned_technician.user.name,
                "phone": c.assigned_technician.user.phone,
                "specialization": c.assigned_technician.specialization
            }
        result.append({
            "id": c.id,
            "complaint_text": c.complaint_text,
            "predicted_category": c.predicted_category,
            "price_estimate": c.price_estimate,
            "status": c.status,
            "created_at": c.created_at,
            "assigned_technician": t_data
        })
    return result


@app.get("/complaints/{complaint_id}")
def get_complaint_details(
    complaint_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Authorize: admin or owner or assigned technician
    if current_user.role != "admin" and complaint.customer_id != current_user.id:
        if not (current_user.technician_profile and complaint.assigned_technician_id == current_user.technician_profile.id):
            raise HTTPException(status_code=403, detail="Access denied")

    tech_data = None
    if complaint.assigned_technician:
        tech_data = {
            "id": complaint.assigned_technician.id,
            "name": complaint.assigned_technician.user.name,
            "email": complaint.assigned_technician.user.email,
            "phone": complaint.assigned_technician.user.phone,
            "specialization": complaint.assigned_technician.specialization,
            "latitude": complaint.assigned_technician.latitude,
            "longitude": complaint.assigned_technician.longitude,
        }

    return {
        "id": complaint.id,
        "customer_id": complaint.customer_id,
        "customer_name": complaint.customer.name,
        "customer_phone": complaint.customer.phone,
        "complaint_text": complaint.complaint_text,
        "predicted_category": complaint.predicted_category,
        "price_estimate": complaint.price_estimate,
        "status": complaint.status,
        "created_at": complaint.created_at,
        "assigned_technician": tech_data
    }


# -------------------------------------------------------------
# TECHNICIAN DASHBOARD ENDPOINTS
# -------------------------------------------------------------
@app.get("/technician/jobs")
def get_technician_jobs(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Returns jobs assigned to the logged-in technician"""
    tech = current_user.technician_profile
    if not tech:
        raise HTTPException(status_code=400, detail="User is not registered as a technician")

    jobs = (
        db.query(models.Complaint)
        .filter(models.Complaint.assigned_technician_id == tech.id)
        .order_by(models.Complaint.created_at.desc())
        .all()
    )

    output = []
    for j in jobs:
        output.append({
            "id": j.id,
            "customer_name": j.customer.name if j.customer else "Unknown",
            "customer_phone": j.customer.phone if j.customer else "N/A",
            "complaint_text": j.complaint_text,
            "predicted_category": j.predicted_category,
            "price_estimate": j.price_estimate,
            "status": j.status,
            "created_at": j.created_at
        })
    return {
        "technician_profile": {
            "id": tech.id,
            "specialization": tech.specialization,
            "is_available": tech.is_available,
            "latitude": tech.latitude,
            "longitude": tech.longitude
        },
        "jobs": output
    }


@app.put("/technician/jobs/{complaint_id}/complete")
def complete_job(
    complaint_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a technician's job as Resolved"""
    tech = current_user.technician_profile
    if not tech and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Technician authorization required")

    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if current_user.role != "admin" and complaint.assigned_technician_id != tech.id:
        raise HTTPException(status_code=403, detail="Not assigned to this complaint")

    complaint.status = "Resolved"
    db.commit()
    return {"success": True, "message": "Job marked as resolved", "status": "Resolved"}


@app.put("/technician/profile")
def update_technician_profile(
    update_data: schemas.TechnicianUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    tech = current_user.technician_profile
    if not tech:
        raise HTTPException(status_code=400, detail="User is not a technician")

    if update_data.is_available is not None:
        tech.is_available = update_data.is_available
    if update_data.specialization is not None:
        tech.specialization = update_data.specialization
    if update_data.latitude is not None:
        tech.latitude = update_data.latitude
    if update_data.longitude is not None:
        tech.longitude = update_data.longitude

    db.commit()
    return {
        "success": True,
        "technician": {
            "id": tech.id,
            "is_available": tech.is_available,
            "specialization": tech.specialization,
            "latitude": tech.latitude,
            "longitude": tech.longitude
        }
    }


# -------------------------------------------------------------
# ADMIN CRUD ENDPOINTS
# -------------------------------------------------------------
@app.get("/admin/overview")
def admin_overview(
    current_user: models.User = Depends(auth.require_role(["admin"])),
    db: Session = Depends(get_db)
):
    total_complaints = db.query(models.Complaint).count()
    resolved_complaints = db.query(models.Complaint).filter(models.Complaint.status == "Resolved").count()
    pending_complaints = db.query(models.Complaint).filter(models.Complaint.status == "Pending").count()
    assigned_complaints = db.query(models.Complaint).filter(models.Complaint.status == "Assigned").count()
    total_technicians = db.query(models.Technician).count()
    available_technicians = db.query(models.Technician).filter(models.Technician.is_available == True).count()
    total_customers = db.query(models.User).filter(models.User.role == "customer").count()

    return {
        "total_complaints": total_complaints,
        "resolved_complaints": resolved_complaints,
        "pending_complaints": pending_complaints,
        "assigned_complaints": assigned_complaints,
        "total_technicians": total_technicians,
        "available_technicians": available_technicians,
        "total_customers": total_customers
    }


@app.get("/admin/complaints")
def admin_get_all_complaints(
    current_user: models.User = Depends(auth.require_role(["admin"])),
    db: Session = Depends(get_db)
):
    complaints = db.query(models.Complaint).order_by(models.Complaint.created_at.desc()).all()
    results = []
    for c in complaints:
        results.append({
            "id": c.id,
            "customer_id": c.customer_id,
            "customer_name": c.customer.name if c.customer else "Unknown",
            "customer_phone": c.customer.phone if c.customer else "N/A",
            "complaint_text": c.complaint_text,
            "predicted_category": c.predicted_category,
            "price_estimate": c.price_estimate,
            "assigned_technician_name": c.assigned_technician.user.name if c.assigned_technician else None,
            "status": c.status,
            "created_at": c.created_at
        })
    return results


@app.get("/admin/categories")
def admin_get_categories(db: Session = Depends(get_db)):
    cats = db.query(models.Category).all()
    out = []
    for c in cats:
        out.append({
            "id": c.id,
            "name": c.name,
            "appliance_type": c.appliance_type,
            "min_price": c.price_item.min_price if c.price_item else 0.0,
            "max_price": c.price_item.max_price if c.price_item else 0.0
        })
    return out


@app.post("/admin/categories")
def admin_create_category(
    cat: schemas.CategoryCreate,
    current_user: models.User = Depends(auth.require_role(["admin"])),
    db: Session = Depends(get_db)
):
    existing = db.query(models.Category).filter(models.Category.name == cat.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")

    new_cat = models.Category(name=cat.name, appliance_type=cat.appliance_type)
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat


@app.post("/admin/price-list")
def admin_set_price(
    p: schemas.PriceListCreate,
    current_user: models.User = Depends(auth.require_role(["admin"])),
    db: Session = Depends(get_db)
):
    cat = db.query(models.Category).filter(models.Category.id == p.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    existing_price = db.query(models.PriceList).filter(models.PriceList.category_id == p.category_id).first()
    if existing_price:
        existing_price.min_price = p.min_price
        existing_price.max_price = p.max_price
    else:
        new_price = models.PriceList(category_id=p.category_id, min_price=p.min_price, max_price=p.max_price)
        db.add(new_price)

    db.commit()
    return {"success": True, "message": "Price range updated"}


@app.get("/admin/technicians")
def admin_get_technicians(
    current_user: models.User = Depends(auth.require_role(["admin"])),
    db: Session = Depends(get_db)
):
    techs = db.query(models.Technician).all()
    results = []
    for t in techs:
        active_jobs = db.query(models.Complaint).filter(
            models.Complaint.assigned_technician_id == t.id,
            models.Complaint.status != "Resolved"
        ).count()
        results.append({
            "id": t.id,
            "user_id": t.user_id,
            "name": t.user.name,
            "email": t.user.email,
            "phone": t.user.phone,
            "specialization": t.specialization,
            "latitude": t.latitude,
            "longitude": t.longitude,
            "is_available": t.is_available,
            "active_jobs_count": active_jobs
        })
    return results


@app.put("/admin/technicians/{tech_id}/toggle-status")
def admin_toggle_tech_status(
    tech_id: int,
    current_user: models.User = Depends(auth.require_role(["admin"])),
    db: Session = Depends(get_db)
):
    tech = db.query(models.Technician).filter(models.Technician.id == tech_id).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")

    tech.is_available = not tech.is_available
    db.commit()
    return {"success": True, "is_available": tech.is_available}


# -------------------------------------------------------------
# ML METRICS & EXPLAINABILITY ENDPOINT
# -------------------------------------------------------------
@app.get("/ml/metrics")
def get_ml_metrics():
    """Returns classification report, confusion matrix, accuracy and top keywords for UI visualization"""
    return ml_service.get_model_metrics()

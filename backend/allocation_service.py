from typing import Optional, List, Tuple
from geopy.distance import geodesic, great_circle
from sqlalchemy.orm import Session
import models

# Fallback Customer Care Center coordinates and helpline
CUSTOMER_CARE_CONTACT = {
    "center_name": "Central Appliance Support & Dispatch Hub",
    "phone": "+91-1800-425-2244",
    "email": "support@appliance-allocator.ac.in",
    "hours": "24x7 Customer Helpline",
    "address": "Tech Support HQ, Electronic City, Bangalore 560100"
}


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate geodesic / great circle distance using geopy.
    Returns distance in kilometers rounded to 2 decimal places.
    """
    point1 = (lat1, lon1)
    point2 = (lat2, lon2)
    # geopy great_circle implements the spherical Haversine formula
    distance = great_circle(point1, point2).kilometers
    return round(distance, 2)


def allocate_nearest_technician(
    db: Session,
    customer_lat: float,
    customer_lon: float,
    appliance_type: str = "AC",
    max_radius_km: float = 35.0
) -> Tuple[Optional[models.Technician], Optional[float], Optional[dict]]:
    """
    Intelligent Technician Allocation Algorithm:
    1. Filter technicians who are currently marked 'is_available == True'
    2. Filter technicians matching specialization (e.g. 'AC' or 'All-Rounder')
    3. Calculate Haversine distance using geopy from customer location to each candidate
    4. Sort ascending by distance (kilometers)
    5. If nearest technician is within service radius (default 35km), assign them.
       Otherwise, fallback to customer care contact.
    """
    query = (
        db.query(models.Technician)
        .join(models.User)
        .filter(models.Technician.is_available == True)
    )

    all_active_techs = query.all()

    # Specialization filter (case-insensitive substring match or 'all')
    appliance_lower = appliance_type.lower()
    matched_techs = []
    for tech in all_active_techs:
        spec = tech.specialization.lower()
        if appliance_lower in spec or "all" in spec or "general" in spec:
            matched_techs.append(tech)

    # Fallback to any available technician if no exact specialization
    candidates = matched_techs if matched_techs else all_active_techs

    if not candidates:
        return None, None, CUSTOMER_CARE_CONTACT

    # Distance calculation & sorting
    tech_distances = []
    for tech in candidates:
        dist = calculate_haversine_distance(customer_lat, customer_lon, tech.latitude, tech.longitude)
        tech_distances.append((tech, dist))

    # Sort ascending by distance
    tech_distances.sort(key=lambda x: x[1])

    nearest_tech, min_dist = tech_distances[0]

    if min_dist > max_radius_km:
        # Distance exceeded service limit
        return None, min_dist, {
            **CUSTOMER_CARE_CONTACT,
            "notice": f"Nearest technician is {min_dist} km away (exceeds {max_radius_km} km cutoff). Directing to care center."
        }

    return nearest_tech, min_dist, None

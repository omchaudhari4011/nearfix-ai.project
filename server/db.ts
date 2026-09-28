import crypto from "crypto";

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: "customer" | "technician" | "admin";
  phone: string;
}

export interface TechnicianRecord {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  latitude: number;
  longitude: number;
  isAvailable: boolean;
}

export interface CategoryRecord {
  id: number;
  name: string;
  applianceType: string;
  minPrice: number;
  maxPrice: number;
}

export interface ComplaintRecord {
  id: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerLat?: number;
  customerLon?: number;
  complaintText: string;
  applianceType: string;
  predictedCategory: string;
  confidenceScore: number;
  priceEstimate: string;
  minPrice: number;
  maxPrice: number;
  status: "Pending" | "Assigned" | "Resolved";
  assignedTechnicianId?: number;
  assignedTechnicianName?: string;
  assignedTechnicianPhone?: string;
  distanceKm?: number;
  createdAt: string;
  resolvedAt?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "btech_project_secret_key_complaint_allocator_2026";
const PASS_SALT = "btech_ai_salt_secure_2026";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(PASS_SALT + password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generateToken(payload: { id: number; email: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const data = Buffer.from(JSON.stringify({
    sub: String(payload.id),
    id: payload.id,
    role: payload.role,
    email: payload.email,
    exp: Math.floor(Date.now() / 1000) + 86400 * 7 // 7 days
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
  return `${header}.${data}.${signature}`;
}

export function decodeToken(token: string): { sub: string; id?: number; role: string; email: string } | null {
  try {
    if (!token || typeof token !== "string") return null;
    const cleanToken = token.trim().replace(/^["']|["']$/g, "");
    const parts = cleanToken.split(".");
    if (parts.length !== 3) return null;
    const [header, data, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// Haversine Distance (Spherical Geodesic) in Kilometers
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

// In-Memory Database Store with Sample Data
class DatabaseStore {
  users: UserRecord[] = [];
  technicians: TechnicianRecord[] = [];
  categories: CategoryRecord[] = [];
  complaints: ComplaintRecord[] = [];
  private nextUserId = 1;
  private nextTechId = 1;
  private nextCatId = 1;
  private nextComplaintId = 1;

  constructor() {
    this.seedInitialData();
  }

  seedInitialData() {
    // 1. Categories & Rule-Based Tariff Price Bounds (AC, Refrigerator, TV)
    const initialCategories = [
      { name: "cooling_issue", applianceType: "AC", minPrice: 600, maxPrice: 1200 },
      { name: "gas_leak", applianceType: "AC", minPrice: 1800, maxPrice: 3200 },
      { name: "water_leakage", applianceType: "AC", minPrice: 400, maxPrice: 800 },
      { name: "power_issue", applianceType: "AC", minPrice: 750, maxPrice: 1600 },
      { name: "noise_issue", applianceType: "AC", minPrice: 500, maxPrice: 950 },
      { name: "remote_issue", applianceType: "AC", minPrice: 350, maxPrice: 700 },
      { name: "installation", applianceType: "AC", minPrice: 1200, maxPrice: 2500 },
      // Refrigerator Categories
      { name: "refrigerator_cooling", applianceType: "Fridge", minPrice: 700, maxPrice: 1500 },
      { name: "refrigerator_frost_buildup", applianceType: "Fridge", minPrice: 500, maxPrice: 1100 },
      // Television Categories
      { name: "display_issue", applianceType: "TV", minPrice: 800, maxPrice: 2200 },
      { name: "tv_sound_no_picture", applianceType: "TV", minPrice: 850, maxPrice: 1900 }
    ];

    for (const cat of initialCategories) {
      this.categories.push({
        id: this.nextCatId++,
        name: cat.name,
        applianceType: cat.applianceType,
        minPrice: cat.minPrice,
        maxPrice: cat.maxPrice
      });
    }

    // 2. Demo Admin User
    this.users.push({
      id: this.nextUserId++,
      name: "Project Admin",
      email: "admin@repair.com",
      passwordHash: hashPassword("admin123"),
      role: "admin",
      phone: "+91-9876543200"
    });

    // 3. Demo Customer User
    const customer = {
      id: this.nextUserId++,
      name: "Rahul Sharma",
      email: "customer@test.com",
      passwordHash: hashPassword("customer123"),
      role: "customer" as const,
      phone: "+91-9880011223"
    };
    this.users.push(customer);

    // 4. Bangalore Metro Technicians for AC, Refrigerator, and TV
    const techsData = [
      // AC Technicians
      {
        name: "Suresh Kumar",
        email: "tech.suresh@repair.com",
        phone: "+91-9448101010",
        specialization: "AC Specialist & Inverter Repair",
        latitude: 12.9716, // MG Road / Central Bangalore
        longitude: 77.5946,
        isAvailable: true
      },
      {
        name: "Karthik Raj",
        email: "tech.karthik@repair.com",
        phone: "+91-9448404040",
        specialization: "AC Installation, Deep Clean & Piping",
        latitude: 13.0358, // Hebbal / North Bangalore
        longitude: 77.5970,
        isAvailable: true
      },
      // Refrigerator Technicians
      {
        name: "Ramesh Patel",
        email: "tech.ramesh@repair.com",
        phone: "+91-9448202020",
        specialization: "Refrigerator & Deep Freezer Cooling Specialist",
        latitude: 12.9279, // Jayanagar / South Bangalore
        longitude: 77.5828,
        isAvailable: true
      },
      {
        name: "Priya Nambiar",
        email: "tech.priya@repair.com",
        phone: "+91-9448505050",
        specialization: "Refrigerator Compressor & Defrost Specialist",
        latitude: 12.9352, // Koramangala / South East Bangalore
        longitude: 77.6245,
        isAvailable: true
      },
      // Television Technicians
      {
        name: "Anil Verma",
        email: "tech.anil@repair.com",
        phone: "+91-9448303030",
        specialization: "Smart TV, LED Display & Audio Specialist",
        latitude: 12.9784, // Indiranagar / East Bangalore
        longitude: 77.6408,
        isAvailable: true
      },
      {
        name: "Deepa Sundaram",
        email: "tech.deepa@repair.com",
        phone: "+91-9448606060",
        specialization: "Television Mainboard & OLED Panel Engineer",
        latitude: 12.9698, // Whitefield / East Bangalore
        longitude: 77.7500,
        isAvailable: true
      }
    ];

    for (const t of techsData) {
      const uId = this.nextUserId++;
      this.users.push({
        id: uId,
        name: t.name,
        email: t.email,
        passwordHash: hashPassword("tech123"),
        role: "technician",
        phone: t.phone
      });

      this.technicians.push({
        id: this.nextTechId++,
        userId: uId,
        name: t.name,
        email: t.email,
        phone: t.phone,
        specialization: t.specialization,
        latitude: t.latitude,
        longitude: t.longitude,
        isAvailable: t.isAvailable
      });
    }

    // 5. Seed Demonstration Complaints
    // AC Sample Complaint
    this.complaints.push({
      id: this.nextComplaintId++,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerLat: 12.9716,
      customerLon: 77.5946,
      complaintText: "Air conditioner blowing warm air and compressor trips repeatedly.",
      applianceType: "AC",
      predictedCategory: "cooling_issue",
      confidenceScore: 0.92,
      priceEstimate: "₹600 - ₹1200",
      minPrice: 600,
      maxPrice: 1200,
      status: "Assigned",
      assignedTechnicianId: 1,
      assignedTechnicianName: "Suresh Kumar",
      assignedTechnicianPhone: "+91-9448101010",
      distanceKm: 2.1,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    });

    // TV Sample Complaint
    this.complaints.push({
      id: this.nextComplaintId++,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerLat: 12.9784,
      customerLon: 77.6408,
      complaintText: "Smart TV power light turns on but screen is completely black with audio only.",
      applianceType: "TV",
      predictedCategory: "display_issue",
      confidenceScore: 0.95,
      priceEstimate: "₹800 - ₹2200",
      minPrice: 800,
      maxPrice: 2200,
      status: "Assigned",
      assignedTechnicianId: 5, // Anil Verma
      assignedTechnicianName: "Anil Verma",
      assignedTechnicianPhone: "+91-9448303030",
      distanceKm: 1.4,
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
    });

    // Refrigerator Sample Complaint
    this.complaints.push({
      id: this.nextComplaintId++,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerLat: 12.9279,
      customerLon: 77.5828,
      complaintText: "Refrigerator freezer has excessive frost buildup and lower fresh food compartment is warm.",
      applianceType: "Fridge",
      predictedCategory: "cooling_issue",
      confidenceScore: 0.89,
      priceEstimate: "₹700 - ₹1500",
      minPrice: 700,
      maxPrice: 1500,
      status: "Assigned",
      assignedTechnicianId: 3, // Ramesh Patel
      assignedTechnicianName: "Ramesh Patel",
      assignedTechnicianPhone: "+91-9448202020",
      distanceKm: 0.8,
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
    });
  }

  findUserByEmail(email: string): UserRecord | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id: number): UserRecord | undefined {
    return this.users.find((u) => u.id === id);
  }

  findTechByUserId(userId: number): TechnicianRecord | undefined {
    return this.technicians.find((t) => t.userId === userId);
  }

  findTechById(techId: number): TechnicianRecord | undefined {
    return this.technicians.find((t) => t.id === techId);
  }

  addUser(data: { name: string; email: string; password: string; role: "customer" | "technician"; phone: string }): UserRecord {
    const user: UserRecord = {
      id: this.nextUserId++,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: hashPassword(data.password),
      role: data.role,
      phone: data.phone
    };
    this.users.push(user);
    return user;
  }

  addTechnician(data: { userId: number; name: string; email: string; phone: string; specialization: string; latitude: number; longitude: number }): TechnicianRecord {
    const tech: TechnicianRecord = {
      id: this.nextTechId++,
      userId: data.userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      specialization: data.specialization,
      latitude: data.latitude,
      longitude: data.longitude,
      isAvailable: true
    };
    this.technicians.push(tech);
    return tech;
  }

  allocateNearestTechnician(
    customerLat: number,
    customerLon: number,
    applianceType: string = "AC",
    maxRadiusKm: number = 35
  ): { technician: TechnicianRecord | null; distanceKm: number | null; customerCare: any | null } {
    let candidateTechs = this.technicians.filter((t) => t.isAvailable);

    if (candidateTechs.length === 0) {
      return {
        technician: null,
        distanceKm: null,
        customerCare: {
          center_name: "NearFix Central Appliance Support Hub",
          phone: "+91-1800-425-2244",
          email: "support@nearfix.ai",
          hours: "24x7 Customer Care"
        }
      };
    }

    // Filter candidate technicians matching the appliance type
    if (applianceType) {
      const appLower = applianceType.toLowerCase();
      const matched = candidateTechs.filter((t) => {
        const spec = t.specialization.toLowerCase();
        if (appLower === "ac" && (spec.includes("ac") || spec.includes("air conditioner"))) return true;
        if ((appLower === "fridge" || appLower === "refrigerator") && (spec.includes("fridge") || spec.includes("refrigerat"))) return true;
        if (appLower === "tv" && (spec.includes("tv") || spec.includes("television") || spec.includes("display"))) return true;
        return false;
      });

      // Prioritize appliance-specific technicians
      if (matched.length > 0) {
        candidateTechs = matched;
      }
    }

    // Sort candidate technicians by geodesic Haversine distance
    const withDist = candidateTechs.map((tech) => {
      const dist = calculateHaversineDistance(customerLat, customerLon, tech.latitude, tech.longitude);
      return { tech, dist };
    });

    withDist.sort((a, b) => a.dist - b.dist);
    const nearest = withDist[0];

    if (nearest.dist <= maxRadiusKm) {
      return { technician: nearest.tech, distanceKm: nearest.dist, customerCare: null };
    }

    return {
      technician: null,
      distanceKm: nearest.dist,
      customerCare: {
        center_name: "NearFix Central Appliance Support Hub",
        phone: "+91-1800-425-2244",
        email: "support@nearfix.ai",
        hours: "24x7 Customer Care"
      }
    };
  }

  addComplaint(data: Omit<ComplaintRecord, "id" | "createdAt">): ComplaintRecord {
    const rec: ComplaintRecord = {
      ...data,
      id: this.nextComplaintId++,
      createdAt: new Date().toISOString()
    };
    this.complaints.unshift(rec);
    return rec;
  }
}

export const db = new DatabaseStore();

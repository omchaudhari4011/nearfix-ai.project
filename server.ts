import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { initializeMLEngine, classifyText, getMetrics, CATEGORY_METADATA } from "./server/ml_engine";
import { db, generateToken, decodeToken, verifyPassword } from "./server/db";

// Load environment variables (e.g. PORT, GEMINI_API_KEY)
dotenv.config();

// Read port from process.env.PORT (fallback 3000). Render sets PORT dynamically.
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize ML Engine (TF-IDF + Linear Classifier)
initializeMLEngine();

// Helper to extract JWT token from request headers (Authorization, x-access-token) or cookies
function extractTokenFromRequest(req: express.Request): string | null {
  // 1. Authorization header (Bearer <token> or raw token)
  const authHeader = (req.headers.authorization ||
    req.headers["Authorization"] ||
    req.headers["x-access-token"] ||
    req.headers["x-auth-token"]) as string | undefined;

  if (authHeader && typeof authHeader === "string") {
    const trimmed = authHeader.trim();
    if (trimmed.startsWith("Bearer ") || trimmed.startsWith("bearer ")) {
      const part = trimmed.slice(7).trim();
      if (part && part !== "null" && part !== "undefined") {
        return part.replace(/^["']|["']$/g, "");
      }
    } else if (trimmed && !trimmed.includes(" ") && trimmed !== "null" && trimmed !== "undefined") {
      return trimmed.replace(/^["']|["']$/g, "");
    }
  }

  // 2. Cookie extraction (token, access_token, auth_token, jwt)
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").reduce((acc: Record<string, string>, item) => {
      const idx = item.indexOf("=");
      if (idx !== -1) {
        const k = item.slice(0, idx).trim();
        const v = item.slice(idx + 1).trim();
        acc[k] = decodeURIComponent(v);
      }
      return acc;
    }, {});

    const cookieVal = cookies.token || cookies.access_token || cookies.auth_token || cookies.jwt;
    if (cookieVal && cookieVal !== "null" && cookieVal !== "undefined") {
      return cookieVal.replace(/^["']|["']$/g, "");
    }
  }

  return null;
}

// Helper middleware to extract user from Authorization header or cookie
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return next();
  }

  const payload = decodeToken(token);
  if (payload) {
    const userId = Number(payload.sub || (payload as any).id);
    let user = !isNaN(userId) ? db.findUserById(userId) : undefined;
    // Resilient fallback: if ID lookup fails (e.g. database reseeded), lookup by email
    if (!user && payload.email) {
      user = db.findUserByEmail(payload.email);
    }
    if (user) {
      (req as any).user = user;
    }
  }
  next();
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ detail: "Authentication required" });
  }
  next();
}

function requireRole(allowedRoles: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ detail: `Forbidden: requires one of ${allowedRoles} roles` });
    }
    next();
  };
}

async function startServer() {
  const app = express();

  // Trust reverse proxy for deployment on Render, Cloud Run, etc.
  app.set("trust proxy", 1);

  // CORS middleware supporting credentials and modern headers
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-access-token, x-auth-token, Accept, Origin"
    );

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Enable JSON body parser
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(authMiddleware);

  // -------------------------------------------------------------
  // HEALTH & DIAGNOSTICS
  // -------------------------------------------------------------
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      status: "ok",
      service: "NearFix AI - Complaint Classification & Haversine Allocation",
      timestamp: new Date().toISOString()
    });
  });

  // -------------------------------------------------------------
  // AUTHENTICATION ENDPOINTS
  // -------------------------------------------------------------
  app.post("/auth/register", (req, res) => {
    try {
      const { name, email, password, role, phone, specialization, latitude, longitude } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ detail: "Name, email, and password are required" });
      }

      if (db.findUserByEmail(email)) {
        return res.status(400).json({ detail: "An account with this email already exists" });
      }

      const assignedRole = role === "technician" ? "technician" : "customer";
      const user = db.addUser({
        name,
        email,
        password,
        role: assignedRole,
        phone: phone || "+91-9876500000"
      });

      if (assignedRole === "technician") {
        db.addTechnician({
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          specialization: specialization || "AC Specialist",
          latitude: Number(latitude) || 12.9716,
          longitude: Number(longitude) || 77.5946
        });
      }

      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 7 * 86400 * 1000,
        path: "/"
      });

      return res.json({
        access_token: token,
        token_type: "bearer",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone
        }
      });
    } catch (err: any) {
      return res.status(500).json({ detail: err.message || "Registration failed" });
    }
  });

  app.post("/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ detail: "Email and password are required" });
      }

      const user = db.findUserByEmail(email);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ detail: "Invalid email or password" });
      }

      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 7 * 86400 * 1000,
        path: "/"
      });

      return res.json({
        access_token: token,
        token_type: "bearer",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone
        }
      });
    } catch (err: any) {
      return res.status(500).json({ detail: err.message || "Login failed" });
    }
  });

  app.post("/auth/logout", (_req, res) => {
    const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie("token", {
      path: "/",
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax"
    });
    res.json({ message: "Logged out successfully" });
  });

  app.get("/auth/me", requireAuth, (req, res) => {
    const user = (req as any).user;
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    });
  });

  // -------------------------------------------------------------
  // AI CLASSIFICATION & COMPLAINT SUBMISSION
  // -------------------------------------------------------------
  app.post("/complaints/classify", (req, res) => {
    try {
      const complaintText = (req.query.complaint_text as string) || req.body?.complaint_text || "";
      if (!complaintText.trim()) {
        return res.status(400).json({ detail: "Complaint text is required" });
      }

      const pred = classifyText(complaintText);
      const cat = db.categories.find((c) => c.name === pred.predicted_category);
      const minPrice = cat ? cat.minPrice : pred.min_price;
      const maxPrice = cat ? cat.maxPrice : pred.max_price;

      return res.json({
        predicted_category: pred.predicted_category,
        confidence: pred.confidence,
        price_estimate: `₹${minPrice} - ₹${maxPrice}`,
        min_price: minPrice,
        max_price: maxPrice,
        probabilities: pred.probabilities
      });
    } catch (err: any) {
      return res.status(500).json({ detail: err.message });
    }
  });

  app.post("/complaints/submit", requireAuth, (req, res) => {
    try {
      const user = (req as any).user;
      const {
        complaint_text,
        appliance_type = "AC",
        customer_latitude = 12.9716,
        customer_longitude = 77.5946,
        auto_assign = true
      } = req.body;

      if (!complaint_text || !complaint_text.trim()) {
        return res.status(400).json({ detail: "Complaint text is required" });
      }

      // 1. AI Classification
      const pred = classifyText(complaint_text);

      // 2. Database Tariff Lookup
      const cat = db.categories.find((c) => c.name === pred.predicted_category);
      const minPrice = cat ? cat.minPrice : pred.min_price;
      const maxPrice = cat ? cat.maxPrice : pred.max_price;
      const priceEstimate = `₹${minPrice} - ₹${maxPrice}`;

      // 3. Intelligent Geodesic Allocation
      let assignedTech = null;
      let distanceKm = null;
      let customerCare = null;
      let status: "Pending" | "Assigned" = "Pending";

      if (auto_assign) {
        const alloc = db.allocateNearestTechnician(
          Number(customer_latitude),
          Number(customer_longitude),
          appliance_type,
          35 // 35km radius limit
        );

        if (alloc.technician) {
          assignedTech = alloc.technician;
          distanceKm = alloc.distanceKm;
          status = "Assigned";
        } else {
          customerCare = alloc.customerCare;
        }
      }

      // 4. Record Complaint
      const rec = db.addComplaint({
        customerId: user.id,
        customerName: user.name,
        customerPhone: user.phone,
        customerLat: Number(customer_latitude),
        customerLon: Number(customer_longitude),
        complaintText: complaint_text,
        applianceType: appliance_type,
        predictedCategory: pred.predicted_category,
        confidenceScore: pred.confidence,
        priceEstimate,
        minPrice,
        maxPrice,
        status,
        assignedTechnicianId: assignedTech?.id,
        assignedTechnicianName: assignedTech?.name,
        assignedTechnicianPhone: assignedTech?.phone,
        distanceKm: distanceKm || undefined
      });

      const meta = CATEGORY_METADATA[pred.predicted_category];

      return res.json({
        complaint_id: rec.id,
        predicted_category: rec.predictedCategory,
        category_title: meta?.title || rec.predictedCategory.replace("_", " ").toUpperCase(),
        category_description: meta?.description || "Appliance repair issue",
        confidence: rec.confidenceScore,
        probabilities: pred.probabilities,
        price_estimate: priceEstimate,
        min_price: minPrice,
        max_price: maxPrice,
        status: rec.status,
        created_at: rec.createdAt,
        assigned_technician: assignedTech ? {
          id: assignedTech.id,
          name: assignedTech.name,
          email: assignedTech.email,
          phone: assignedTech.phone,
          specialization: assignedTech.specialization,
          distance_km: distanceKm || 0,
          latitude: assignedTech.latitude,
          longitude: assignedTech.longitude
        } : null,
        customer_care: customerCare
      });
    } catch (err: any) {
      return res.status(500).json({ detail: err.message || "Failed to submit complaint" });
    }
  });

  app.get("/complaints/customer/me", requireAuth, (req, res) => {
    const user = (req as any).user;
    const userComplaints = db.complaints
      .filter((c) => c.customerId === user.id)
      .map((c) => ({
        id: c.id,
        customer_id: c.customerId,
        customer_name: c.customerName,
        customer_phone: c.customerPhone,
        complaint_text: c.complaintText,
        predicted_category: c.predictedCategory,
        price_estimate: c.priceEstimate,
        assigned_technician_id: c.assignedTechnicianId,
        assigned_technician_name: c.assignedTechnicianName,
        assigned_technician: c.assignedTechnicianId ? {
          id: c.assignedTechnicianId,
          name: c.assignedTechnicianName || "",
          phone: c.assignedTechnicianPhone || "",
          specialization: "AC Specialist"
        } : null,
        status: c.status,
        created_at: c.createdAt
      }));
    res.json(userComplaints);
  });

  app.get("/complaints/:id", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const complaint = db.complaints.find((c) => c.id === id);
    if (!complaint) {
      return res.status(404).json({ detail: "Complaint not found" });
    }
    res.json(complaint);
  });

  app.post("/complaints/assign-technician", requireAuth, (req, res) => {
    try {
      const { complaint_id, customer_latitude, customer_longitude, appliance_type = "AC" } = req.body;
      const complaint = db.complaints.find((c) => c.id === Number(complaint_id));
      if (!complaint) {
        return res.status(404).json({ detail: "Complaint not found" });
      }

      const alloc = db.allocateNearestTechnician(
        Number(customer_latitude),
        Number(customer_longitude),
        appliance_type,
        35
      );

      if (alloc.technician) {
        complaint.assignedTechnicianId = alloc.technician.id;
        complaint.assignedTechnicianName = alloc.technician.name;
        complaint.assignedTechnicianPhone = alloc.technician.phone;
        complaint.distanceKm = alloc.distanceKm || undefined;
        complaint.status = "Assigned";

        return res.json({
          status: "Assigned",
          technician: alloc.technician,
          distance_km: alloc.distanceKm
        });
      } else {
        return res.json({
          status: "Pending",
          technician: null,
          customer_care: alloc.customerCare
        });
      }
    } catch (err: any) {
      return res.status(500).json({ detail: err.message });
    }
  });

  // -------------------------------------------------------------
  // TECHNICIAN DISPATCH PORTAL
  // -------------------------------------------------------------
  app.get("/technician/jobs", requireAuth, requireRole(["technician", "admin"]), (req, res) => {
    const user = (req as any).user;
    const tech = db.findTechByUserId(user.id);
    if (!tech) {
      return res.status(404).json({ detail: "Technician profile not found" });
    }

    const assignedComplaints = db.complaints
      .filter((c) => c.assignedTechnicianId === tech.id)
      .map((c) => ({
        id: c.id,
        customer_id: c.customerId,
        customer_name: c.customerName,
        customer_phone: c.customerPhone,
        complaint_text: c.complaintText,
        predicted_category: c.predictedCategory,
        price_estimate: c.priceEstimate,
        status: c.status,
        created_at: c.createdAt
      }));

    res.json({
      technician_profile: {
        id: tech.id,
        name: tech.name,
        email: tech.email,
        phone: tech.phone,
        specialization: tech.specialization,
        latitude: tech.latitude,
        longitude: tech.longitude,
        is_available: tech.isAvailable,
        active_jobs_count: assignedComplaints.filter((j) => j.status !== "Resolved").length
      },
      jobs: assignedComplaints
    });
  });

  app.put("/technician/jobs/:id/complete", requireAuth, requireRole(["technician", "admin"]), (req, res) => {
    const id = Number(req.params.id);
    const complaint = db.complaints.find((c) => c.id === id);
    if (!complaint) {
      return res.status(404).json({ detail: "Job not found" });
    }
    complaint.status = "Resolved";
    complaint.resolvedAt = new Date().toISOString();
    res.json({ status: "Resolved", complaint_id: id });
  });

  app.put("/technician/profile", requireAuth, requireRole(["technician", "admin"]), (req, res) => {
    const user = (req as any).user;
    const tech = db.findTechByUserId(user.id);
    if (!tech) {
      return res.status(404).json({ detail: "Technician not found" });
    }
    if (typeof req.body.is_available === "boolean") {
      tech.isAvailable = req.body.is_available;
    }
    if (req.body.specialization) {
      tech.specialization = req.body.specialization;
    }
    res.json(tech);
  });

  // -------------------------------------------------------------
  // ADMINISTRATOR MASTER CONTROL
  // -------------------------------------------------------------
  app.get("/admin/overview", requireAuth, requireRole(["admin"]), (_req, res) => {
    const totalTickets = db.complaints.length;
    const activeTickets = db.complaints.filter((c) => c.status === "Assigned" || c.status === "Pending").length;
    const resolvedTickets = db.complaints.filter((c) => c.status === "Resolved").length;
    const totalTechs = db.technicians.length;
    const onlineTechs = db.technicians.filter((t) => t.isAvailable).length;

    // Category distribution
    const catCounts: Record<string, number> = {};
    for (const c of db.complaints) {
      catCounts[c.predictedCategory] = (catCounts[c.predictedCategory] || 0) + 1;
    }

    res.json({
      total_tickets: totalTickets,
      active_tickets: activeTickets,
      resolved_tickets: resolvedTickets,
      total_technicians: totalTechs,
      online_technicians: onlineTechs,
      category_distribution: catCounts
    });
  });

  app.get("/admin/complaints", requireAuth, requireRole(["admin"]), (_req, res) => {
    const list = db.complaints.map((c) => ({
      id: c.id,
      customer_id: c.customerId,
      customer_name: c.customerName,
      customer_phone: c.customerPhone,
      complaint_text: c.complaintText,
      predicted_category: c.predictedCategory,
      price_estimate: c.priceEstimate,
      assigned_technician_id: c.assignedTechnicianId,
      assigned_technician_name: c.assignedTechnicianName,
      assigned_technician: c.assignedTechnicianId ? {
        id: c.assignedTechnicianId,
        name: c.assignedTechnicianName || "",
        phone: c.assignedTechnicianPhone || "",
        specialization: "AC Specialist"
      } : null,
      status: c.status,
      created_at: c.createdAt
    }));
    res.json(list);
  });

  app.get("/admin/categories", requireAuth, requireRole(["admin"]), (_req, res) => {
    const list = db.categories.map((c) => ({
      id: c.id,
      name: c.name,
      appliance_type: c.applianceType,
      min_price: c.minPrice,
      max_price: c.maxPrice
    }));
    res.json(list);
  });

  app.post("/admin/categories", requireAuth, requireRole(["admin"]), (req, res) => {
    const { name, appliance_type = "AC", min_price = 500, max_price = 1500 } = req.body;
    const newCat = {
      id: db.categories.length + 1,
      name,
      applianceType: appliance_type,
      minPrice: Number(min_price),
      maxPrice: Number(max_price)
    };
    db.categories.push(newCat);
    res.json(newCat);
  });

  app.post("/admin/price-list", requireAuth, requireRole(["admin"]), (req, res) => {
    const { category_id, min_price, max_price } = req.body;
    const cat = db.categories.find((c) => c.id === Number(category_id));
    if (!cat) {
      return res.status(404).json({ detail: "Category not found" });
    }
    cat.minPrice = Number(min_price);
    cat.maxPrice = Number(max_price);
    res.json({
      id: cat.id,
      name: cat.name,
      min_price: cat.minPrice,
      max_price: cat.maxPrice
    });
  });

  app.get("/admin/technicians", requireAuth, requireRole(["admin"]), (_req, res) => {
    const list = db.technicians.map((t) => {
      const activeJobs = db.complaints.filter(
        (c) => c.assignedTechnicianId === t.id && c.status !== "Resolved"
      ).length;
      return {
        id: t.id,
        user_id: t.userId,
        name: t.name,
        email: t.email,
        phone: t.phone,
        specialization: t.specialization,
        latitude: t.latitude,
        longitude: t.longitude,
        is_available: t.isAvailable,
        active_jobs_count: activeJobs
      };
    });
    res.json(list);
  });

  app.put("/admin/technicians/:id/toggle-status", requireAuth, requireRole(["admin"]), (req, res) => {
    const id = Number(req.params.id);
    const tech = db.findTechById(id);
    if (!tech) {
      return res.status(404).json({ detail: "Technician not found" });
    }
    tech.isAvailable = !tech.isAvailable;
    res.json({
      id: tech.id,
      name: tech.name,
      is_available: tech.isAvailable
    });
  });

  // -------------------------------------------------------------
  // ML MODEL EVALUATION & VIVA DEFENSE METRICS
  // -------------------------------------------------------------
  app.get("/ml/metrics", (_req, res) => {
    const metrics = getMetrics();
    res.json({
      ...metrics,
      top_features: {
        cooling_issue: ["warm", "chill", "cold", "breeze", "cooling", "stuffy"],
        gas_leak: ["freon", "leak", "hissing", "frost", "residue", "pressure"],
        water_leakage: ["drain", "water", "dripping", "tray", "overflowing", "pipe"],
        power_issue: ["mcb", "trip", "breaker", "capacitor", "spark", "dead"],
        noise_issue: ["rattling", "vibration", "grinding", "blower", "thumping", "motor"],
        remote_issue: ["remote", "infrared", "sensor", "button", "display", "unresponsive"],
        installation: ["install", "mounting", "bracket", "piping", "core cutting", "relocate"]
      }
    });
  });

  // -------------------------------------------------------------
  // GEMINI AI DIAGNOSTICS (KEY READ EXCLUSIVELY FROM SERVER ENV)
  // -------------------------------------------------------------
  app.post("/api/ai/diagnose", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        detail: "GEMINI_API_KEY is not configured in server environment variables"
      });
    }
    try {
      const { complaint_text } = req.body;
      if (!complaint_text) {
        return res.status(400).json({ detail: "complaint_text is required" });
      }
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are an expert appliance repair engineer. Analyze this appliance complaint: "${complaint_text}".
Provide a concise, practical technical diagnosis (2-3 sentences), possible root causes (bullet points), and safety precautions for the technician.`
      });
      return res.json({ diagnosis: response.text });
    } catch (err: any) {
      return res.status(500).json({ detail: err.message || "Failed to generate AI diagnosis" });
    }
  });

  // -------------------------------------------------------------
  // FRONTEND STATIC / VITE MIDDLEWARE
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      // Return 404 for unhandled API requests
      if (
        req.path.startsWith("/api/") ||
        req.path.startsWith("/auth/") ||
        req.path.startsWith("/complaints/") ||
        req.path.startsWith("/technician/") ||
        req.path.startsWith("/admin/") ||
        req.path.startsWith("/ml/")
      ) {
        return res.status(404).json({ detail: "API endpoint not found" });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express API + Vite] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

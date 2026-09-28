import axios from "axios";
import {
  User,
  Complaint,
  ComplaintSubmissionResult,
  Technician,
  CategoryItem,
  MLMetrics
} from "./types";

export function getFreshToken(): string | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const clean = token.replace(/^["']|["']$/g, "").trim();
  if (!clean || clean === "null" || clean === "undefined") return null;
  return clean;
}

const api = axios.create({
  baseURL: "", // relative paths so it routes through server.ts proxy directly
  withCredentials: true, // Send cookies with requests
  headers: {
    "Content-Type": "application/json"
  }
});

// Attach fresh JWT token automatically before every request
api.interceptors.request.use((config) => {
  const token = getFreshToken();
  if (token) {
    const bearer = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    if (config.headers && typeof (config.headers as any).set === "function") {
      (config.headers as any).set("Authorization", bearer);
    } else {
      config.headers = config.headers || {};
      (config.headers as any)["Authorization"] = bearer;
    }
  }
  return config;
});

// Response interceptor to handle 401 errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Authentication required for endpoint:", error.config?.url);
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  register: (data: any) => api.post("/auth/register", data),
  login: (data: { email: string; password: string }) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get<User>("/auth/me")
};

export const complaintApi = {
  submit: (data: {
    complaint_text: string;
    appliance_type?: string;
    customer_latitude?: number;
    customer_longitude?: number;
    auto_assign?: boolean;
  }) => {
    const token = getFreshToken();
    const bearer = token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "";
    return api.post<ComplaintSubmissionResult>("/complaints/submit", data, {
      headers: bearer ? { Authorization: bearer } : undefined
    });
  },

  classifyOnly: (text: string) =>
    api.post("/complaints/classify", null, { params: { complaint_text: text } }),

  getMyComplaints: () => api.get<Complaint[]>("/complaints/customer/me"),

  getDetails: (id: number) => api.get<Complaint>(`/complaints/${id}`),

  assignTechnician: (data: {
    complaint_id: number;
    customer_latitude: number;
    customer_longitude: number;
    appliance_type?: string;
  }) => api.post("/complaints/assign-technician", data)
};

export const technicianApi = {
  getJobs: () => api.get<{ technician_profile: any; jobs: Complaint[] }>("/technician/jobs"),
  completeJob: (id: number) => api.put(`/technician/jobs/${id}/complete`),
  updateProfile: (data: any) => api.put("/technician/profile", data)
};

export const adminApi = {
  getOverview: () => api.get<any>("/admin/overview"),
  getAllComplaints: () => api.get<Complaint[]>("/admin/complaints"),
  getCategories: () => api.get<CategoryItem[]>("/admin/categories"),
  createCategory: (data: { name: string; appliance_type: string }) =>
    api.post("/admin/categories", data),
  updatePrice: (data: { category_id: number; min_price: number; max_price: number }) =>
    api.post("/admin/price-list", data),
  getTechnicians: () => api.get<Technician[]>("/admin/technicians"),
  toggleTechStatus: (techId: number) => api.put(`/admin/technicians/${techId}/toggle-status`)
};

export const mlApi = {
  getMetrics: () => api.get<MLMetrics>("/ml/metrics")
};

export const geminiApi = {
  getAiDiagnosis: (complaint_text: string) =>
    api.post<{ diagnosis: string }>("/api/ai/diagnose", { complaint_text })
};

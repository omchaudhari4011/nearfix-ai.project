export type UserRole = "customer" | "technician" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

export interface Technician {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  specialization: string;
  latitude: number;
  longitude: number;
  is_available: boolean;
  distance_km?: number;
  active_jobs_count?: number;
}

export interface CustomerCareContact {
  center_name: string;
  phone: string;
  email: string;
  hours: string;
  address: string;
  notice?: string;
}

export interface ComplaintSubmissionResult {
  complaint_id: number;
  predicted_category: string;
  category_title: string;
  category_description: string;
  confidence: number;
  probabilities: Record<string, number>;
  price_estimate: string;
  min_price: number;
  max_price: number;
  status: string;
  created_at: string;
  assigned_technician: {
    id: number;
    name: string;
    email: string;
    phone: string;
    specialization: string;
    distance_km: number;
    latitude: number;
    longitude: number;
  } | null;
  customer_care: CustomerCareContact | null;
}

export interface Complaint {
  id: number;
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  complaint_text: string;
  appliance_type?: string;
  predicted_category: string;
  price_estimate: string;
  assigned_technician_id?: number;
  assigned_technician?: {
    id: number;
    name: string;
    phone?: string;
    specialization: string;
  } | null;
  assigned_technician_name?: string;
  status: "Pending" | "Assigned" | "In Progress" | "Resolved";
  created_at: string;
}

export interface CategoryItem {
  id: number;
  name: string;
  appliance_type: string;
  min_price: number;
  max_price: number;
}

export interface MLMetrics {
  accuracy: number;
  total_samples: number;
  train_samples: number;
  test_samples: number;
  categories: string[];
  classification_report: Record<string, any>;
  confusion_matrix: number[][];
  top_features: Record<string, string[]>;
}

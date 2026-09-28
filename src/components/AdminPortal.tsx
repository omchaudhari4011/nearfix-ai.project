import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Wrench,
  Users,
  Activity,
  Search,
  Plus,
  Edit2,
  Check,
  RefreshCw,
  Power,
  MapPin,
  Sparkles,
  UserCheck,
  AlertCircle,
  Layers,
  Clock,
  CheckCircle
} from "lucide-react";
import { adminApi, mlApi } from "../api";
import { Complaint, CategoryItem, Technician, User, MLMetrics } from "../types";

interface AdminPortalProps {
  currentUser: User | null;
  onRequireAuth: (defaultRole?: "admin") => void;
  onQuickLoginAdmin: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentUser,
  onRequireAuth,
  onQuickLoginAdmin
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"complaints" | "pricing" | "technicians" | "ai_metrics">("complaints");
  const [overview, setOverview] = useState<any>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [metrics, setMetrics] = useState<MLMetrics | null>(null);

  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Price editing state
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editMinPrice, setEditMinPrice] = useState<number>(0);
  const [editMaxPrice, setEditMaxPrice] = useState<number>(0);
  const [savingPrice, setSavingPrice] = useState(false);

  // New category creation state
  const [newCatName, setNewCatName] = useState("");
  const [newCatAppliance, setNewCatAppliance] = useState("AC");
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === "admin";

  const fetchAdminData = async () => {
    if (!currentUser || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [ovRes, compRes, catRes, techRes, mlRes] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getAllComplaints(),
        adminApi.getCategories(),
        adminApi.getTechnicians(),
        mlApi.getMetrics()
      ]);
      setOverview(ovRes.data);
      setComplaints(compRes.data);
      setCategories(catRes.data);
      setTechnicians(techRes.data);
      setMetrics(mlRes.data);
    } catch {
      setError("Failed to fetch dashboard data. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [currentUser]);

  const handleSavePrice = async (categoryId: number) => {
    setSavingPrice(true);
    try {
      await adminApi.updatePrice({
        category_id: categoryId,
        min_price: editMinPrice,
        max_price: editMaxPrice
      });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? { ...c, min_price: editMinPrice, max_price: editMaxPrice }
            : c
        )
      );
      setEditingCatId(null);
    } catch {
      setError("Failed to update tariff boundaries.");
    } finally {
      setSavingPrice(false);
    }
  };

  const handleToggleTech = async (techId: number) => {
    try {
      const res = await adminApi.toggleTechStatus(techId);
      setTechnicians((prev) =>
        prev.map((t) => (t.id === techId ? { ...t, is_available: res.data.is_available } : t))
      );
    } catch {
      setError("Failed to update technician availability.");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await adminApi.createCategory({
        name: newCatName.toLowerCase().replace(/\s+/g, "_"),
        appliance_type: newCatAppliance
      });
      setShowAddCatModal(false);
      setNewCatName("");
      fetchAdminData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create category");
    }
  };

  if (!currentUser || !isAdmin) {
    return (
      <div className="max-w-[480px] mx-auto py-12">
        <div className="bg-white rounded-[16px] border border-[#E0E7FF] shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-[20px] font-semibold text-[#1E1B4B]">
            Admin Control Center
          </h2>
          <p className="text-sm text-[#6B7280]">
            Administrator credentials are required to monitor system complaints, adjust tariff bands, configure technicians, and audit AI classifier metrics.
          </p>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={onQuickLoginAdmin}
              className="w-full py-2.5 px-4 rounded-[8px] text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              Sign In as Demo Admin
            </button>
            <button
              onClick={() => onRequireAuth("admin")}
              className="w-full py-2 px-4 rounded-[8px] text-sm font-medium text-[#1E1B4B] bg-white border border-[#E0E7FF] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Enter Admin Credentials
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      c.complaint_text.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.customer_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.predicted_category.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCat =
      categoryFilter === "all" || c.predicted_category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-8">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#1E1B4B] tracking-tight">
            Administrator Dashboard
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            System overview, diagnostic database, repair tariffs, and technician fleet status.
          </p>
        </div>
        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-[8px] text-xs font-medium text-[#4F46E5] bg-white hover:bg-[#EEF2FF] border border-[#E0E7FF] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Data
        </button>
      </div>

      {/* Top Stat Cards with Colored Icon Circles (Indigo, Teal, Amber, Green) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total: Indigo Circle */}
        <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#6B7280]">Total Complaints</div>
            <div className="text-[24px] font-semibold text-[#1E1B4B] leading-tight mt-0.5">
              {overview?.total_complaints ?? complaints.length}
            </div>
          </div>
        </div>

        {/* In Progress: Teal Circle */}
        <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-teal-50 text-[#14B8A6] flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#6B7280]">In Progress</div>
            <div className="text-[24px] font-semibold text-[#3B82F6] leading-tight mt-0.5">
              {overview?.assigned_complaints ?? complaints.filter(c => c.status === "Assigned").length}
            </div>
          </div>
        </div>

        {/* Resolved: Green Circle */}
        <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#10B981] flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#6B7280]">Resolved</div>
            <div className="text-[24px] font-semibold text-[#10B981] leading-tight mt-0.5">
              {overview?.resolved_complaints ?? complaints.filter(c => c.status === "Resolved").length}
            </div>
          </div>
        </div>

        {/* Available Techs: Amber Circle */}
        <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-[#F59E0B] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#6B7280]">Online Technicians</div>
            <div className="text-[24px] font-semibold text-[#1E1B4B] leading-tight mt-0.5">
              {overview?.available_technicians ?? technicians.filter(t => t.is_available).length} / {technicians.length}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message if any */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-[8px] bg-red-50 border border-red-200 text-[#EF4444] text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#EF4444]" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E0E7FF] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("complaints")}
          className={`px-3.5 py-1.5 rounded-[8px] text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeSubTab === "complaints"
              ? "bg-[#EEF2FF] text-[#4F46E5]"
              : "text-[#6B7280] hover:text-[#1E1B4B] hover:bg-slate-50"
          }`}
        >
          All Complaints ({complaints.length})
        </button>
        <button
          onClick={() => setActiveSubTab("pricing")}
          className={`px-3.5 py-1.5 rounded-[8px] text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeSubTab === "pricing"
              ? "bg-[#EEF2FF] text-[#4F46E5]"
              : "text-[#6B7280] hover:text-[#1E1B4B] hover:bg-slate-50"
          }`}
        >
          Tariff Price Bounds ({categories.length})
        </button>
        <button
          onClick={() => setActiveSubTab("technicians")}
          className={`px-3.5 py-1.5 rounded-[8px] text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeSubTab === "technicians"
              ? "bg-[#EEF2FF] text-[#4F46E5]"
              : "text-[#6B7280] hover:text-[#1E1B4B] hover:bg-slate-50"
          }`}
        >
          Technician Fleet ({technicians.length})
        </button>
        <button
          onClick={() => setActiveSubTab("ai_metrics")}
          className={`px-3.5 py-1.5 rounded-[8px] text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeSubTab === "ai_metrics"
              ? "bg-[#EEF2FF] text-[#4F46E5]"
              : "text-[#6B7280] hover:text-[#1E1B4B] hover:bg-slate-50"
          }`}
        >
          AI Model Evaluation
        </button>
      </div>

      {/* SUB-TAB 1: ALL COMPLAINTS TABLE */}
      {activeSubTab === "complaints" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search complaint text, customer, category..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-[8px] border border-[#E0E7FF] bg-white text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-[8px] border border-[#E0E7FF] bg-white text-[#1E1B4B]"
            >
              <option value="all">All Diagnosed Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-[16px] border border-[#E0E7FF] shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F7FF] text-[#6B7280] font-medium border-b border-[#E0E7FF]">
                <tr>
                  <th className="p-3.5">ID</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Appliance</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5">AI Category</th>
                  <th className="p-3.5">Tariff</th>
                  <th className="p-3.5">Technician</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E7FF]">
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-[#6B7280]">
                      No complaints found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-medium text-[#6B7280]">#{c.id}</td>
                      <td className="p-3.5">
                        <div className="font-medium text-[#1E1B4B]">{c.customer_name}</div>
                        <div className="text-[11px] text-[#6B7280]">{c.customer_phone}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EEF2FF] text-[#4F46E5]">
                          {c.appliance_type || "AC"}
                        </span>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <div className="truncate text-[#1E1B4B]">{c.complaint_text}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="capitalize text-[#4F46E5] font-medium">
                          {c.predicted_category.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-[#1E1B4B]">{c.price_estimate}</td>
                      <td className="p-3.5">
                        {c.assigned_technician_name ? (
                          <span className="text-[#1E1B4B] font-medium">
                            {c.assigned_technician_name}
                          </span>
                        ) : (
                          <span className="text-[#6B7280] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            c.status === "Resolved"
                              ? "bg-emerald-50 text-[#10B981] border border-emerald-200"
                              : c.status === "Assigned"
                              ? "bg-blue-50 text-[#3B82F6] border border-blue-200"
                              : "bg-amber-50 text-[#F59E0B] border border-amber-200"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#6B7280] text-[11px] whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PRICING BOUNDS */}
      {activeSubTab === "pricing" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#6B7280]">
              Authorized minimum and maximum repair charge boundaries per appliance diagnostic category.
            </p>
            <button
              onClick={() => setShowAddCatModal(true)}
              className="py-1.5 px-3 rounded-[8px] text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const isEditing = editingCatId === cat.id;
              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-[16px] border border-[#E0E7FF] p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#1E1B4B] capitalize">
                      {cat.name.replace("_", " ")}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#F5F7FF] text-[#6B7280] border border-[#E0E7FF]">
                      {cat.appliance_type}
                    </span>
                  </div>

                  {!isEditing ? (
                    <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#F5F7FF] border border-[#E0E7FF]">
                      <div>
                        <div className="text-[11px] text-[#6B7280]">Tariff Range</div>
                        <div className="text-base font-semibold text-[#1E1B4B]">
                          ₹{cat.min_price} – ₹{cat.max_price}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditMinPrice(cat.min_price);
                          setEditMaxPrice(cat.max_price);
                        }}
                        className="p-1.5 rounded-[8px] text-[#6B7280] hover:text-[#4F46E5] hover:bg-white border border-transparent hover:border-[#E0E7FF] transition-colors cursor-pointer"
                        title="Edit Price"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-[8px] bg-[#EEF2FF] border border-indigo-200 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-medium text-[#6B7280]">Min Price (₹)</label>
                          <input
                            type="number"
                            value={editMinPrice}
                            onChange={(e) => setEditMinPrice(parseFloat(e.target.value) || 0)}
                            className="w-full p-1.5 text-xs rounded border border-[#E0E7FF] bg-white text-[#1E1B4B]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-[#6B7280]">Max Price (₹)</label>
                          <input
                            type="number"
                            value={editMaxPrice}
                            onChange={(e) => setEditMaxPrice(parseFloat(e.target.value) || 0)}
                            className="w-full p-1.5 text-xs rounded border border-[#E0E7FF] bg-white text-[#1E1B4B]"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingCatId(null)}
                          className="px-2.5 py-1 text-xs text-[#6B7280] hover:text-[#1E1B4B] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSavePrice(cat.id)}
                          disabled={savingPrice}
                          className="px-3 py-1 rounded-[8px] bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium cursor-pointer"
                        >
                          {savingPrice ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TECHNICIANS */}
      {activeSubTab === "technicians" && (
        <div className="space-y-4">
          <p className="text-xs text-[#6B7280]">
            Technician fleet equipped for geodesic Haversine nearest dispatch.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {technicians.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-[16px] border border-[#E0E7FF] p-5 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-[#1E1B4B]">{t.name}</h3>
                    <div className="text-xs text-[#6B7280]">{t.phone}</div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      t.is_available
                        ? "bg-emerald-50 text-[#10B981] border border-emerald-200"
                        : "bg-slate-100 text-[#6B7280] border border-[#E0E7FF]"
                    }`}
                  >
                    {t.is_available ? "Available" : "Offline"}
                  </span>
                </div>

                <div className="text-xs text-[#6B7280] space-y-1">
                  <div>Specialization: <span className="font-medium text-[#1E1B4B]">{t.specialization}</span></div>
                  <div className="flex items-center gap-1 text-[11px]">
                    <MapPin className="w-3 h-3 text-[#14B8A6]" />
                    Lat: {t.latitude.toFixed(4)}, Lon: {t.longitude.toFixed(4)}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E0E7FF]">
                  <button
                    onClick={() => handleToggleTech(t.id)}
                    className="w-full py-1.5 px-3 rounded-[8px] text-xs font-medium border border-[#E0E7FF] bg-white hover:bg-slate-50 text-[#1E1B4B] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Power className="w-3.5 h-3.5" />
                    Toggle to {t.is_available ? "Offline" : "Available"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: AI CLASSIFIER METRICS */}
      {activeSubTab === "ai_metrics" && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-5 shadow-sm">
              <div className="text-xs text-[#6B7280]">Classification Accuracy</div>
              <div className="text-[28px] font-semibold text-[#10B981] mt-1">
                {metrics.accuracy}%
              </div>
              <p className="text-xs text-[#6B7280] mt-1">
                Held-out evaluation split using Linear SVC
              </p>
            </div>
            <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-5 shadow-sm">
              <div className="text-xs text-[#6B7280]">Feature Vectorizer</div>
              <div className="text-[20px] font-semibold text-[#1E1B4B] mt-2">
                TF-IDF (Sublinear)
              </div>
              <p className="text-xs text-[#6B7280] mt-1">
                Word n-grams with stopwords filtration
              </p>
            </div>
            <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-5 shadow-sm">
              <div className="text-xs text-[#6B7280]">Dataset Size</div>
              <div className="text-[28px] font-semibold text-[#4F46E5] mt-1">
                {metrics.total_samples}
              </div>
              <p className="text-xs text-[#6B7280] mt-1">
                Labeled appliance problem descriptions
              </p>
            </div>
          </div>

          {/* Top Learned Features */}
          {metrics.top_features && (
            <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#1E1B4B]">
                Key TF-IDF Term Weights by Category
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(metrics.top_features).map(([cat, words]) => (
                  <div key={cat} className="p-3.5 rounded-[12px] bg-[#F5F7FF] border border-[#E0E7FF]">
                    <span className="font-semibold text-xs capitalize text-[#4F46E5] block mb-2">
                      {cat.replace("_", " ")}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {words.map((w, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[11px] bg-white text-[#1E1B4B] border border-[#E0E7FF]"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal for adding category */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-[16px] p-6 border border-[#E0E7FF] shadow-lg space-y-4">
            <h3 className="text-sm font-semibold text-[#1E1B4B]">
              Add New Service Category
            </h3>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[#1E1B4B]">Category Code</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. thermostat_failure"
                  className="w-full p-2 text-xs rounded-[8px] border border-[#E0E7FF] bg-white text-[#1E1B4B] mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#1E1B4B]">Appliance Type</label>
                <select
                  value={newCatAppliance}
                  onChange={(e) => setNewCatAppliance(e.target.value)}
                  className="w-full p-2 text-xs rounded-[8px] border border-[#E0E7FF] bg-white text-[#1E1B4B] mt-1"
                >
                  <option value="AC">AC</option>
                  <option value="Fridge">Fridge</option>
                  <option value="TV">TV</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  className="px-3 py-1.5 text-xs text-[#6B7280] hover:text-[#1E1B4B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-[8px] bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

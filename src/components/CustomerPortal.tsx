import React, { useState, useEffect } from "react";
import {
  Wrench,
  CheckCircle2,
  Clock,
  IndianRupee,
  Phone,
  RefreshCw,
  AlertCircle,
  Compass,
  Sparkles,
  Send,
  Wind,
  Refrigerator,
  Tv,
  Search,
  X,
  Layers,
  Activity,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { complaintApi } from "../api";
import { Complaint, ComplaintSubmissionResult, User } from "../types";

interface CustomerPortalProps {
  currentUser: User | null;
  onRequireAuth: () => void;
}

const SAMPLE_COMPLAINTS = [
  {
    label: "AC: Warm Air",
    text: "AC compressor is running but indoor unit is blowing warm humid air into the bedroom.",
    appliance: "AC"
  },
  {
    label: "AC: Water Dripping",
    text: "Water is continuously dripping and overflowing from the indoor AC tray onto the wall.",
    appliance: "AC"
  },
  {
    label: "Fridge: Not Cooling",
    text: "Refrigerator freezer has excessive frost buildup and lower fresh food compartment is warm.",
    appliance: "Fridge"
  },
  {
    label: "Fridge: Noisy Compressor",
    text: "Refrigerator compressor is making loud rattling noise and temperature is not cold.",
    appliance: "Fridge"
  },
  {
    label: "TV: Black Screen Display",
    text: "Smart TV power light turns on but screen is completely black with audio only.",
    appliance: "TV"
  },
  {
    label: "TV: Remote Unresponsive",
    text: "Television remote control sensor is dead and indoor TV does not register any button clicks.",
    appliance: "TV"
  }
];

const BANGALORE_LOCATIONS = [
  { name: "Koramangala", area: "South East", lat: 12.9352, lon: 77.6245 },
  { name: "MG Road", area: "Central", lat: 12.9716, lon: 77.5946 },
  { name: "Indiranagar", area: "East", lat: 12.9784, lon: 77.6408 },
  { name: "Jayanagar", area: "South", lat: 12.9279, lon: 77.5828 },
  { name: "Hebbal", area: "North", lat: 13.0358, lon: 77.5970 }
];

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  currentUser,
  onRequireAuth
}) => {
  const [appliance, setAppliance] = useState("AC");
  const [complaintText, setComplaintText] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(BANGALORE_LOCATIONS[0]);
  const [customLat, setCustomLat] = useState(12.9352);
  const [customLon, setCustomLon] = useState(77.6245);
  const [isUsingCustomLoc, setIsUsingCustomLoc] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [classificationPreview, setClassificationPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [result, setResult] = useState<ComplaintSubmissionResult | null>(null);
  const [history, setHistory] = useState<Complaint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search query state for filtering history by appliance type or description
  const [searchQuery, setSearchQuery] = useState("");

  const fetchHistory = async () => {
    if (!currentUser) return;
    setHistoryLoading(true);
    try {
      const res = await complaintApi.getMyComplaints();
      setHistory(res.data);
    } catch (err) {
      console.warn("Could not fetch complaint history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentUser]);

  const handleRunLivePreview = async () => {
    if (!complaintText.trim() || complaintText.length < 5) return;
    setPreviewLoading(true);
    try {
      const res = await complaintApi.classifyOnly(complaintText);
      setClassificationPreview(res.data);
    } catch (err) {
      console.warn("Live classifier preview error", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUseCurrentGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCustomLat(pos.coords.latitude);
          setCustomLon(pos.coords.longitude);
          setIsUsingCustomLoc(true);
        },
        (err) => {
          setError(`Unable to access device location: ${err.message}. Please select a preset location.`);
        }
      );
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!currentUser || !token) {
      setError("Please log in first to submit a complaint.");
      onRequireAuth();
      return;
    }

    if (!complaintText.trim() || complaintText.length < 5) {
      setError("Please describe your appliance issue in detail (at least 5 characters).");
      return;
    }

    setError(null);
    setSubmitting(true);
    setResult(null);

    const lat = isUsingCustomLoc ? customLat : selectedLocation.lat;
    const lon = isUsingCustomLoc ? customLon : selectedLocation.lon;

    try {
      const res = await complaintApi.submit({
        complaint_text: complaintText,
        appliance_type: appliance,
        customer_latitude: lat,
        customer_longitude: lon,
        auto_assign: true
      });
      setResult(res.data);
      fetchHistory();
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.data?.detail === "Authentication required") {
        setError("Please log in first. Your session may have expired.");
        onRequireAuth();
      } else {
        setError(err.response?.data?.detail || "Submission could not be completed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = history.filter((h) => h.status === "Pending").length;
  const inProgressCount = history.filter((h) => h.status === "Assigned").length;
  const resolvedCount = history.filter((h) => h.status === "Resolved").length;

  // Filter complaints by appliance type or description
  const filteredHistory = history.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const applianceMatch = (item.appliance_type || "").toLowerCase().includes(q);
    const textMatch = (item.complaint_text || "").toLowerCase().includes(q);
    const categoryMatch = (item.predicted_category || "").toLowerCase().includes(q);
    return applianceMatch || textMatch || categoryMatch;
  });

  return (
    <div className="space-y-8">
      {/* Top Header Section */}
      <div>
        <h1 className="text-[24px] font-semibold text-[#1E1B4B] tracking-tight">
          Customer Service Portal
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Submit appliance breakdown requests with instant SVM text classification and intelligent GPS technician allocation.
        </p>
      </div>

      {/* Top Row Stat Cards with Colored Icon Circles (Indigo, Teal, Amber, Green) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total: Indigo Circle */}
        <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#6B7280]">Total Requests</div>
            <div className="text-[24px] font-semibold text-[#1E1B4B] leading-tight mt-0.5">
              {history.length}
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
              {inProgressCount}
            </div>
          </div>
        </div>

        {/* Pending: Amber Circle */}
        <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-[#F59E0B] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#6B7280]">Pending</div>
            <div className="text-[24px] font-semibold text-[#F59E0B] leading-tight mt-0.5">
              {pendingCount}
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
              {resolvedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Complaint Form and History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Complaint Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-6 sm:p-8 shadow-sm">
            {/* Form Title with Small Colored Icon */}
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-[8px] bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <h2 className="text-[18px] font-semibold text-[#1E1B4B]">
                Register New Complaint
              </h2>
            </div>

            {/* Error Message in light red box with icon */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 mb-6 rounded-[8px] bg-red-50 border border-red-200 text-[#EF4444] text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#EF4444]" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmitComplaint} className="space-y-6">
              {/* 1. Appliance selector shown as 3 icon cards (AC, Refrigerator, TV) */}
              <div>
                <label className="block text-sm font-medium text-[#1E1B4B] mb-2.5">
                  Select Appliance
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAppliance("AC")}
                    className={`p-3.5 rounded-[12px] border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      appliance === "AC"
                        ? "bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5] font-semibold shadow-xs"
                        : "bg-white border-[#E0E7FF] text-[#1E1B4B] hover:border-indigo-200"
                    }`}
                  >
                    <Wind className={`w-5 h-5 ${appliance === "AC" ? "text-[#4F46E5]" : "text-[#6B7280]"}`} />
                    <span className="text-xs">Air Conditioner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppliance("Fridge")}
                    className={`p-3.5 rounded-[12px] border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      appliance === "Fridge"
                        ? "bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5] font-semibold shadow-xs"
                        : "bg-white border-[#E0E7FF] text-[#1E1B4B] hover:border-indigo-200"
                    }`}
                  >
                    <Refrigerator className={`w-5 h-5 ${appliance === "Fridge" ? "text-[#4F46E5]" : "text-[#6B7280]"}`} />
                    <span className="text-xs">Refrigerator</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppliance("TV")}
                    className={`p-3.5 rounded-[12px] border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      appliance === "TV"
                        ? "bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5] font-semibold shadow-xs"
                        : "bg-white border-[#E0E7FF] text-[#1E1B4B] hover:border-indigo-200"
                    }`}
                  >
                    <Tv className={`w-5 h-5 ${appliance === "TV" ? "text-[#4F46E5]" : "text-[#6B7280]"}`} />
                    <span className="text-xs">Television</span>
                  </button>
                </div>
              </div>

              {/* 2. Complaint description */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[#1E1B4B]">
                    Complaint Description
                  </label>
                  <button
                    type="button"
                    onClick={handleRunLivePreview}
                    disabled={previewLoading || complaintText.length < 5}
                    className="text-xs text-[#4F46E5] hover:text-[#4338CA] font-medium flex items-center gap-1 disabled:opacity-40 focus:outline-none cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#14B8A6]" />
                    {previewLoading ? "Testing..." : "Test AI Model"}
                  </button>
                </div>
                <textarea
                  required
                  rows={4}
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  placeholder="Describe what's wrong with your appliance in plain English (e.g. AC compressor humming loudly and blowing only hot air)..."
                  className="w-full p-3.5 text-sm rounded-[8px] border border-[#E0E7FF] bg-white text-[#1E1B4B] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-colors"
                />

                {/* Common Issue Helper Chips */}
                <div className="mt-2.5">
                  <div className="text-xs text-[#6B7280] mb-1.5">Common sample issues:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_COMPLAINTS.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setComplaintText(sample.text);
                          setAppliance(sample.appliance);
                        }}
                        className="px-2.5 py-1 text-xs rounded-[8px] bg-slate-50 hover:bg-[#EEF2FF] text-[#6B7280] hover:text-[#4F46E5] border border-[#E0E7FF] transition-colors text-left cursor-pointer"
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Model Classification Preview */}
                {classificationPreview && (
                  <div className="mt-3 p-3.5 rounded-[8px] bg-[#EEF2FF] border border-indigo-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#1E1B4B]">SVM Predicted Category:</span>
                      <span className="font-semibold text-[#4F46E5] capitalize">
                        {classificationPreview.predicted_category.replace("_", " ")} ({(classificationPreview.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="text-[#6B7280] mt-1">
                      Estimated Repair Tariff: <span className="font-semibold text-[#1E1B4B]">{classificationPreview.price_estimate}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Location options (Selected gets indigo border and light indigo bg #EEF2FF) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[#1E1B4B]">
                    Service Location
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentGPS}
                    className="text-xs text-[#4F46E5] hover:text-[#4338CA] font-medium flex items-center gap-1 focus:outline-none cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-[#14B8A6]" />
                    Use Device GPS
                  </button>
                </div>

                {!isUsingCustomLoc ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {BANGALORE_LOCATIONS.map((loc) => {
                      const isSelected = selectedLocation.name === loc.name;
                      return (
                        <button
                          key={loc.name}
                          type="button"
                          onClick={() => setSelectedLocation(loc)}
                          className={`p-3 rounded-[12px] text-left transition-all border cursor-pointer ${
                            isSelected
                              ? "bg-[#EEF2FF] border-[#4F46E5] text-[#1E1B4B] shadow-xs"
                              : "bg-white border-[#E0E7FF] text-[#1E1B4B] hover:border-indigo-200"
                          }`}
                        >
                          <div className="font-medium text-sm text-[#1E1B4B]">{loc.name}</div>
                          <div className="text-xs text-[#6B7280] mt-0.5">
                            {loc.area} ({loc.lat.toFixed(2)}, {loc.lon.toFixed(2)})
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-[12px] bg-[#EEF2FF] border border-[#4F46E5] flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-[#1E1B4B]">Device GPS Coordinates</div>
                      <div className="text-xs text-[#6B7280]">
                        Lat: {customLat.toFixed(4)}, Lon: {customLon.toFixed(4)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsUsingCustomLoc(false)}
                      className="text-xs font-medium text-[#4F46E5] hover:underline"
                    >
                      Use preset areas
                    </button>
                  </div>
                )}
              </div>

              {/* 4. One full-width primary "Submit Complaint" button */}
              <div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-[8px] bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Classifying & Allocating Nearest Technician...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Complaint
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Active Result Screen & Searchable Complaint History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Result Card if submitted */}
          {result && (
            <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E0E7FF]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                  <span className="font-semibold text-sm text-[#1E1B4B]">
                    Complaint #{result.complaint_id} Created
                  </span>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-[#10B981] border border-emerald-200">
                  {result.status}
                </span>
              </div>

              {/* Diagnosis info */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-[#6B7280]">AI Diagnosis</div>
                <div className="text-base font-semibold text-[#1E1B4B] capitalize">
                  {result.category_title || result.predicted_category.replace("_", " ")}
                </div>
                <div className="text-xs text-[#6B7280]">
                  Confidence: {(result.confidence * 100).toFixed(1)}%
                </div>
              </div>

              {/* Tariff Estimate */}
              <div className="p-3.5 rounded-[8px] bg-slate-50 border border-[#E0E7FF]">
                <div className="text-xs text-[#6B7280] flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-[#6B7280]" />
                  Authorized Repair Tariff
                </div>
                <div className="text-xl font-semibold text-[#1E1B4B] mt-1">
                  {result.price_estimate}
                </div>
              </div>

              {/* Assigned Technician */}
              {result.assigned_technician ? (
                <div className="p-4 rounded-[8px] bg-[#EEF2FF] border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#4F46E5]">Allocated Technician</span>
                    <span className="text-xs font-semibold text-[#4F46E5]">
                      {result.assigned_technician.distance_km} km away
                    </span>
                  </div>
                  <div className="font-medium text-sm text-[#1E1B4B]">
                    {result.assigned_technician.name}
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    Specialization: {result.assigned_technician.specialization}
                  </div>
                  {result.assigned_technician.phone && (
                    <div className="pt-2">
                      <a
                        href={`tel:${result.assigned_technician.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call {result.assigned_technician.phone}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-[8px] bg-amber-50 border border-amber-200 text-xs text-[#F59E0B]">
                  Assigned to Support Desk ({result.customer_care?.center_name || "Central Helpdesk"}). A technician will be scheduled soon.
                </div>
              )}
            </div>
          )}

          {/* Customer Complaint History Card with SEARCH BAR */}
          <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1E1B4B] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#4F46E5]" />
                Complaint History ({history.length})
              </h3>
              <button
                onClick={fetchHistory}
                disabled={historyLoading}
                className="text-xs text-[#4F46E5] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${historyLoading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            {/* Search Bar: Allows filtering complaints by appliance type or description */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by appliance (AC, Fridge, TV) or description..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-[8px] border border-[#E0E7FF] bg-[#F5F7FF] text-[#1E1B4B] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-[#6B7280] hover:text-[#1E1B4B]"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtered List */}
            {history.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#6B7280]">
                No complaints registered yet. Submit your first request using the form.
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#6B7280] space-y-1">
                <p>No complaints match "{searchQuery}".</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-[#4F46E5] underline text-xs cursor-pointer"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-[12px] border border-[#E0E7FF] bg-white hover:bg-slate-50/60 transition-colors text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EEF2FF] text-[#4F46E5]">
                          {item.appliance_type || "AC"}
                        </span>
                        <span className="font-medium text-[#1E1B4B] capitalize">
                          {item.predicted_category.replace("_", " ")}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          item.status === "Resolved"
                            ? "bg-emerald-50 text-[#10B981] border border-emerald-200"
                            : item.status === "Assigned"
                            ? "bg-blue-50 text-[#3B82F6] border border-blue-200"
                            : "bg-amber-50 text-[#F59E0B] border border-amber-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="text-[#6B7280] line-clamp-2">
                      {item.complaint_text}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-[#E0E7FF] text-[11px] text-[#6B7280]">
                      <span>Tariff: <strong className="text-[#1E1B4B]">{item.price_estimate}</strong></span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

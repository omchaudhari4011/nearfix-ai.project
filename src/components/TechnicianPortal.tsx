import React, { useState, useEffect } from "react";
import {
  HardHat,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  Power,
  RefreshCw,
  AlertCircle,
  IndianRupee,
  UserCheck,
  Layers,
  Activity,
  CheckCircle2
} from "lucide-react";
import { technicianApi } from "../api";
import { Complaint, User } from "../types";

interface TechnicianPortalProps {
  currentUser: User | null;
  onRequireAuth: (defaultRole?: "technician") => void;
  onQuickLoginTechnician: () => void;
}

export const TechnicianPortal: React.FC<TechnicianPortalProps> = ({
  currentUser,
  onRequireAuth,
  onQuickLoginTechnician
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTechnician = currentUser?.role === "technician";

  const fetchTechnicianJobs = async () => {
    if (!currentUser || !isTechnician) return;
    setLoading(true);
    setError(null);
    try {
      const res = await technicianApi.getJobs();
      setProfile(res.data.technician_profile);
      setJobs(res.data.jobs);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not fetch assigned field tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isTechnician) {
      fetchTechnicianJobs();
    }
  }, [currentUser]);

  const handleToggleAvailability = async () => {
    if (!profile) return;
    setTogglingAvailability(true);
    try {
      const nextState = !profile.is_available;
      await technicianApi.updateProfile({ is_available: nextState });
      setProfile((prev: any) => ({ ...prev, is_available: nextState }));
    } catch {
      setError("Failed to update availability status. Please try again.");
    } finally {
      setTogglingAvailability(false);
    }
  };

  const handleMarkComplete = async (jobId: number) => {
    setCompletingId(jobId);
    try {
      await technicianApi.completeJob(jobId);
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: "Resolved" } : j))
      );
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to mark job as complete.");
    } finally {
      setCompletingId(null);
    }
  };

  if (!currentUser || !isTechnician) {
    return (
      <div className="max-w-[480px] mx-auto py-12">
        <div className="bg-white rounded-[16px] border border-[#E0E7FF] shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mx-auto">
            <HardHat className="w-6 h-6" />
          </div>
          <h2 className="text-[20px] font-semibold text-[#1E1B4B]">
            Technician Field Console
          </h2>
          <p className="text-sm text-[#6B7280]">
            Sign in with a technician profile to inspect assigned nearby complaints, review appliance diagnosis, and mark fixes complete.
          </p>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={onQuickLoginTechnician}
              className="w-full py-2.5 px-4 rounded-[8px] text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              Sign In as Demo Technician (Suresh Kumar)
            </button>
            <button
              onClick={() => onRequireAuth("technician")}
              className="w-full py-2 px-4 rounded-[8px] text-sm font-medium text-[#1E1B4B] bg-white border border-[#E0E7FF] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Custom Technician Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeJobs = jobs.filter((j) => j.status !== "Resolved");
  const completedJobs = jobs.filter((j) => j.status === "Resolved");

  return (
    <div className="space-y-8">
      {/* Profile & Availability Card */}
      <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[24px] font-semibold text-[#1E1B4B] tracking-tight">
              {currentUser.name}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#4F46E5] border border-indigo-200">
              Verified Specialist
            </span>
          </div>
          <p className="text-sm text-[#6B7280] mt-1">
            Specialization: <span className="text-[#1E1B4B] font-medium">{profile?.specialization || "AC Specialist"}</span> • {currentUser.email}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mt-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#14B8A6]" />
            Base Coordinates: {profile?.latitude?.toFixed(4)}, {profile?.longitude?.toFixed(4)} (Bangalore)
          </div>
        </div>

        {/* Availability Switch */}
        <div className="flex items-center gap-4 bg-[#F5F7FF] p-3 rounded-[12px] border border-[#E0E7FF]">
          <div>
            <div className="text-xs font-medium text-[#1E1B4B]">Field Dispatch Status</div>
            <div className="text-xs text-[#6B7280]">
              {profile?.is_available ? "Ready for nearby dispatch" : "Paused / Offline"}
            </div>
          </div>
          <button
            onClick={handleToggleAvailability}
            disabled={togglingAvailability}
            className={`px-3.5 py-1.5 rounded-[8px] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              profile?.is_available
                ? "bg-[#10B981] hover:bg-emerald-700 text-white shadow-xs"
                : "bg-slate-200 hover:bg-slate-300 text-[#1E1B4B]"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {profile?.is_available ? "Online" : "Offline"}
          </button>
        </div>
      </div>

      {/* Top Stat Cards with Colored Icon Circles (Indigo, Teal, Amber, Green) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total: Indigo Circle */}
        <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#6B7280]">Total Assigned</div>
            <div className="text-[24px] font-semibold text-[#1E1B4B] leading-tight mt-0.5">
              {jobs.length}
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
              {activeJobs.length}
            </div>
          </div>
        </div>

        {/* Pending: Amber Circle */}
        <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-[#F59E0B] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#6B7280]">Pending Jobs</div>
            <div className="text-[24px] font-semibold text-[#F59E0B] leading-tight mt-0.5">
              {activeJobs.filter(j => j.status === "Pending").length}
            </div>
          </div>
        </div>

        {/* Resolved: Green Circle */}
        <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#10B981] flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#6B7280]">Completed</div>
            <div className="text-[24px] font-semibold text-[#10B981] leading-tight mt-0.5">
              {completedJobs.length}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-[8px] bg-red-50 border border-red-200 text-[#EF4444] text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#EF4444]" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Active Jobs Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-[#1E1B4B] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#4F46E5]" />
            Assigned Field Jobs ({activeJobs.length})
          </h2>
          <button
            onClick={fetchTechnicianJobs}
            disabled={loading}
            className="text-xs text-[#4F46E5] hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Queue
          </button>
        </div>

        {activeJobs.length === 0 ? (
          <div className="bg-white rounded-[16px] border border-[#E0E7FF] p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
            <div className="text-sm font-medium text-[#1E1B4B]">Queue is clear</div>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              All assigned complaints are currently resolved. Stay online to receive incoming nearby customer tickets.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-[16px] border border-[#E0E7FF] p-5 shadow-sm space-y-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-[#4F46E5]">
                      Ticket #{job.id} • {job.predicted_category.replace("_", " ")}
                    </span>
                    <div className="text-sm font-semibold text-[#1E1B4B] mt-0.5">
                      Customer: {job.customer_name}
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-[#3B82F6] border border-blue-200">
                    {job.status}
                  </span>
                </div>

                <div className="p-3 rounded-[8px] bg-[#F5F7FF] border border-[#E0E7FF] text-xs text-[#1E1B4B]">
                  <div className="text-xs text-[#6B7280] mb-1">Issue Details:</div>
                  "{job.complaint_text}"
                </div>

                <div className="flex items-center justify-between text-xs text-[#6B7280]">
                  <div className="flex items-center gap-1 font-medium text-[#1E1B4B]">
                    <IndianRupee className="w-3.5 h-3.5 text-[#6B7280]" />
                    Tariff: {job.price_estimate}
                  </div>
                  <span>{new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#E0E7FF]">
                  <a
                    href={`tel:${job.customer_phone}`}
                    className="flex-1 py-2 px-3 rounded-[8px] text-xs font-medium bg-white border border-[#E0E7FF] hover:bg-slate-50 text-[#1E1B4B] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#14B8A6]" />
                    Call ({job.customer_phone})
                  </a>
                  <button
                    onClick={() => handleMarkComplete(job.id)}
                    disabled={completingId === job.id}
                    className="flex-1 py-2 px-3 rounded-[8px] text-xs font-medium text-white bg-[#10B981] hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {completingId === job.id ? "Updating..." : "Mark Complete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Archive */}
      {completedJobs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-[18px] font-semibold text-[#1E1B4B] flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#10B981]" />
            Resolved History ({completedJobs.length})
          </h2>
          <div className="bg-white rounded-[16px] border border-[#E0E7FF] divide-y divide-[#E0E7FF] shadow-sm">
            {completedJobs.map((cj) => (
              <div
                key={cj.id}
                className="p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-semibold text-[#1E1B4B]">
                    Ticket #{cj.id} — {cj.customer_name}
                  </span>
                  <span className="text-[#6B7280] ml-2">
                    ({cj.predicted_category.replace("_", " ")})
                  </span>
                  <p className="text-[#6B7280] line-clamp-1 mt-0.5">
                    "{cj.complaint_text}"
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-[#10B981] border border-emerald-200">
                    Resolved
                  </span>
                  <span className="text-[#6B7280] text-[11px]">
                    {new Date(cj.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

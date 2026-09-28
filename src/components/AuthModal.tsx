import React, { useState } from "react";
import { X, Lock, Mail, User as UserIcon, Phone, AlertCircle, Wrench, ShieldCheck, HardHat } from "lucide-react";
import { authApi } from "../api";
import { User } from "../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User, token: string) => void;
  defaultRole?: "customer" | "technician" | "admin";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultRole = "customer"
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<"customer" | "technician">(
    defaultRole === "technician" ? "technician" : "customer"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("AC Specialist");
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await authApi.login({ email, password });
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        onSuccess(res.data.user, res.data.access_token);
        onClose();
      } else {
        const payload: any = {
          name,
          email,
          password,
          role,
          phone
        };
        if (role === "technician") {
          payload.specialization = specialization;
          payload.latitude = Number(latitude);
          payload.longitude = Number(longitude);
        }
        const res = await authApi.register(payload);
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        onSuccess(res.data.user, res.data.access_token);
        onClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Authentication failed. Please verify your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string, quickPass: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login({ email: quickEmail, password: quickPass });
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onSuccess(res.data.user, res.data.access_token);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Quick login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-[440px] bg-white rounded-[16px] border border-[#E0E7FF] shadow-xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-[8px] text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Gradient Header with App Name and Tagline */}
        <div
          style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
          className="p-6 text-white text-center"
        >
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-[12px] bg-white/20 text-white mb-2 shadow-xs">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-[20px] font-semibold tracking-tight text-white">
            NearFix AI
          </h2>
          <p className="text-xs text-white/85 mt-1 font-normal">
            Nearest technician, fastest fix.
          </p>
        </div>

        {/* White Card Body on Light Side */}
        <div className="p-6 sm:p-7">
          {/* Quick Demo Credentials */}
          <div className="mb-5 p-3 rounded-[12px] bg-[#F5F7FF] border border-[#E0E7FF]">
            <div className="text-[11px] font-medium text-[#6B7280] text-center mb-2">
              One-Click Demo Profiles
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin("customer@test.com", "customer123")}
                className="py-1.5 px-2 rounded-[8px] text-xs font-medium bg-white hover:bg-[#EEF2FF] hover:text-[#4F46E5] text-[#1E1B4B] border border-[#E0E7FF] transition-colors cursor-pointer"
              >
                Customer
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin("tech.suresh@repair.com", "tech123")}
                className="py-1.5 px-2 rounded-[8px] text-xs font-medium bg-white hover:bg-[#EEF2FF] hover:text-[#4F46E5] text-[#1E1B4B] border border-[#E0E7FF] transition-colors cursor-pointer"
              >
                Technician
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin("admin@repair.com", "admin123")}
                className="py-1.5 px-2 rounded-[8px] text-xs font-medium bg-white hover:bg-[#EEF2FF] hover:text-[#4F46E5] text-[#1E1B4B] border border-[#E0E7FF] transition-colors cursor-pointer"
              >
                Admin
              </button>
            </div>
          </div>

          {/* Sign In vs Register Tabs */}
          <div className="flex border-b border-[#E0E7FF] mb-5">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 pb-2.5 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                isLogin
                  ? "border-[#4F46E5] text-[#4F46E5]"
                  : "border-transparent text-[#6B7280] hover:text-[#1E1B4B]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 pb-2.5 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                !isLogin
                  ? "border-[#4F46E5] text-[#4F46E5]"
                  : "border-transparent text-[#6B7280] hover:text-[#1E1B4B]"
              }`}
            >
              Register
            </button>
          </div>

          {/* Friendly Error Box with Icon */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 mb-4 rounded-[8px] bg-red-50 border border-red-200 text-[#EF4444] text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#EF4444]" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#1E1B4B] mb-1.5">
                    Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("customer")}
                      className={`py-2 px-3 rounded-[8px] text-xs font-medium border text-center transition-colors cursor-pointer ${
                        role === "customer"
                          ? "bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5]"
                          : "bg-white border-[#E0E7FF] text-[#6B7280] hover:bg-slate-50"
                      }`}
                    >
                      Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("technician")}
                      className={`py-2 px-3 rounded-[8px] text-xs font-medium border text-center transition-colors cursor-pointer ${
                        role === "technician"
                          ? "bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5]"
                          : "bg-white border-[#E0E7FF] text-[#6B7280] hover:bg-slate-50"
                      }`}
                    >
                      Technician
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1E1B4B] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 text-sm rounded-[8px] border border-[#E0E7FF] bg-white text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1E1B4B] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 text-sm rounded-[8px] border border-[#E0E7FF] bg-white text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                  />
                </div>

                {role === "technician" && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-[#1E1B4B] mb-1">
                        Appliance Specialization
                      </label>
                      <input
                        type="text"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="e.g. AC Inverter & Gas Refill"
                        className="w-full px-3 py-2 text-sm rounded-[8px] border border-[#E0E7FF] bg-white text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-[#6B7280] mb-1">Latitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={latitude}
                          onChange={(e) => setLatitude(parseFloat(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs rounded-[8px] border border-[#E0E7FF] bg-white text-[#1E1B4B]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B7280] mb-1">Longitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={longitude}
                          onChange={(e) => setLongitude(parseFloat(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs rounded-[8px] border border-[#E0E7FF] bg-white text-[#1E1B4B]"
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-[#1E1B4B] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 text-sm rounded-[8px] border border-[#E0E7FF] bg-white text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1E1B4B] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm rounded-[8px] border border-[#E0E7FF] bg-white text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-2.5 px-4 rounded-[8px] text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

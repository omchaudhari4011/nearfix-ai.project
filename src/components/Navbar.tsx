import React from "react";
import {
  Wrench,
  User as UserIcon,
  ShieldCheck,
  HardHat,
  LogOut,
  Sparkles,
  BookOpen
} from "lucide-react";
import { User } from "../types";

interface NavbarProps {
  currentUser: User | null;
  activeTab: "customer" | "technician" | "admin";
  onTabChange: (tab: "customer" | "technician" | "admin") => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenModelStats: () => void;
  onQuickLogin: (role: "customer" | "technician" | "admin") => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  onOpenAuth,
  onLogout,
  onOpenModelStats,
}) => {
  return (
    <header
      style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
      className="sticky top-0 z-40 text-white shadow-md"
    >
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* App Name and Small Icon on the Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange("customer")}
              className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer"
            >
              <div className="w-8 h-8 rounded-[8px] bg-white/20 flex items-center justify-center text-white backdrop-blur-xs shadow-xs">
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[18px] font-semibold text-white tracking-tight leading-tight">
                  NearFix AI
                </span>
                <span className="text-[11px] text-white/80 hidden sm:inline-block leading-tight">
                  Nearest technician, fastest fix
                </span>
              </div>
            </button>
          </div>

          {/* Menu Items and User/Logout on Right (All White Text) */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 mr-1">
              <button
                onClick={() => onTabChange("customer")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${
                  activeTab === "customer"
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-white/85 hover:text-white hover:bg-white/10"
                }`}
              >
                <UserIcon className="w-4 h-4" />
                Customer
              </button>
              <button
                onClick={() => onTabChange("technician")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${
                  activeTab === "technician"
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-white/85 hover:text-white hover:bg-white/10"
                }`}
              >
                <HardHat className="w-4 h-4" />
                Technician
              </button>
              <button
                onClick={() => onTabChange("admin")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${
                  activeTab === "admin"
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-white/85 hover:text-white hover:bg-white/10"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Dashboard
              </button>
            </nav>

            {/* AI Model Metrics Button */}
            <button
              onClick={onOpenModelStats}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs sm:text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
              title="View SVM & TF-IDF Evaluation Metrics"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span className="hidden sm:inline">AI</span> Metrics
            </button>

            {/* API Link */}
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs sm:text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
              title="Interactive API Documentation"
            >
              <BookOpen className="w-3.5 h-3.5" />
              API
            </a>

            {/* User State & Logout */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-white/20 ml-1">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-white/80 capitalize">
                    {currentUser.role}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-[8px] text-white/80 hover:text-white hover:bg-white/15 transition-colors"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 rounded-[8px] text-sm font-medium bg-white text-[#4F46E5] hover:bg-white/90 transition-colors shadow-sm ml-1"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Sub-Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-white/15 text-xs">
          <button
            onClick={() => onTabChange("customer")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-medium transition-colors ${
              activeTab === "customer"
                ? "bg-white/25 text-white"
                : "text-white/80"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            Customer
          </button>
          <button
            onClick={() => onTabChange("technician")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-medium transition-colors ${
              activeTab === "technician"
                ? "bg-white/25 text-white"
                : "text-white/80"
            }`}
          >
            <HardHat className="w-3.5 h-3.5" />
            Technician
          </button>
          <button
            onClick={() => onTabChange("admin")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-medium transition-colors ${
              activeTab === "admin"
                ? "bg-white/25 text-white"
                : "text-white/80"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Dashboard
          </button>
        </div>
      </div>
    </header>
  );
};

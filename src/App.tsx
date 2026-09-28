import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { CustomerPortal } from "./components/CustomerPortal";
import { TechnicianPortal } from "./components/TechnicianPortal";
import { AdminPortal } from "./components/AdminPortal";
import { AuthModal } from "./components/AuthModal";
import { ModelEvaluationModal } from "./components/ModelEvaluationModal";
import { User, MLMetrics } from "./types";
import { authApi, mlApi } from "./api";

export default function App() {
  const [activeTab, setActiveTab] = useState<"customer" | "technician" | "admin">("customer");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState<"customer" | "technician" | "admin">("customer");
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [metrics, setMetrics] = useState<MLMetrics | null>(null);

  // Restore stored session on mount and verify token with server
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    if (savedUser && savedToken && savedToken !== "null" && savedToken !== "undefined") {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        authApi.getMe()
          .then((res) => {
            setCurrentUser(res.data);
            localStorage.setItem("user", JSON.stringify(res.data));
          })
          .catch(() => {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            handleQuickLogin("customer");
          });
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        handleQuickLogin("customer");
      }
    } else {
      handleQuickLogin("customer");
    }

    mlApi.getMetrics()
      .then((res) => setMetrics(res.data))
      .catch((err) => console.warn("Could not load ML metrics", err));
  }, []);

  const handleQuickLogin = async (role: "customer" | "technician" | "admin") => {
    let email = "customer@test.com";
    let pass = "customer123";

    if (role === "technician") {
      email = "tech.suresh@repair.com";
      pass = "tech123";
    } else if (role === "admin") {
      email = "admin@repair.com";
      pass = "admin123";
    }

    try {
      const res = await authApi.login({ email, password: pass });
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setCurrentUser(res.data.user);
      setActiveTab(role);
    } catch (err) {
      console.warn("Auto demo login error", err);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentUser(null);
  };

  const openAuthWithRole = (role: "customer" | "technician" | "admin" = "customer") => {
    setAuthDefaultRole(role);
    setIsAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FF] text-[#1E1B4B] flex flex-col font-sans">
      {/* Top Navigation Bar with Gradient */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAuth={() => openAuthWithRole("customer")}
        onLogout={handleLogout}
        onOpenModelStats={() => setIsModelModalOpen(true)}
        onQuickLogin={handleQuickLogin}
      />

      {/* Main Content Area - Max width 1100px and generous spacing */}
      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === "customer" && (
          <CustomerPortal
            currentUser={currentUser}
            onRequireAuth={() => openAuthWithRole("customer")}
          />
        )}

        {activeTab === "technician" && (
          <TechnicianPortal
            currentUser={currentUser}
            onRequireAuth={(role) => openAuthWithRole(role || "technician")}
            onQuickLoginTechnician={() => handleQuickLogin("technician")}
          />
        )}

        {activeTab === "admin" && (
          <AdminPortal
            currentUser={currentUser}
            onRequireAuth={(role) => openAuthWithRole(role || "admin")}
            onQuickLoginAdmin={() => handleQuickLogin("admin")}
          />
        )}
      </main>

      {/* Footer: light, one line of small gray text */}
      <footer className="py-6 text-center text-xs text-[#6B7280] border-t border-[#E0E7FF] bg-white">
        NearFix AI • Nearest technician, fastest fix.
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultRole={authDefaultRole}
        onSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === "technician") setActiveTab("technician");
          else if (user.role === "admin") setActiveTab("admin");
          else setActiveTab("customer");
        }}
      />

      <ModelEvaluationModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        metrics={metrics}
      />
    </div>
  );
}

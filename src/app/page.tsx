"use client";

import { useState, useEffect } from "react";
import type { AuthUser, DashboardStats, Lead, Pipeline } from "@/types";
import { AuthGate } from "@/components/auth/AuthGate";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { LeadsView } from "@/components/leads/LeadsView";
import { PipelinesView } from "@/components/pipelines/PipelinesView";
import { UsersView } from "@/components/users/UsersView";
import { ProfileModal } from "@/components/profile/ProfileModal";

export type ActiveTab = "Dashboard" | "Leads" | "Pipelines" | "Users";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  // Real data state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  // Check session on mount
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setUser(res.data);
      })
      .catch(() => {
        // Network failure — leave user as null, show auth gate
      })
      .finally(() => setSessionLoading(false));
  }, []);

  // Load data once authenticated
  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [user]);

  async function fetchAll() {
    const [statsRes, leadsRes, pipelinesRes] = await Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/leads").then((r) => r.json()),
      fetch("/api/pipelines").then((r) => r.json()),
    ]);
    if (statsRes.data) setStats(statsRes.data);
    if (leadsRes.data) setLeads(leadsRes.data);
    if (pipelinesRes.data) setPipelines(pipelinesRes.data);
  }

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setStats(null);
    setLeads([]);
    setPipelines([]);
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-crm-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 premium-gradient rounded-2xl flex items-center justify-center text-white font-black text-xl animate-pulse">B</div>
          <p className="text-crm-text-sub text-sm font-semibold">Loading Bitzsol CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-crm-bg text-crm-text-main font-sans relative">
      {/* Auth gate overlays the blurred dashboard when not logged in */}
      {!user && (
        <AuthGate onAuth={(u) => { setUser(u); fetchAll(); }} />
      )}

      <div className={`flex min-h-screen transition-all duration-500 ${!user ? "filter blur-[6px] pointer-events-none select-none opacity-40" : ""}`}>
        <Sidebar
          user={user}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSignOut={handleSignOut}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
          <DashboardHeader
            user={user}
            onMenuOpen={() => setSidebarOpen(true)}
            activeTab={activeTab}
            onSignOut={handleSignOut}
            onOpenProfileSettings={() => setShowProfileSettings(true)}
          />

          <main className="flex-1 p-4 sm:p-6">
            {activeTab === "Dashboard" && (
              <DashboardView
                user={user}
                stats={stats}
                leads={leads}
                pipelines={pipelines}
                onLeadCreated={() => fetchAll()}
              />
            )}
            {activeTab === "Leads" && (
              <LeadsView
                user={user}
                leads={leads}
                pipelines={pipelines}
                onRefresh={() => fetchAll()}
              />
            )}
            {activeTab === "Pipelines" && (
              <PipelinesView
                user={user}
                pipelines={pipelines}
                onRefresh={() => fetchAll()}
              />
            )}
            {activeTab === "Users" && user?.role === "admin" && (
              <UsersView />
            )}
          </main>

          <footer className="py-4 sm:py-5 px-4 sm:px-6 text-center border-t border-crm-border text-xs text-crm-text-sub">
            Copyright © {new Date().getFullYear()}{" "}
            <span className="text-crm-text-main font-bold">Bitzsol.com</span>. All rights reserved.
          </footer>
        </div>
      </div>

      {showProfileSettings && user && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfileSettings(false)}
          onSaved={(updatedUser) => {
            setUser(updatedUser);
            setShowProfileSettings(false);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

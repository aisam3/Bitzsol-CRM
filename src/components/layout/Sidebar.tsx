"use client";

import { LayoutDashboard, Layers, Users, FileText, Settings, LogOut, X } from "lucide-react";
import Image from "next/image";
import type { AuthUser } from "@/types";
import type { ActiveTab } from "@/app/page";

const NAV_ITEMS: { label: ActiveTab; icon: React.ElementType; adminOnly?: boolean }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Leads", icon: FileText },
  { label: "Pipelines", icon: Layers },
  { label: "Users", icon: Users, adminOnly: true },
];

interface Props {
  user: AuthUser | null;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onSignOut: () => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ user, activeTab, onTabChange, onSignOut, open, onClose }: Props) {
  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onClose} />}

      <aside className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-crm-panel border-r border-crm-border flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 h-20 border-b border-crm-border">
          <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center shadow-sm">
            <img src="/logo.png" alt="Bitzsol Logo" className="w-6 h-6 object-contain brightness-0 invert" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight text-crm-text-main">Bitzsol</p>
          </div>
          <button onClick={onClose} className="md:hidden ml-auto text-crm-text-sub hover:text-crm-text-main"><X className="w-5 h-5" /></button>
        </div>



        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <p className="text-xs font-bold text-crm-text-sub uppercase tracking-widest px-3 mb-3">Manage Listings</p>
          {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin").map(({ label, icon: Icon }) => {
            const active = activeTab === label;
            return (
              <button
                key={label}
                onClick={() => { onTabChange(label); onClose(); }}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${active ? "bg-crm-panel-hover text-[#0164DA] border-l-4 border-[#0164DA] pl-4" : "text-crm-text-sub hover:bg-crm-panel-hover hover:text-crm-text-main"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-crm-border">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

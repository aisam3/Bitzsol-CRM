"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Users, FileText, Layers, Plus, Award } from "lucide-react";
import type { AuthUser, DashboardStats, Lead, Pipeline } from "@/types";
import { LeadModal } from "@/components/leads/LeadModal";

interface Props {
  user: AuthUser | null;
  stats: DashboardStats | null;
  leads: Lead[];
  pipelines: Pipeline[];
  onLeadCreated: () => void;
}

export function DashboardView({ user, stats, leads, pipelines, onLeadCreated }: Props) {
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("month");

  const leadsCount =
    timeframe === "week" ? stats?.leadsThisWeek
    : timeframe === "month" ? stats?.leadsThisMonth
    : stats?.leadsThisYear;

  const recentLeads = leads.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-crm-text-sub text-sm">
            Welcome back, <span className="text-crm-text-main font-bold">{user?.name}</span>
          </p>
          <p className="text-xs text-crm-text-sub mt-0.5">
            {user?.role === "admin" ? "Viewing global CRM statistics" : "Viewing your personal statistics"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Timeframe switcher */}
          <div className="flex bg-crm-panel border border-crm-border rounded-xl p-1">
            {(["week", "month", "year"] as const).map((t) => (
              <button key={t} onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer ${timeframe === t ? "bg-[#0164DA] text-white" : "text-crm-text-sub hover:text-crm-text-main"}`}>
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCreateLead(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0164DA] to-[#FB66BC] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-[#0164DA]/20"
          >
            <Plus className="w-3.5 h-3.5" /> Add Lead
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Total Leads"
          value={stats?.totalLeads ?? 0}
          icon={FileText}
          color="#0164DA"
          trend={stats && stats.totalLeads > 0 ? "up" : undefined}
        />
        <StatCard
          label={`Leads this ${timeframe}`}
          value={leadsCount ?? 0}
          icon={TrendingUp}
          color="#03D9AF"
          trend={leadsCount && leadsCount > 0 ? "up" : undefined}
        />
        <StatCard
          label="Pipelines"
          value={pipelines.length}
          icon={Layers}
          color="#FB66BC"
        />
        <StatCard
          label="Leads by Status"
          value={stats?.leadsByStatus.length ?? 0}
          icon={Users}
          color="#F59E0B"
          subtitle="active statuses"
        />
      </div>

      {/* Leads by Status breakdown */}
      {stats && stats.leadsByStatus.length > 0 && (
        <div className="bg-crm-panel border border-crm-border p-6 rounded-3xl shadow-sm">
          <h3 className="text-base font-bold mb-5 text-crm-text-main">Leads by Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {stats.leadsByStatus.map((s) => (
              <div key={s.status} className="bg-crm-panel-hover rounded-2xl p-4 border border-crm-border">
                <p className="text-xs text-crm-text-sub truncate mb-1">{s.status}</p>
                <p className="text-2xl font-black text-crm-text-main">{s._count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Leads table */}
      <div className="bg-crm-panel border border-crm-border p-6 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-crm-text-main">Recent Leads</h3>
          <span className="text-xs text-crm-text-sub">{leads.length} total</span>
        </div>
        {recentLeads.length === 0 ? (
          <EmptyState
            message={user?.role === "business_developer" ? "You haven't created any leads yet." : "No leads in the system yet."}
            action="Add your first lead using the button above."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-crm-border text-[10px] font-bold text-crm-text-sub uppercase tracking-widest">
                  <th className="pb-3 text-left">Name</th>
                  <th className="pb-3 text-left hidden sm:table-cell">Pipeline</th>
                  <th className="pb-3 text-left hidden md:table-cell">Source</th>
                  <th className="pb-3 text-left">Status</th>
                  <th className="pb-3 text-left hidden lg:table-cell">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-crm-border/40">
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-crm-panel-hover/30 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-crm-panel-hover border border-crm-border flex items-center justify-center text-[#0164DA] font-bold text-xs">
                          {lead.firstName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-crm-text-main">
                            {lead.firstName} {lead.lastName}
                          </p>
                          {lead.designation && <p className="text-[10px] text-crm-text-sub">{lead.designation}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-crm-text-sub hidden sm:table-cell">{lead.pipeline?.name ?? "—"}</td>
                    <td className="py-3 pr-4 text-xs text-crm-text-sub hidden md:table-cell">{lead.leadSource}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="py-3 text-xs text-crm-text-sub hidden lg:table-cell">{lead.createdBy?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin-only: Per-user stats */}
      {user?.role === "admin" && stats?.perUserStats && stats.perUserStats.length > 0 && (
        <div className="bg-crm-panel border border-crm-border p-6 rounded-3xl shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Award className="w-5 h-5 text-[#03D9AF]" />
            <h3 className="text-base font-bold text-crm-text-main">Business Developer Breakdown</h3>
            <span className="ml-auto text-[10px] font-bold text-[#03D9AF] bg-[#03D9AF]/10 px-2 py-0.5 rounded-full border border-[#03D9AF]/10">Admin Only</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {stats.perUserStats.map((dev, i) => (
              <div key={dev.userId} className="bg-crm-panel-hover/40 border border-crm-border p-4 rounded-2xl hover:border-[#0164DA]/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl premium-gradient flex items-center justify-center text-white font-bold text-sm">
                    {dev.userName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-crm-text-main">{dev.userName}</p>
                    <p className="text-[10px] text-crm-text-sub">#{i + 1} BD</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs border-t border-crm-border/50 pt-3">
                  <div className="flex justify-between">
                    <span className="text-crm-text-sub">Total Leads</span>
                    <span className="font-bold text-crm-text-main">{dev.totalLeads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-crm-text-sub">This Month</span>
                    <span className="font-bold text-[#03D9AF]">{dev.leadsThisMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-crm-text-sub">Statuses</span>
                    <span className="font-bold text-[#0164DA]">{dev.leadsByStatus.length}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreateLead && (
        <LeadModal
          pipelines={pipelines}
          onClose={() => setShowCreateLead(false)}
          onSaved={() => { setShowCreateLead(false); onLeadCreated(); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, trend, subtitle }: {
  label: string; value: number; icon: React.ElementType;
  color: string; trend?: "up" | "down"; subtitle?: string;
}) {
  return (
    <div className="bg-crm-panel border border-crm-border p-5 rounded-3xl shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-bold text-crm-text-sub uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-black text-crm-text-main">{value.toLocaleString()}</p>
      {subtitle && <p className="text-[10px] text-crm-text-sub mt-1">{subtitle}</p>}
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend === "up"
            ? <TrendingUp className="w-3 h-3 text-[#03D9AF]" />
            : <TrendingDown className="w-3 h-3 text-red-400" />}
          <span className={`text-[10px] font-bold ${trend === "up" ? "text-[#03D9AF]" : "text-red-400"}`}>
            Active
          </span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    New: "bg-[#0164DA]/10 text-[#0164DA] border-[#0164DA]/20",
    Contacted: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20",
    Qualified: "bg-[#03D9AF]/10 text-[#03D9AF] border-[#03D9AF]/20",
    Closed: "bg-green-500/10 text-green-400 border-green-500/20",
    Lost: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  const cls = colorMap[status] ?? "bg-crm-panel-hover text-crm-text-sub border-crm-border";
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>{status}</span>
  );
}

function EmptyState({ message, action }: { message: string; action: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-12 h-12 rounded-2xl bg-crm-panel-hover border border-crm-border flex items-center justify-center mx-auto mb-4">
        <FileText className="w-6 h-6 text-crm-text-sub" />
      </div>
      <p className="text-sm font-bold text-crm-text-main mb-1">{message}</p>
      <p className="text-xs text-crm-text-sub">{action}</p>
    </div>
  );
}

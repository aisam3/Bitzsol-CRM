"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import type { AuthUser, Lead, Pipeline } from "@/types";
import { LeadModal } from "./LeadModal";

interface Props {
  user: AuthUser | null;
  leads: Lead[];
  pipelines: Pipeline[];
  onRefresh: () => void;
}

export function LeadsView({ user, leads, pipelines, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [pipelineFilter, setPipelineFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const statuses = ["All", ...Array.from(new Set(leads.map((l) => l.status)))];

  const filtered = leads.filter((l) => {
    const matchSearch =
      !search ||
      `${l.firstName} ${l.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      l.designation?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || l.status === statusFilter;
    const matchPipeline = pipelineFilter === "All" || l.pipelineId === pipelineFilter;
    return matchSearch && matchStatus && matchPipeline;
  });

  async function handleDelete(id: string) {
    setDeleting(true);
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    setDeleteId(null);
    setDeleting(false);
    onRefresh();
  }

  async function handleStatusChange(lead: Lead, newStatus: string) {
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    onRefresh();
  }

  const statuses2 = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Closed", "Lost"];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-crm-text-main">Leads</h3>
          <p className="text-xs text-crm-text-sub">
            {user?.role === "business_developer" ? "Your leads" : "All CRM leads"} · {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0164DA] to-[#FB66BC] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-[#0164DA]/20">
          <Plus className="w-3.5 h-3.5" /> Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-sub" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-crm-panel border border-crm-border text-crm-text-main text-sm focus:outline-none focus:border-[#0164DA]"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-crm-panel border border-crm-border text-crm-text-main text-sm focus:outline-none focus:border-[#0164DA]">
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={pipelineFilter} onChange={(e) => setPipelineFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-crm-panel border border-crm-border text-crm-text-main text-sm focus:outline-none focus:border-[#0164DA]">
          <option value="All">All Pipelines</option>
          {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-crm-panel border border-crm-border rounded-3xl overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-bold text-crm-text-main mb-1">No leads found</p>
            <p className="text-xs text-crm-text-sub">Try adjusting your filters or create a new lead.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-crm-border">
                <tr className="text-[10px] font-bold text-crm-text-sub uppercase tracking-widest">
                  <th className="px-5 py-4 text-left">Name</th>
                  <th className="px-5 py-4 text-left hidden sm:table-cell">Pipeline</th>
                  <th className="px-5 py-4 text-left hidden md:table-cell">Source</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-left hidden lg:table-cell">Emails</th>
                  <th className="px-5 py-4 text-left hidden xl:table-cell">Created By</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-crm-border/40">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="group hover:bg-crm-panel-hover/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-crm-panel-hover border border-crm-border flex items-center justify-center text-[#0164DA] font-bold text-xs">
                          {lead.firstName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-crm-text-main">{lead.firstName} {lead.lastName}</p>
                          {lead.designation && <p className="text-[10px] text-crm-text-sub">{lead.designation}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-crm-text-sub hidden sm:table-cell">{lead.pipeline?.name ?? "—"}</td>
                    <td className="px-5 py-4 text-xs text-crm-text-sub hidden md:table-cell">{lead.leadSource}</td>
                    <td className="px-5 py-4">
                      {/* Inline status change */}
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead, e.target.value)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-crm-panel-hover border border-crm-border text-crm-text-main focus:outline-none focus:border-[#0164DA] cursor-pointer"
                      >
                        {statuses2.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      {lead.emails.length > 0 ? (
                        <div className="space-y-0.5">
                          {lead.emails.slice(0, 1).map((e) => (
                            <div key={e.id} className="flex items-center gap-1.5">
                              <span className="text-xs text-crm-text-sub truncate max-w-[130px]">{e.email}</span>
                              <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${e.status === "Verified" ? "text-[#03D9AF] bg-[#03D9AF]/10" : "text-[#F59E0B] bg-[#F59E0B]/10"}`}>
                                {e.status === "Verified" ? "✓" : "?"}
                              </span>
                            </div>
                          ))}
                          {lead.emails.length > 1 && <p className="text-[9px] text-crm-text-sub">+{lead.emails.length - 1} more</p>}
                        </div>
                      ) : <span className="text-xs text-crm-text-sub">—</span>}
                    </td>
                    <td className="px-5 py-4 text-xs text-crm-text-sub hidden xl:table-cell">{lead.createdBy?.name ?? "—"}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setEditLead(lead)}
                          className="w-7 h-7 rounded-lg bg-[#0164DA]/10 text-[#0164DA] flex items-center justify-center hover:bg-[#0164DA]/20 transition-colors cursor-pointer">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {user?.role === "admin" && (
                          <button onClick={() => setDeleteId(lead.id)}
                            className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-crm-panel rounded-2xl border border-crm-border p-6 max-w-sm w-full shadow-2xl text-crm-text-main">
            <h4 className="text-base font-bold mb-2">Delete Lead?</h4>
            <p className="text-sm text-crm-text-sub mb-6">This action cannot be undone. The lead and all associated data will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl bg-crm-panel-hover hover:bg-crm-panel border border-crm-border text-sm font-semibold cursor-pointer">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-50 cursor-pointer">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && <LeadModal pipelines={pipelines} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); onRefresh(); }} />}
      {editLead && <LeadModal pipelines={pipelines} lead={editLead} onClose={() => setEditLead(null)} onSaved={() => { setEditLead(null); onRefresh(); }} />}
    </div>
  );
}

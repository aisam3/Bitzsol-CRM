"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, SlidersHorizontal, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPipelineDropdown, setShowPipelineDropdown] = useState(false);

  // Sorting State
  const [sortField, setSortField] = useState<"name" | "date" | "status" | "source">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Toggle Columns State
  const [showColToggle, setShowColToggle] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    pipeline: true,
    source: true,
    status: true,
    emails: true,
    createdBy: true,
  });

  const allStatuses = ["All", "New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Closed", "Lost"];
  const selectedPipelineName = pipelineFilter === "All"
    ? "All Pipelines"
    : pipelines.find(p => p.id === pipelineFilter)?.name ?? "Unknown Pipeline";

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, pipelineFilter]);

  const filtered = leads.filter((l) => {
    const matchSearch =
      !search ||
      [l.firstName, l.middleName, l.lastName].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase()) ||
      l.designation?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || l.status === statusFilter;
    const matchPipeline = pipelineFilter === "All" || l.pipelineId === pipelineFilter;
    return matchSearch && matchStatus && matchPipeline;
  });

  // Sort Logic
  const sorted = [...filtered].sort((a, b) => {
    let valA: any = "";
    let valB: any = "";

    if (sortField === "name") {
      valA = [a.firstName, a.middleName, a.lastName].filter(Boolean).join(" ").toLowerCase();
      valB = [b.firstName, b.middleName, b.lastName].filter(Boolean).join(" ").toLowerCase();
    } else if (sortField === "date") {
      valA = new Date(a.date).getTime();
      valB = new Date(b.date).getTime();
    } else if (sortField === "status") {
      valA = a.status.toLowerCase();
      valB = b.status.toLowerCase();
    } else if (sortField === "source") {
      valA = a.leadSource.toLowerCase();
      valB = b.leadSource.toLowerCase();
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Paginated Logic
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeads = sorted.slice(startIndex, startIndex + itemsPerPage);

  function handleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

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
      <div className="flex flex-wrap gap-2.5 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-sub" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-crm-panel border border-crm-border text-crm-text-main text-xs focus:outline-none focus:border-[#0164DA]"
          />
        </div>

        {/* Status Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowStatusDropdown(!showStatusDropdown);
              setShowPipelineDropdown(false);
              setShowColToggle(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-crm-panel border border-crm-border hover:bg-crm-panel-hover text-crm-text-main text-xs font-semibold rounded-xl cursor-pointer transition-colors"
          >
            <span>{statusFilter === "All" ? "All Statuses" : statusFilter}</span>
            <ChevronDown className="w-3.5 h-3.5 text-crm-text-sub" />
          </button>
          {showStatusDropdown && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowStatusDropdown(false)} />
              <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-44 bg-crm-panel border border-crm-border rounded-xl shadow-xl p-1.5 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                <p className="text-[9px] font-bold text-crm-text-sub uppercase tracking-wider px-3 py-1.5 mb-1">
                  Filter by Status
                </p>
                <div className="space-y-0.5">
                  {allStatuses.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setStatusFilter(s);
                        setShowStatusDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-crm-panel-hover transition-colors cursor-pointer ${
                        statusFilter === s ? "text-[#0164DA] bg-[#0164DA]/10" : "text-crm-text-main"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pipeline Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowPipelineDropdown(!showPipelineDropdown);
              setShowStatusDropdown(false);
              setShowColToggle(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-crm-panel border border-crm-border hover:bg-crm-panel-hover text-crm-text-main text-xs font-semibold rounded-xl cursor-pointer transition-colors"
          >
            <span>{selectedPipelineName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-crm-text-sub" />
          </button>
          {showPipelineDropdown && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowPipelineDropdown(false)} />
              <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-52 bg-crm-panel border border-crm-border rounded-xl shadow-xl p-1.5 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                <p className="text-[9px] font-bold text-crm-text-sub uppercase tracking-wider px-3 py-1.5 mb-1">
                  Filter by Pipeline
                </p>
                <div className="space-y-0.5 max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setPipelineFilter("All");
                      setShowPipelineDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-crm-panel-hover transition-colors cursor-pointer ${
                      pipelineFilter === "All" ? "text-[#0164DA] bg-[#0164DA]/10" : "text-crm-text-main"
                    }`}
                  >
                    All Pipelines
                  </button>
                  {pipelines.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPipelineFilter(p.id);
                        setShowPipelineDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-crm-panel-hover transition-colors cursor-pointer ${
                        pipelineFilter === p.id ? "text-[#0164DA] bg-[#0164DA]/10" : "text-crm-text-main"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Toggle Columns dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowColToggle(!showColToggle);
              setShowStatusDropdown(false);
              setShowPipelineDropdown(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-crm-panel border border-crm-border text-crm-text-main text-xs font-semibold hover:bg-crm-panel-hover transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-crm-text-sub" />
            <span>Columns</span>
          </button>
          {showColToggle && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowColToggle(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-crm-panel border border-crm-border rounded-xl shadow-xl p-3.5 z-40 animate-in fade-in slide-in-from-top-2 duration-150 space-y-2">
                <p className="text-[10px] font-bold text-crm-text-sub uppercase tracking-wider mb-2">Show Columns</p>
                <div className="space-y-2">
                  {Object.keys(visibleCols).map((col) => (
                    <label key={col} className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer text-crm-text-main hover:text-[#0164DA] select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[col as keyof typeof visibleCols]}
                        onChange={() => setVisibleCols({
                          ...visibleCols,
                          [col]: !visibleCols[col as keyof typeof visibleCols]
                        })}
                        className="rounded bg-crm-input-bg border-crm-border text-[#0164DA] focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <span>{col === "createdBy" ? "Created By" : col.charAt(0).toUpperCase() + col.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-crm-panel border border-crm-border rounded-3xl overflow-hidden shadow-sm">
        {sorted.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-bold text-crm-text-main mb-1">No leads found</p>
            <p className="text-xs text-crm-text-sub">Try adjusting your filters or create a new lead.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-crm-border">
                <tr className="text-[10px] font-bold text-crm-text-sub uppercase tracking-widest">
                  <th className="px-5 py-4 text-left cursor-pointer hover:text-crm-text-main select-none transition-colors" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1">
                      Name
                      {sortField === "name" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-[#0164DA]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#0164DA]" />)}
                    </div>
                  </th>
                  {visibleCols.pipeline && (
                    <th className="px-5 py-4 text-left hidden sm:table-cell">Pipeline</th>
                  )}
                  {visibleCols.source && (
                    <th className="px-5 py-4 text-left hidden md:table-cell cursor-pointer hover:text-crm-text-main select-none transition-colors" onClick={() => handleSort("source")}>
                      <div className="flex items-center gap-1">
                        Source
                        {sortField === "source" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-[#0164DA]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#0164DA]" />)}
                      </div>
                    </th>
                  )}
                  {visibleCols.status && (
                    <th className="px-5 py-4 text-left cursor-pointer hover:text-crm-text-main select-none transition-colors" onClick={() => handleSort("status")}>
                      <div className="flex items-center gap-1">
                        Status
                        {sortField === "status" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-[#0164DA]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#0164DA]" />)}
                      </div>
                    </th>
                  )}
                  {visibleCols.emails && (
                    <th className="px-5 py-4 text-left hidden lg:table-cell">Emails</th>
                  )}
                  {visibleCols.createdBy && (
                    <th className="px-5 py-4 text-left hidden xl:table-cell">Created By</th>
                  )}
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-crm-border/40">
                {paginatedLeads.map((lead) => (
                  <tr key={lead.id} className="group hover:bg-crm-panel-hover/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-crm-panel-hover border border-crm-border flex items-center justify-center text-[#0164DA] font-bold text-xs">
                          {lead.firstName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-crm-text-main">
                            {[lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ")}
                          </p>
                          {lead.designation && <p className="text-[10px] text-crm-text-sub">{lead.designation}</p>}
                        </div>
                      </div>
                    </td>
                    {visibleCols.pipeline && (
                      <td className="px-5 py-4 text-xs text-crm-text-sub hidden sm:table-cell">{lead.pipeline?.name ?? "—"}</td>
                    )}
                    {visibleCols.source && (
                      <td className="px-5 py-4 text-xs text-crm-text-sub hidden md:table-cell">{lead.leadSource}</td>
                    )}
                    {visibleCols.status && (
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
                    )}
                    {visibleCols.emails && (
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
                    )}
                    {visibleCols.createdBy && (
                      <td className="px-5 py-4 text-xs text-crm-text-sub hidden xl:table-cell">{lead.createdBy?.name ?? "—"}</td>
                    )}
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-crm-border bg-crm-panel-hover/10">
                <span className="text-xs text-crm-text-sub">
                  Showing <span className="font-bold text-crm-text-main">{startIndex + 1}</span> to <span className="font-bold text-crm-text-main">{Math.min(startIndex + itemsPerPage, sorted.length)}</span> of <span className="font-bold text-crm-text-main">{sorted.length}</span> leads
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="p-1.5 rounded-lg border border-crm-border text-crm-text-main hover:bg-crm-panel-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentPage === page ? "bg-[#0164DA] text-white" : "border border-crm-border text-crm-text-main hover:bg-crm-panel-hover"}`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="p-1.5 rounded-lg border border-crm-border text-crm-text-main hover:bg-crm-panel-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
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

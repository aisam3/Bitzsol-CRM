"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { Pipeline, Lead } from "@/types";

interface Props {
  pipelines: Pipeline[];
  lead?: Lead; // If provided, we are editing
  onClose: () => void;
  onSaved: () => void;
}

export function LeadModal({ pipelines, lead, onClose, onSaved }: Props) {
  const isEdit = !!lead;

  const [firstName, setFirstName] = useState(lead?.firstName ?? "");
  const [middleName, setMiddleName] = useState(lead?.middleName ?? "");
  const [lastName, setLastName] = useState(lead?.lastName ?? "");
  const [designation, setDesignation] = useState(lead?.designation ?? "");
  const [status, setStatus] = useState(lead?.status ?? "New");
  const [leadSource, setLeadSource] = useState(lead?.leadSource ?? "Other");
  const [sourceLink, setSourceLink] = useState(lead?.sourceLink ?? "");
  const [remarks, setRemarks] = useState(lead?.remarks ?? "");
  const [pipelineId, setPipelineId] = useState(lead?.pipelineId ?? pipelines[0]?.id ?? "");

  const [emails, setEmails] = useState<{ email: string; status: string }[]>(
    lead?.emails.map((e) => ({ email: e.email, status: e.status })) ?? [{ email: "", status: "Not_Verified" }]
  );
  const [phones, setPhones] = useState<{ phone: string; status: string }[]>(
    lead?.phones.map((p) => ({ phone: p.phone, status: p.status })) ?? [{ phone: "", status: "Not_Verified" }]
  );
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>(
    lead?.customFields ?? []
  );

  const [customStatuses, setCustomStatuses] = useState<string[]>(() => {
    const defaults = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Closed", "Lost"];
    if (lead?.status && !defaults.includes(lead.status)) {
      defaults.push(lead.status);
    }
    return defaults;
  });
  const [customSources, setCustomSources] = useState<string[]>(() => {
    const defaults = ["Google Search", "Referral", "Cold Outreach", "LinkedIn", "Email Campaign", "Other"];
    if (lead?.leadSource && !defaults.includes(lead.leadSource)) {
      defaults.push(lead.leadSource);
    }
    return defaults;
  });

  const [newStatusInput, setNewStatusInput] = useState("");
  const [showNewStatusInput, setShowNewStatusInput] = useState(false);
  const [newSourceInput, setNewSourceInput] = useState("");
  const [showNewSourceInput, setShowNewSourceInput] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleAddStatus() {
    const val = newStatusInput.trim();
    if (val && !customStatuses.includes(val)) {
      setCustomStatuses([...customStatuses, val]);
      setStatus(val);
      setNewStatusInput("");
      setShowNewStatusInput(false);
    }
  }

  function handleAddSource() {
    const val = newSourceInput.trim();
    if (val && !customSources.includes(val)) {
      setCustomSources([...customSources, val]);
      setLeadSource(val);
      setNewSourceInput("");
      setShowNewSourceInput(false);
    }
  }

  function insertFormatting(prefix: string, suffix: string = "") {
    const textarea = document.getElementById("remarks-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    const replacement = prefix + selectedText + suffix;

    const newRemarks = text.substring(0, start) + replacement + text.substring(end);
    setRemarks(newRemarks);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !pipelineId) {
      setError("First name and pipeline are required.");
      return;
    }
    setLoading(true);
    try {
      const url = isEdit ? `/api/leads/${lead!.id}` : "/api/leads";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, middleName, lastName, designation, status,
          leadSource, sourceLink, remarks, pipelineId,
          emails: emails.filter((e) => e.email.trim()),
          phones: phones.filter((p) => p.phone.trim()),
          customFields: customFields.filter((f) => f.key.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save lead."); return; }
      onSaved();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text-main focus:outline-none focus:border-[#0164DA] text-sm";
  const labelCls = "block text-[10px] font-bold text-crm-text-sub uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-crm-panel rounded-2xl sm:rounded-[2rem] border border-crm-border shadow-2xl text-crm-text-main">
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-crm-border sticky top-0 bg-crm-panel z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#0164DA]/10 text-[#0164DA] rounded-xl"><Plus className="w-5 h-5" /></div>
            <h3 className="text-base sm:text-lg font-bold">{isEdit ? "Edit Lead" : "Add New Lead"}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-crm-panel-hover hover:bg-crm-panel border border-crm-border flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5 text-crm-text-main" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs">{error}</div>}

          {/* Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>First Name *</label>
              <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} placeholder="John" />
            </div>
            <div>
              <label className={labelCls}>Middle Name</label>
              <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} className={inputCls} placeholder="e.g. William" />
            </div>
            <div>
              <label className={labelCls}>Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} placeholder="Doe" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Designation</label>
              <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} className={inputCls} placeholder="e.g. CEO" />
            </div>
            <div>
              <label className={labelCls}>Pipeline *</label>
              <select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} className={inputCls} required>
                <option value="">Select pipeline...</option>
                {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-crm-text-sub uppercase tracking-wider">Status</label>
                {!showNewStatusInput && (
                  <button
                    type="button"
                    onClick={() => setShowNewStatusInput(true)}
                    className="text-[10px] text-[#03D9AF] hover:underline cursor-pointer font-bold"
                  >
                    + Add Custom
                  </button>
                )}
              </div>
              {showNewStatusInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStatusInput}
                    onChange={(e) => setNewStatusInput(e.target.value)}
                    placeholder="New Status"
                    className="w-full px-3 py-2 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text-main text-xs focus:outline-none focus:border-[#0164DA]"
                  />
                  <button
                    type="button"
                    onClick={handleAddStatus}
                    className="px-3 py-2 bg-[#03D9AF]/15 text-[#03D9AF] border border-[#03D9AF]/30 rounded-xl text-xs font-bold hover:bg-[#03D9AF]/25 cursor-pointer transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewStatusInput(false); setNewStatusInput(""); }}
                    className="px-3 py-2 bg-crm-panel-hover border border-crm-border rounded-xl text-xs text-crm-text-sub hover:text-crm-text-main cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                  {customStatuses.map((s) => <option key={s}>{s}</option>)}
                </select>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-crm-text-sub uppercase tracking-wider">Lead Source</label>
                {!showNewSourceInput && (
                  <button
                    type="button"
                    onClick={() => setShowNewSourceInput(true)}
                    className="text-[10px] text-[#03D9AF] hover:underline cursor-pointer font-bold"
                  >
                    + Add Custom
                  </button>
                )}
              </div>
              {showNewSourceInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSourceInput}
                    onChange={(e) => setNewSourceInput(e.target.value)}
                    placeholder="New Source"
                    className="w-full px-3 py-2 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text-main text-xs focus:outline-none focus:border-[#0164DA]"
                  />
                  <button
                    type="button"
                    onClick={handleAddSource}
                    className="px-3 py-2 bg-[#03D9AF]/15 text-[#03D9AF] border border-[#03D9AF]/30 rounded-xl text-xs font-bold hover:bg-[#03D9AF]/25 cursor-pointer transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewSourceInput(false); setNewSourceInput(""); }}
                    className="px-3 py-2 bg-crm-panel-hover border border-crm-border rounded-xl text-xs text-crm-text-sub hover:text-crm-text-main cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select value={leadSource} onChange={(e) => setLeadSource(e.target.value)} className={inputCls}>
                  {customSources.map((s) => <option key={s}>{s}</option>)}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>Source Link</label>
            <input type="url" value={sourceLink} onChange={(e) => setSourceLink(e.target.value)} className={inputCls} placeholder="https://..." />
          </div>

          {/* Emails */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>Email Addresses</label>
              <button type="button" onClick={() => setEmails([...emails, { email: "", status: "Not_Verified" }])}
                className="text-[10px] text-[#03D9AF] hover:underline cursor-pointer">+ Add Email</button>
            </div>
            {emails.map((e, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input type="email" value={e.email} onChange={(ev) => { const n = [...emails]; n[i].email = ev.target.value; setEmails(n); }}
                  className={`${inputCls} flex-1`} placeholder="email@example.com" />
                <select value={e.status} onChange={(ev) => { const n = [...emails]; n[i].status = ev.target.value; setEmails(n); }}
                  className="px-3 py-2.5 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text-main text-xs focus:outline-none focus:border-[#0164DA]">
                  <option value="Not_Verified">Not Verified</option>
                  <option value="Verified">Verified</option>
                </select>
                {emails.length > 1 && (
                  <button type="button" onClick={() => setEmails(emails.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-300 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>

          {/* Phones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>Phone Numbers</label>
              <button type="button" onClick={() => setPhones([...phones, { phone: "", status: "Not_Verified" }])}
                className="text-[10px] text-[#03D9AF] hover:underline cursor-pointer">+ Add Phone</button>
            </div>
            {phones.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input type="tel" value={p.phone} onChange={(ev) => { const n = [...phones]; n[i].phone = ev.target.value; setPhones(n); }}
                  className={`${inputCls} flex-1`} placeholder="+1 555 0000" />
                <select value={p.status} onChange={(ev) => { const n = [...phones]; n[i].status = ev.target.value; setPhones(n); }}
                  className="px-3 py-2.5 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text-main text-xs focus:outline-none focus:border-[#0164DA]">
                  <option value="Not_Verified">Not Verified</option>
                  <option value="Verified">Verified</option>
                </select>
                {phones.length > 1 && (
                  <button type="button" onClick={() => setPhones(phones.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-300 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>

          {/* Remarks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>Remarks</label>
              <div className="flex items-center gap-1 bg-crm-panel-hover/50 p-1 rounded-lg border border-crm-border">
                <button
                  type="button"
                  onClick={() => insertFormatting("**", "**")}
                  className="px-2 py-0.5 text-[10px] font-bold rounded hover:bg-crm-panel border border-transparent hover:border-crm-border text-crm-text-main cursor-pointer"
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("*", "*")}
                  className="px-2 py-0.5 text-[10px] italic rounded hover:bg-crm-panel border border-transparent hover:border-crm-border text-crm-text-main cursor-pointer"
                  title="Italic"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("- ")}
                  className="px-2 py-0.5 text-[10px] rounded hover:bg-crm-panel border border-transparent hover:border-crm-border text-crm-text-main cursor-pointer"
                  title="Bullet List"
                >
                  • List
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("1. ")}
                  className="px-2 py-0.5 text-[10px] rounded hover:bg-crm-panel border border-transparent hover:border-crm-border text-crm-text-main cursor-pointer"
                  title="Numbered List"
                >
                  1. List
                </button>
              </div>
            </div>
            <textarea
              id="remarks-textarea"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="Notes, requirements, context..."
            />
          </div>

          {/* Custom Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>Custom Fields</label>
              <button type="button" onClick={() => setCustomFields([...customFields, { key: "", value: "" }])}
                className="text-[10px] text-[#03D9AF] hover:underline cursor-pointer">+ Add Field</button>
            </div>
            {customFields.map((f, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input type="text" value={f.key} onChange={(ev) => { const n = [...customFields]; n[i].key = ev.target.value; setCustomFields(n); }}
                  className={`${inputCls} w-2/5`} placeholder="Field name" />
                <input type="text" value={f.value} onChange={(ev) => { const n = [...customFields]; n[i].value = ev.target.value; setCustomFields(n); }}
                  className={`${inputCls} flex-1`} placeholder="Value" />
                <button type="button" onClick={() => setCustomFields(customFields.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-300 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-crm-border">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-crm-panel-hover hover:bg-crm-panel border border-crm-border text-sm font-semibold transition-colors cursor-pointer">Cancel</button>
            <button type="submit" disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0164DA] to-[#FB66BC] hover:opacity-90 text-white font-bold text-sm transition-all disabled:opacity-50 cursor-pointer">
              {loading ? "Saving..." : isEdit ? "Update Lead" : "Create Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

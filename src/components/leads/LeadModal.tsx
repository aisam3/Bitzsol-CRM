"use client";

import { useState } from "react";
import { X, Plus, Trash2, Mail, Phone, AlertCircle, Link, Hash } from "lucide-react";
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

  const [tags, setTags] = useState<string[]>(lead?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  function handleAddTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      let val = tagInput.trim();
      if (!val) return;

      if (!val.startsWith("#")) {
        val = `#${val}`;
      }

      if (!tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput("");
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    setTags(tags.filter((t) => t !== tagToRemove));
  }

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
          tags,
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

  const inputCls = "w-full px-3 py-2 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text-main focus:outline-none focus:border-[#0164DA] focus:ring-1 focus:ring-[#0164DA]/40 text-sm transition-all placeholder-crm-text-sub/50 shadow-sm";
  const labelCls = "block text-xs font-bold text-[#0164DA] uppercase tracking-wider mb-1";

  return (
    <div className="fixed inset-0 z-50 bg-crm-bg/95 backdrop-blur-md flex flex-col h-screen w-screen overflow-hidden text-crm-text-main animate-in fade-in duration-200">
      <form onSubmit={handleSubmit} className="flex flex-col h-full w-full overflow-hidden justify-between">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-crm-border bg-crm-panel/40 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0164DA]/10 border border-[#0164DA]/30 text-[#0164DA] rounded-xl">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-crm-text-main">
                {isEdit ? "Modify Lead Details" : "Create New Lead"}
              </h3>
              <p className="text-[0.72rem] text-crm-text-sub uppercase tracking-widest mt-0.5">
                {isEdit ? `Editing Lead Profile: ${firstName} ${lastName}` : "Add a new lead to your business development pipeline"}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-10 h-10 rounded-xl bg-crm-panel-hover hover:bg-crm-panel border border-crm-border flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5 text-crm-text-main hover:opacity-80" />
          </button>
        </div>

        {/* Content Body: Single Card with Balanced Grid Layout (Fits exactly on one screen, no scrollbar) */}
        <div className="flex-1 p-6 bg-crm-bg/50 flex flex-col justify-center items-center overflow-hidden">
          <div className="w-full max-w-6xl bg-crm-panel/40 border border-crm-border/60 glass p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-6 overflow-hidden">
            
            {/* Left Side: General Profile & Remarks */}
            <div className="flex-1 flex flex-col space-y-4">
              
              {/* Names */}
              <div className="grid grid-cols-3 gap-3">
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

              {/* Designation & Pipeline */}
              <div className="grid grid-cols-2 gap-3">
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

              {/* Status & Lead Source */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelCls}>Status</label>
                    {!showNewStatusInput && (
                      <button
                        type="button"
                        onClick={() => setShowNewStatusInput(true)}
                        className="text-[0.72rem] text-[#03D9AF] hover:underline cursor-pointer font-bold uppercase tracking-wider"
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
                        className={inputCls}
                      />
                      <button
                        type="button"
                        onClick={handleAddStatus}
                        className="px-2.5 py-1 bg-[#03D9AF]/15 text-[#03D9AF] border border-[#03D9AF]/30 rounded-lg text-xs font-bold hover:bg-[#03D9AF]/25 cursor-pointer transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowNewStatusInput(false); setNewStatusInput(""); }}
                        className="px-2.5 py-1 bg-crm-panel-hover border border-crm-border rounded-lg text-xs text-crm-text-sub hover:text-crm-text-main cursor-pointer transition-colors"
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
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelCls}>Lead Source</label>
                    {!showNewSourceInput && (
                      <button
                        type="button"
                        onClick={() => setShowNewSourceInput(true)}
                        className="text-[0.72rem] text-[#03D9AF] hover:underline cursor-pointer font-bold uppercase tracking-wider"
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
                        className={inputCls}
                      />
                      <button
                        type="button"
                        onClick={handleAddSource}
                        className="px-2.5 py-1 bg-[#03D9AF]/15 text-[#03D9AF] border border-[#03D9AF]/30 rounded-lg text-xs font-bold hover:bg-[#03D9AF]/25 cursor-pointer transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowNewSourceInput(false); setNewSourceInput(""); }}
                        className="px-2.5 py-1 bg-crm-panel-hover border border-crm-border rounded-lg text-xs text-crm-text-sub hover:text-crm-text-main cursor-pointer transition-colors"
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

              {/* Source Link */}
              <div>
                <label className={labelCls}>Source Link</label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-sub" />
                  <input type="url" value={sourceLink} onChange={(e) => setSourceLink(e.target.value)} className={`${inputCls} pl-10`} placeholder="https://..." />
                </div>
              </div>

              {/* Remarks Section */}
              <div className="space-y-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#0164DA] uppercase tracking-wider">Remarks / Notes</label>
                  <div className="flex items-center bg-crm-panel border border-crm-border p-0.5 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => insertFormatting("**", "**")}
                      className="px-2 py-0.5 text-xs font-bold hover:bg-crm-panel-hover text-crm-text-main cursor-pointer border-r border-crm-border"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting("*", "*")}
                      className="px-2 py-0.5 text-xs italic hover:bg-crm-panel-hover text-crm-text-main cursor-pointer border-r border-crm-border"
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting("- ")}
                      className="px-1.5 py-0.5 text-xs hover:bg-crm-panel-hover text-crm-text-main cursor-pointer border-r border-crm-border"
                      title="Bullet List"
                    >
                      • List
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting("1. ")}
                      className="px-1.5 py-0.5 text-xs hover:bg-crm-panel-hover text-crm-text-main cursor-pointer"
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
                  className={`${inputCls} resize-none h-20`}
                  placeholder="Enter detailed client requirements, notes, context..."
                />
              </div>

            </div>

            {/* Right Side: Communication Channels & Custom Fields */}
            <div className="flex-1 flex flex-col space-y-4">
              
              {/* Emails Section */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0164DA] uppercase tracking-wider">Email Addresses</span>
                  <button 
                    type="button" 
                    onClick={() => setEmails([...emails, { email: "", status: "Not_Verified" }])}
                    className="flex items-center gap-1 text-xs text-[#03D9AF] hover:underline cursor-pointer font-bold uppercase tracking-wider"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Email
                  </button>
                </div>
                <div className="space-y-2 max-h-24 overflow-y-auto pr-1">
                  {emails.map((e, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-sub" />
                        <input 
                          type="email" 
                          value={e.email} 
                          onChange={(ev) => { const n = [...emails]; n[i].email = ev.target.value; setEmails(n); }}
                          className={`${inputCls} pl-10`} 
                          placeholder="email@example.com" 
                        />
                      </div>
                      <select 
                        value={e.status} 
                        onChange={(ev) => { const n = [...emails]; n[i].status = ev.target.value; setEmails(n); }}
                        className="px-2 py-1.5 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text-main text-sm focus:outline-none focus:border-[#0164DA]"
                      >
                        <option value="Not_Verified">Not Verified</option>
                        <option value="Verified">Verified</option>
                      </select>
                      {emails.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => setEmails(emails.filter((_, j) => j !== i))}
                          className="p-1.5 text-red-400 hover:text-red-300 cursor-pointer hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Phone Numbers Section */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0164DA] uppercase tracking-wider">Phone Numbers</span>
                  <button 
                    type="button" 
                    onClick={() => setPhones([...phones, { phone: "", status: "Not_Verified" }])}
                    className="flex items-center gap-1 text-xs text-[#03D9AF] hover:underline cursor-pointer font-bold uppercase tracking-wider"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Phone
                  </button>
                </div>
                <div className="space-y-2 max-h-24 overflow-y-auto pr-1">
                  {phones.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-sub" />
                        <input 
                          type="tel" 
                          value={p.phone} 
                          onChange={(ev) => { const n = [...phones]; n[i].phone = ev.target.value; setPhones(n); }}
                          className={`${inputCls} pl-10`} 
                          placeholder="+1 555 0000" 
                        />
                      </div>
                      <select 
                        value={p.status} 
                        onChange={(ev) => { const n = [...phones]; n[i].status = ev.target.value; setPhones(n); }}
                        className="px-2 py-1.5 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text-main text-sm focus:outline-none focus:border-[#0164DA]"
                      >
                        <option value="Not_Verified">Not Verified</option>
                        <option value="Verified">Verified</option>
                      </select>
                      {phones.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => setPhones(phones.filter((_, j) => j !== i))}
                          className="p-1.5 text-red-400 hover:text-red-300 cursor-pointer hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags Section */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#0164DA] uppercase tracking-wider">Tags</span>
                <div className="space-y-2">
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-sub" />
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      className={`${inputCls} pl-10`}
                      placeholder="Type tag (e.g. fiverr) and hit Enter"
                    />
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1 py-0.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0164DA]/10 border border-[#0164DA]/20 text-[#0164DA] text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:bg-[#0164DA]/15"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-red-400 cursor-pointer transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Fields Section */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0164DA] uppercase tracking-wider">Custom Fields</span>
                  <button 
                    type="button" 
                    onClick={() => setCustomFields([...customFields, { key: "", value: "" }])}
                    className="flex items-center gap-1 text-xs text-[#03D9AF] hover:underline cursor-pointer font-bold uppercase tracking-wider"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Field
                  </button>
                </div>
                <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
                  {customFields.length === 0 ? (
                    <div className="text-center py-4 border border-dashed border-crm-border/40 bg-crm-panel/20 text-crm-text-sub text-xs font-bold uppercase tracking-wider">
                      No custom fields added
                    </div>
                  ) : (
                    customFields.map((f, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input 
                          type="text" 
                          value={f.key} 
                          onChange={(ev) => { const n = [...customFields]; n[i].key = ev.target.value; setCustomFields(n); }}
                          className={`${inputCls} w-2/5`} 
                          placeholder="Field Key" 
                        />
                        <input 
                          type="text" 
                          value={f.value} 
                          onChange={(ev) => { const n = [...customFields]; n[i].value = ev.target.value; setCustomFields(n); }}
                          className={`${inputCls} flex-1`} 
                          placeholder="Value" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setCustomFields(customFields.filter((_, j) => j !== i))}
                          className="p-1.5 text-red-400 hover:text-red-300 cursor-pointer hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3 border-t border-crm-border bg-crm-panel/40 backdrop-blur-sm gap-4 flex-shrink-0">
          <div className="w-full sm:w-auto">
            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-sm font-semibold rounded-xl">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-crm-panel-hover hover:bg-crm-panel border border-crm-border text-sm font-bold uppercase tracking-wider text-crm-text-main transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#0164DA] hover:bg-[#0164DA]/90 border border-[#0164DA] text-white font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-[#0164DA]/20"
            >
              {loading ? "Saving Details..." : isEdit ? "Update Lead Info" : "Add Lead"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

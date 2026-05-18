"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import type { User } from "@/types";

export function UsersView() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "business_developer">("business_developer");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    if (data.data) setUsers(data.data);
    else setError(data.error ?? "Failed to load users.");
    setLoading(false);
  }

  function openCreate() { setName(""); setEmail(""); setPassword(""); setRole("business_developer"); setStatus("active"); setEditUser(null); setFormError(""); setShowForm(true); }
  function openEdit(u: User) { setName(u.name); setEmail(u.email); setPassword(""); setRole(u.role); setStatus(u.status); setEditUser(u); setFormError(""); setShowForm(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
      const method = editUser ? "PATCH" : "POST";
      const body: Record<string, string> = { name, email, role, status };
      if (password) body.password = password;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed."); return; }
      setShowForm(false);
      fetchUsers();
    } catch { setFormError("Network error."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    setDeleteId(null);
    setDeleting(false);
    fetchUsers();
  }

  async function toggleStatus(u: User) {
    await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: u.status === "active" ? "inactive" : "active" }),
    });
    fetchUsers();
  }

  const inputCls = "w-full px-4 py-2.5 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text-main focus:outline-none focus:border-[#0164DA] text-sm";
  const labelCls = "block text-[10px] font-bold text-crm-text-sub uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-crm-text-main">Users</h3>
          <p className="text-xs text-crm-text-sub">{users.length} user{users.length !== 1 ? "s" : ""} registered</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0164DA] to-[#FB66BC] hover:opacity-90 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg">
          <Plus className="w-3.5 h-3.5" /> Add User
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-crm-text-sub text-sm">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="bg-crm-panel border border-crm-border rounded-3xl text-center py-16 shadow-sm">
          <Users className="w-10 h-10 text-crm-text-sub mx-auto mb-3" />
          <p className="text-sm font-bold text-crm-text-main">No users yet</p>
        </div>
      ) : (
        <div className="bg-crm-panel border border-crm-border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-crm-border">
                <tr className="text-[10px] font-bold text-crm-text-sub uppercase tracking-widest">
                  <th className="px-5 py-4 text-left">User</th>
                  <th className="px-5 py-4 text-left hidden sm:table-cell">Role</th>
                  <th className="px-5 py-4 text-left hidden md:table-cell">Joined</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-crm-border/40">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-crm-panel-hover/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg premium-gradient flex items-center justify-center text-white font-bold text-xs">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-crm-text-main">{u.name}</p>
                          <p className="text-[10px] text-crm-text-sub">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${u.role === "admin" ? "bg-[#0164DA]/10 text-[#0164DA] border-[#0164DA]/20" : "bg-[#FB66BC]/10 text-[#FB66BC] border-[#FB66BC]/20"}`}>
                        {u.role === "admin" ? "Admin" : "Business Dev"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-crm-text-sub hidden md:table-cell">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => toggleStatus(u)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-all ${u.status === "active" ? "bg-[#03D9AF]/10 text-[#03D9AF] border-[#03D9AF]/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20" : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-[#03D9AF]/10 hover:text-[#03D9AF] hover:border-[#03D9AF]/20"}`}>
                        {u.status === "active" ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(u)} className="w-7 h-7 rounded-lg bg-[#0164DA]/10 text-[#0164DA] flex items-center justify-center hover:bg-[#0164DA]/20 cursor-pointer">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(u.id)} className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-crm-panel rounded-2xl border border-crm-border p-6 max-w-md w-full shadow-2xl text-crm-text-main">
            <h4 className="text-base font-bold mb-4">{editUser ? "Edit User" : "Add New User"}</h4>
            {formError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-4">{formError}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className={labelCls}>Full Name *</label><input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="John Doe" /></div>
              <div><label className={labelCls}>Email *</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="john@bitzsol.com" /></div>
              <div><label className={labelCls}>{editUser ? "New Password (leave blank to keep)" : "Password *"}</label><input type="password" required={!editUser} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "business_developer")} className={inputCls}>
                    <option value="business_developer">Business Developer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl bg-crm-panel-hover hover:bg-crm-panel border border-crm-border text-sm font-semibold cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#0164DA] hover:opacity-90 text-white text-sm font-bold disabled:opacity-50 cursor-pointer">
                  {saving ? "Saving..." : editUser ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-crm-panel rounded-2xl border border-crm-border p-6 max-w-sm w-full shadow-2xl text-crm-text-main">
            <h4 className="text-base font-bold mb-2">Delete User?</h4>
            <p className="text-sm text-crm-text-sub mb-6">This will permanently remove the user account. Their leads will remain.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl bg-crm-panel-hover hover:bg-crm-panel border border-crm-border text-sm font-semibold cursor-pointer">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-50 cursor-pointer">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

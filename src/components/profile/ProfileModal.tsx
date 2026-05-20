"use client";

import { useState } from "react";
import { X, User, Key, Mail, CheckCircle } from "lucide-react";
import type { AuthUser } from "@/types";

interface Props {
  user: AuthUser;
  onClose: () => void;
  onSaved: (updatedUser: AuthUser) => void;
}

export function ProfileModal({ user, onClose, onSaved }: Props) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [image, setImage] = useState<string | null>(user.image || null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    const fileInput = document.getElementById("profile-image-input") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    // Password change validations
    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        setError("Current password is required to change password.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New passwords do not match.");
        return;
      }
      if (newPassword.length < 6) {
        setError("New password must be at least 6 characters long.");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
          image,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to update profile.");
        return;
      }

      setSuccessMsg("Profile updated successfully!");
      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Notify parent to update the session state
      setTimeout(() => {
        onSaved(json.data);
      }, 1000);
    } catch {
      setError("A network error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full pl-9 pr-3 py-2.5 rounded-xl bg-crm-input-bg border border-crm-border text-crm-text-main focus:outline-none focus:border-[#0164DA] text-sm transition-all";
  const labelCls =
    "block text-[10px] font-bold text-crm-text-sub uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-crm-panel rounded-3xl border border-crm-border shadow-2xl text-crm-text-main">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-crm-border bg-crm-panel sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#0164DA]/10 text-[#0164DA] rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">Profile Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-crm-panel-hover hover:bg-crm-panel border border-crm-border flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5 text-crm-text-main" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Profile Photo Upload */}
          <div className="flex flex-col items-center justify-center gap-3 py-2 border-b border-crm-border/40 pb-4 mb-2">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full border-2 border-crm-border bg-crm-panel-hover overflow-hidden flex items-center justify-center text-crm-text-main text-2xl font-bold shadow-inner">
                {image ? (
                  <img src={image} alt="Profile Preview" className="w-full h-full object-cover" />
                ) : (
                  user.name.substring(0, 2).toUpperCase()
                )}
              </div>
              <label
                htmlFor="profile-image-input"
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full text-[10px] font-bold text-white cursor-pointer transition-opacity"
              >
                Change
              </label>
              <input
                id="profile-image-input"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            {image && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-[10px] text-red-400 hover:underline hover:text-red-300 font-semibold cursor-pointer"
              >
                Remove Photo
              </button>
            )}
          </div>

          {/* Name Field */}
          <div>
            <label className={labelCls}>Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-sub" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Name"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className={labelCls}>Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-sub" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="Email Address"
              />
            </div>
          </div>

          {/* Password Section Divider */}
          <div className="pt-2 border-t border-crm-border/60 my-2">
            <p className="text-[10px] font-black text-crm-text-sub uppercase tracking-widest">
              Update Password
            </p>
            <p className="text-[10px] text-crm-text-sub mt-0.5">
              Leave blank if you do not want to change your password.
            </p>
          </div>

          {/* Current Password Field */}
          <div>
            <label className={labelCls}>Current Password</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-sub" />
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* New Password Field */}
          <div>
            <label className={labelCls}>New Password</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-sub" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Confirm New Password Field */}
          <div>
            <label className={labelCls}>Confirm New Password</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-sub" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-crm-panel-hover hover:bg-crm-panel border border-crm-border text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#0164DA] to-[#FB66BC] hover:opacity-90 text-white text-xs font-bold disabled:opacity-50 cursor-pointer transition-all shadow-lg shadow-[#0164DA]/20"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

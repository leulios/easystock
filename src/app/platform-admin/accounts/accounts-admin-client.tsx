"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  revokeUserSessionsAction,
  generateRecoveryLinkAction,
} from "@/app/actions/platform-admin";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Shield,
  KeyRound,
  LogOut,
  Copy,
  Check,
  AlertTriangle,
  X,
  Clock,
  Building2,
  Lock,
} from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  platformRole: string;
  isActive: boolean;
  activeSessionsCount: number;
  membershipsCount: number;
  membershipsSummary: Array<{
    role: string;
    orgName: string;
    shopName: string;
  }>;
  lastLoginAt: Date | null;
  createdAt: Date;
}

interface AccountsAdminClientProps {
  initialUsers: UserItem[];
}

export function AccountsAdminClient({ initialUsers }: AccountsAdminClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "SUPER_ADMIN" | "NONE">("all");

  // Revoke session state
  const [revokingUser, setRevokingUser] = useState<UserItem | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  // Recovery link state
  const [recoveringUser, setRecoveringUser] = useState<UserItem | null>(null);
  const [recoveryReason, setRecoveryReason] = useState("");
  const [generatedLink, setGeneratedLink] = useState<{ url: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredUsers = initialUsers.filter((u) => {
    const matchesSearch =
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search));

    const matchesRole = roleFilter === "all" || u.platformRole === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleConfirmRevoke = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokingUser) return;
    setError(null);

    startTransition(async () => {
      const res = await revokeUserSessionsAction({
        userId: revokingUser.id,
        reason: revokeReason.trim() || "Administrative security session reset",
      });

      if (!res.success) {
        setError(res.error || "Failed to revoke sessions");
      } else {
        setRevokingUser(null);
        setRevokeReason("");
        router.refresh();
      }
    });
  };

  const handleGenerateRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveringUser) return;
    setError(null);

    if (recoveryReason.trim().length < 5) {
      setError("Please specify an audit reason for generating an account recovery link.");
      return;
    }

    startTransition(async () => {
      const res = await generateRecoveryLinkAction({
        userId: recoveringUser.id,
        reason: recoveryReason.trim(),
      });

      if (!res.success) {
        setError(res.error || "Failed to generate recovery link");
      } else {
        setGeneratedLink({ url: res.recoveryUrl!, email: res.userEmail! });
        setRecoveringUser(null);
        setRecoveryReason("");
      }
    });
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    const fullUrl = `${window.location.origin}${generatedLink.url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            User Accounts & Session Management
          </h1>
          <p className="text-xs text-slate-400">
            Oversee registered platform accounts, assist with secure recovery, and revoke compromised sessions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Total Users:</span>
          <span className="font-mono font-bold text-sm bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-white">
            {initialUsers.length}
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by full name, email, or phone..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setRoleFilter("all")}
            className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
              roleFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
            }`}
          >
            All Accounts ({initialUsers.length})
          </button>
          <button
            onClick={() => setRoleFilter("SUPER_ADMIN")}
            className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
              roleFilter === "SUPER_ADMIN"
                ? "bg-amber-600 text-white"
                : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
            }`}
          >
            Super Admins ({initialUsers.filter((u) => u.platformRole === "SUPER_ADMIN").length})
          </button>
        </div>
      </div>

      {/* Generated Recovery Link Notice */}
      {generatedLink && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-700/60 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
              <KeyRound className="h-4 w-4" /> Single-Use Account Recovery Link Generated
            </span>
            <button
              onClick={() => setGeneratedLink(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300">
            Communicate this link to <span className="font-bold text-white">{generatedLink.email}</span> through a verified channel. The link expires in 60 minutes and is single-use.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}${generatedLink.url}`}
              className="flex-1 h-8 px-2.5 text-xs bg-slate-950 border border-slate-800 rounded font-mono text-emerald-300"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Link"}
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">User Identity</th>
                <th className="py-3 px-4">Platform Role</th>
                <th className="py-3 px-4">Shop Memberships</th>
                <th className="py-3 px-4 text-center">Active Sessions</th>
                <th className="py-3 px-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-400">No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{user.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                      {user.phone && (
                        <div className="text-[10px] text-slate-500 font-mono">{user.phone}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {user.platformRole === "SUPER_ADMIN" ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Shield className="h-3 w-3" /> Platform Super Admin
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Standard Tenant User</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {user.membershipsSummary.length === 0 ? (
                          <span className="text-slate-500 text-[11px]">No active shop roles</span>
                        ) : (
                          user.membershipsSummary.slice(0, 2).map((m, idx) => (
                            <div key={idx} className="text-[11px] text-slate-300">
                              <span className="font-semibold text-slate-200">{m.orgName}</span> &bull;{" "}
                              <span className="text-blue-400">{m.role}</span> ({m.shopName})
                            </div>
                          ))
                        )}
                        {user.membershipsSummary.length > 2 && (
                          <span className="text-[10px] text-slate-500">
                            +{user.membershipsSummary.length - 2} more branches
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono text-xs font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {user.activeSessionsCount} active
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setError(null);
                            setRecoveryReason("Customer forgotten password assistance request");
                            setRecoveringUser(user);
                          }}
                          title="Generate Secure Account Recovery Link"
                          className="px-2.5 py-1 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 inline-flex items-center gap-1 transition-colors"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Recovery Link
                        </button>

                        {user.activeSessionsCount > 0 && (
                          <button
                            onClick={() => {
                              setError(null);
                              setRevokeReason("Security session termination");
                              setRevokingUser(user);
                            }}
                            title="Revoke All Active Sessions"
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 inline-flex items-center gap-1 transition-colors"
                          >
                            <LogOut className="h-3.5 w-3.5" /> Revoke Sessions
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revoke Sessions Modal */}
      {revokingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <LogOut className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Revoke User Sessions</h2>
                  <p className="text-xs text-slate-400">{revokingUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setRevokingUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRevoke} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <p className="text-slate-400">
                This will immediately invalidate all {revokingUser.activeSessionsCount} active login sessions for{" "}
                <span className="font-bold text-white">{revokingUser.fullName}</span> across all browsers and devices.
              </p>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Audit Reason *</label>
                <textarea
                  rows={2}
                  required
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Lost device, suspicious login, credential rotation..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRevokingUser(null)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <LogOut className="h-4 w-4" />
                  {isPending ? "Revoking..." : "Revoke All Sessions"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recovery Link Modal */}
      {recoveringUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Account Recovery Assistance</h2>
                  <p className="text-xs text-slate-400">{recoveringUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setRecoveringUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateRecovery} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-400 space-y-1">
                <span className="font-semibold text-slate-200">Security Standard:</span>
                <p>
                  Passwords and password hashes are never viewable or retrievable. A cryptographically random, single-use token will be generated and logged to the security audit trail.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Mandatory Verification Reason *</label>
                <textarea
                  rows={2}
                  required
                  value={recoveryReason}
                  onChange={(e) => setRecoveryReason(e.target.value)}
                  placeholder="e.g. Identity verified via registered corporate phone number..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRecoveringUser(null)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <KeyRound className="h-4 w-4" />
                  {isPending ? "Generating..." : "Generate Recovery Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

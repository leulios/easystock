"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  createSupportTicketAction,
  updateSupportTicketAction,
  startInvestigationAction,
} from "@/app/actions/platform-admin";
import { useRouter } from "next/navigation";
import {
  LifeBuoy,
  Plus,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  ExternalLink,
  X,
  Lock,
} from "lucide-react";

interface SupportTicketItem {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  reportedByEmail: string;
  assignedTo: string | null;
  resolutionNotes: string | null;
  organizationName: string | null;
  shopName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SupportAdminClientProps {
  initialTickets: SupportTicketItem[];
  shops: Array<{ id: string; name: string; code: string; organizationName: string }>;
}

export function SupportAdminClient({ initialTickets, shops }: SupportAdminClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // New Ticket Modal
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketSeverity, setTicketSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [reporterEmail, setReporterEmail] = useState("");
  const [selectedShopId, setSelectedShopId] = useState("");

  // Investigation Session Modal
  const [investigatingTicket, setInvestigatingTicket] = useState<SupportTicketItem | null>(null);
  const [investigationReason, setInvestigationReason] = useState("");
  const [investigationDuration, setInvestigationDuration] = useState(60);
  const [activeSession, setActiveSession] = useState<any>(null);

  // Resolution Modal
  const [resolvingTicket, setResolvingTicket] = useState<SupportTicketItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredTickets = initialTickets.filter((t) => {
    const matchesSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.reportedByEmail.toLowerCase().includes(search.toLowerCase()) ||
      (t.organizationName && t.organizationName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await createSupportTicketAction({
        title: ticketTitle.trim(),
        description: ticketDesc.trim(),
        severity: ticketSeverity,
        reportedByEmail: reporterEmail.trim().toLowerCase(),
        shopId: selectedShopId || undefined,
      });

      if (!res.success) {
        setError(res.error || "Failed to log ticket");
      } else {
        setIsNewTicketOpen(false);
        setTicketTitle("");
        setTicketDesc("");
        setReporterEmail("");
        setSelectedShopId("");
        router.refresh();
      }
    });
  };

  const handleStartInvestigation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!investigatingTicket) return;
    setError(null);

    const shop = shops.find((s) => s.name === investigatingTicket.shopName?.split(" (")[0]);
    const shopId = shop?.id || shops[0]?.id;

    if (!shopId) {
      setError("No valid shop found to initiate investigation.");
      return;
    }

    startTransition(async () => {
      const res = await startInvestigationAction({
        shopId,
        ticketId: investigatingTicket.id,
        reason: investigationReason.trim(),
        durationMinutes: investigationDuration,
      });

      if (!res.success) {
        setError(res.error || "Failed to start authorized investigation");
      } else {
        setActiveSession(res.session);
        setInvestigatingTicket(null);
        setInvestigationReason("");
        router.refresh();
      }
    });
  };

  const handleResolveTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTicket) return;
    setError(null);

    startTransition(async () => {
      const res = await updateSupportTicketAction({
        ticketId: resolvingTicket.id,
        status: "RESOLVED",
        resolutionNotes: resolutionNotes.trim() || "Issue verified and resolved.",
      });

      if (!res.success) {
        setError(res.error || "Failed to resolve ticket");
      } else {
        setResolvingTicket(null);
        setResolutionNotes("");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Support & Incident Investigation Hub
          </h1>
          <p className="text-xs text-slate-400">
            Track customer reported problems and conduct time-limited, auditable investigation sessions
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setIsNewTicketOpen(true);
          }}
          className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <Plus className="h-4 w-4" /> Log Support Ticket
        </button>
      </div>

      {/* Active Support Investigation Banner */}
      {activeSession && (
        <div className="p-4 bg-amber-950/40 border border-amber-600/50 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" /> Audited Support Investigation Session Active
            </span>
            <button onClick={() => setActiveSession(null)} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300">
            Investigation access authorized for shop: <span className="font-bold text-white">{activeSession.shopName}</span> ({activeSession.organizationName}).
            All administrative queries are tagged with Session ID <span className="font-mono text-amber-300">{activeSession.sessionId}</span>.
            Session expires at: <span className="font-mono font-bold text-white">{new Date(activeSession.expiresAt).toLocaleTimeString()}</span>.
          </p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by title, email, or organization..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
              statusFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
            }`}
          >
            All ({initialTickets.length})
          </button>
          <button
            onClick={() => setStatusFilter("OPEN")}
            className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
              statusFilter === "OPEN"
                ? "bg-rose-600 text-white"
                : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
            }`}
          >
            Open ({initialTickets.filter((t) => t.status === "OPEN").length})
          </button>
          <button
            onClick={() => setStatusFilter("RESOLVED")}
            className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
              statusFilter === "RESOLVED"
                ? "bg-emerald-600 text-white"
                : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
            }`}
          >
            Resolved ({initialTickets.filter((t) => t.status === "RESOLVED").length})
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
            <LifeBuoy className="h-8 w-8 mx-auto mb-2 text-slate-600" />
            <p className="font-semibold text-slate-400">No support tickets found</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        ticket.severity === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : ticket.severity === "HIGH"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {ticket.severity}
                    </span>
                    <h3 className="font-bold text-white text-sm">{ticket.title}</h3>
                  </div>

                  <div className="text-[11px] text-slate-400 flex flex-wrap gap-2">
                    <span>Reporter: <span className="text-slate-300 font-mono">{ticket.reportedByEmail}</span></span>
                    {ticket.organizationName && (
                      <>
                        <span>&bull;</span>
                        <span>Tenant: <span className="text-slate-300">{ticket.organizationName}</span></span>
                      </>
                    )}
                    {ticket.shopName && (
                      <>
                        <span>&bull;</span>
                        <span>Outlet: <span className="text-slate-300">{ticket.shopName}</span></span>
                      </>
                    )}
                    <span>&bull;</span>
                    <span>Logged: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      ticket.status === "RESOLVED"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : ticket.status === "INVESTIGATING"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {ticket.status}
                  </span>

                  {ticket.status !== "RESOLVED" && (
                    <>
                      <button
                        onClick={() => {
                          setError(null);
                          setInvestigationReason(`Investigating ticket: ${ticket.title}`);
                          setInvestigatingTicket(ticket);
                        }}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1 transition-colors"
                      >
                        <ShieldAlert className="h-3 w-3" /> Authorize Investigation
                      </button>

                      <button
                        onClick={() => {
                          setError(null);
                          setResolutionNotes("");
                          setResolvingTicket(ticket);
                        }}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Resolve
                      </button>
                    </>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
                {ticket.description}
              </p>

              {ticket.resolutionNotes && (
                <div className="text-xs text-emerald-300 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/40">
                  <span className="font-bold text-emerald-400">Resolution Notes: </span>
                  {ticket.resolutionNotes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Log Ticket Modal */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-blue-400" />
                <h2 className="text-base font-bold text-white">Record Support Ticket</h2>
              </div>
              <button onClick={() => setIsNewTicketOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Issue Summary / Title *</label>
                <input
                  type="text"
                  required
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  placeholder="e.g. Cashier unable to reconcile register balance"
                  className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Severity Level *</label>
                  <select
                    value={ticketSeverity}
                    onChange={(e) => setTicketSeverity(e.target.value as any)}
                    className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Reporter Email *</label>
                  <input
                    type="email"
                    required
                    value={reporterEmail}
                    onChange={(e) => setReporterEmail(e.target.value)}
                    placeholder="customer@domain.com"
                    className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Detailed Description *</label>
                <textarea
                  rows={3}
                  required
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  placeholder="Detailed description of symptoms, steps to reproduce, or affected transactions..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
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
                  <Plus className="h-4 w-4" />
                  {isPending ? "Logging..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Investigation Session Modal */}
      {investigatingTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Authorize Support Investigation</h2>
              </div>
              <button onClick={() => setInvestigatingTicket(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleStartInvestigation} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 space-y-1">
                <span className="font-bold text-amber-400">Safeguards & Compliance:</span>
                <p className="text-slate-400">
                  Unrestricted impersonation is disabled by architectural policy. This action creates a time-limited, explicitly authorized access session. The reason and duration will be permanently logged to the immutable security audit trail.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Mandatory Investigation Reason *</label>
                <textarea
                  rows={2}
                  required
                  value={investigationReason}
                  onChange={(e) => setInvestigationReason(e.target.value)}
                  placeholder="e.g. Diagnosing reported checkout inventory rollback failure under ticket #..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Session Window Duration</label>
                <select
                  value={investigationDuration}
                  onChange={(e) => setInvestigationDuration(Number(e.target.value))}
                  className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={60}>60 Minutes (Standard)</option>
                  <option value={120}>120 Minutes (Extended)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setInvestigatingTicket(null)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Clock className="h-4 w-4" />
                  {isPending ? "Authorizing..." : "Start Audited Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Ticket Modal */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Resolve Support Ticket</h2>
              </div>
              <button onClick={() => setResolvingTicket(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResolveTicket} className="p-6 space-y-4 text-xs">
              <p className="text-slate-400">
                Marking ticket <span className="font-bold text-white">"{resolvingTicket.title}"</span> as resolved.
              </p>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Resolution Notes *</label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Identified cashier inventory adjustment discrepancy; re-synced ledger and verified with shop owner."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResolvingTicket(null)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isPending ? "Resolving..." : "Mark as Resolved"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

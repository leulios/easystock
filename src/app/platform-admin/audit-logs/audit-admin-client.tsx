"use client";

import React, { useState } from "react";
import { History, Search, Filter, Shield, Calendar, ChevronDown, ChevronUp } from "lucide-react";

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  previousData: any;
  newData: any;
  ipAddress: string | null;
  performedBy: string;
  organizationName: string;
  createdAt: Date;
}

interface AuditAdminClientProps {
  initialLogs: AuditLogItem[];
}

export function AuditAdminClient({ initialLogs }: AuditAdminClientProps) {
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const actions = Array.from(new Set(initialLogs.map((l) => l.action))).sort();

  const filteredLogs = initialLogs.filter((log) => {
    const matchesSearch =
      !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entityType.toLowerCase().includes(search.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(search.toLowerCase()) ||
      log.organizationName.toLowerCase().includes(search.toLowerCase());

    const matchesAction = !selectedAction || log.action === selectedAction;

    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Security & Governance Audit Trail
          </h1>
          <p className="text-xs text-slate-400">
            Immutable, append-only security ledger capturing administrative actions, suspensions, and role changes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Total Recorded Events:</span>
          <span className="font-mono font-bold text-sm bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded text-white">
            {initialLogs.length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, actor, target entity, or tenant..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="h-10 px-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="">All Event Actions ({actions.length})</option>
            {actions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Event Action</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4">Actor (Performed By)</th>
                <th className="py-3 px-4">Tenant Scope</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
                <th className="py-3 px-4 text-center">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <History className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-400">No audit records match your query</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const hasPayload = log.newData || log.previousData;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              log.action.includes("SUSPENDED") || log.action.includes("REVOKED")
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : log.action.includes("REACTIVATED") || log.action.includes("ACTIVATED")
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : log.action.includes("INVESTIGATION")
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-slate-950 text-blue-400 border-slate-800"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-200">{log.entityType}</span>
                          {log.entityId && (
                            <span className="text-[10px] text-slate-500 font-mono block truncate max-w-xs">
                              ID: {log.entityId}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-300">{log.performedBy}</span>
                          {log.ipAddress && (
                            <span className="text-[10px] text-slate-500 font-mono block">
                              IP: {log.ipAddress}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-400">
                          {log.organizationName}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-400 text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {hasPayload ? (
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white inline-flex items-center gap-1 font-mono text-[10px]"
                            >
                              <span>{isExpanded ? "Hide" : "Diff"}</span>
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          ) : (
                            <span className="text-slate-600">&mdash;</span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={6} className="p-4 border-t border-b border-slate-800">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              {log.previousData && (
                                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                                  <span className="font-bold text-rose-400 text-[11px] block">
                                    Previous State:
                                  </span>
                                  <pre className="text-slate-300 whitespace-pre-wrap overflow-x-auto text-[10px]">
                                    {JSON.stringify(log.previousData, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.newData && (
                                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                                  <span className="font-bold text-emerald-400 text-[11px] block">
                                    New / Modified State:
                                  </span>
                                  <pre className="text-slate-300 whitespace-pre-wrap overflow-x-auto text-[10px]">
                                    {JSON.stringify(log.newData, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

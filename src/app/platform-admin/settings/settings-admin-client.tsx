"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updatePlatformConfigAction } from "@/app/actions/platform-admin";
import { useRouter } from "next/navigation";
import {
  Settings,
  Shield,
  Save,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Bell,
  UserPlus,
  Server,
} from "lucide-react";

interface PlatformConfig {
  maintenanceMode: boolean;
  maintenanceNotice: string;
  supportContactEmail: string;
  allowNewRegistrations: boolean;
}

interface SettingsAdminClientProps {
  initialConfig: PlatformConfig;
}

export function SettingsAdminClient({ initialConfig }: SettingsAdminClientProps) {
  const router = useRouter();
  const [maintenanceMode, setMaintenanceMode] = useState(initialConfig.maintenanceMode);
  const [maintenanceNotice, setMaintenanceNotice] = useState(initialConfig.maintenanceNotice);
  const [supportContactEmail, setSupportContactEmail] = useState(initialConfig.supportContactEmail);
  const [allowNewRegistrations, setAllowNewRegistrations] = useState(initialConfig.allowNewRegistrations);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveSuccess(false);

    startTransition(async () => {
      const res = await updatePlatformConfigAction({
        maintenanceMode,
        maintenanceNotice: maintenanceNotice.trim(),
        supportContactEmail: supportContactEmail.trim().toLowerCase(),
        allowNewRegistrations,
      });

      if (!res.success) {
        setError(res.error || "Failed to update platform settings");
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Platform-Wide Global Configuration
        </h1>
        <p className="text-xs text-slate-400">
          Control system-wide maintenance notices, onboarding availability, and platform support defaults
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg flex items-center gap-2 text-xs text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Platform configuration updated and audited successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Maintenance Banner Control */}
        <div className="p-6 bg-slate-900/60 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-400" /> Platform Maintenance Notice Mode
              </span>
              <p className="text-xs text-slate-400 max-w-lg">
                When enabled, a prominent alert banner is displayed across all tenant shop terminals informing cashiers and owners of scheduled maintenance.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-slate-300">Public Maintenance Banner Message</label>
            <textarea
              rows={2}
              required
              value={maintenanceNotice}
              onChange={(e) => setMaintenanceNotice(e.target.value)}
              placeholder="Notice text displayed across tenant interfaces..."
              className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-medium"
            />
          </div>
        </div>

        {/* Registration & Onboarding Controls */}
        <div className="p-6 bg-slate-900/60 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-400" /> Self-Serve Tenant Onboarding
              </span>
              <p className="text-xs text-slate-400 max-w-lg">
                Enable or disable new organization registrations at the public <code>/register</code> page.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowNewRegistrations}
                onChange={(e) => setAllowNewRegistrations(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Global Support Contact */}
        <div className="p-6 bg-slate-900/60 rounded-xl border border-slate-800 space-y-4">
          <div className="space-y-1">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Mail className="h-4 w-4 text-purple-400" /> Platform Support Dispatch Email
            </span>
            <p className="text-xs text-slate-400">
              Inquiries and automated system escalation alerts will be addressed to this mailbox.
            </p>
          </div>

          <div className="max-w-md space-y-1.5">
            <input
              type="email"
              required
              value={supportContactEmail}
              onChange={(e) => setSupportContactEmail(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <Save className="h-4 w-4" />
            {isPending ? "Saving Configuration..." : "Save Platform Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}

"use client";

import React, { useState, useTransition } from "react";
import { registerAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AlertCircle, Building2, Store } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await registerAction(null, formData);
      if (!result.success) {
        setErrorMessage(result.error || "Registration failed.");
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      } else {
        router.push("/");
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Organization Section */}
      <div className="pt-1 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          <Building2 className="h-3.5 w-3.5 text-blue-600" /> Organization Details
        </div>
        <Input
          label="Business / Company Name"
          name="organizationName"
          required
          placeholder="Apex Retail Group"
          error={fieldErrors.organizationName?.[0]}
        />
      </div>

      {/* Primary Shop Section */}
      <div className="pt-1 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          <Store className="h-3.5 w-3.5 text-blue-600" /> Initial Shop / Branch
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Shop Name"
            name="shopName"
            required
            placeholder="Main Downtown Store"
            error={fieldErrors.shopName?.[0]}
          />
          <Input
            label="Shop Code"
            name="shopCode"
            required
            placeholder="MAIN-01"
            helperText="Short uppercase code"
            error={fieldErrors.shopCode?.[0]}
          />
        </div>
      </div>

      {/* Owner Account Section */}
      <div className="pt-1 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Owner Credentials
        </div>
        <Input
          label="Your Full Name"
          name="fullName"
          required
          placeholder="Jane Doe"
          error={fieldErrors.fullName?.[0]}
        />

        <div className="mt-3">
          <Input
            label="Work Email Address"
            name="email"
            type="email"
            required
            placeholder="jane@apexretail.com"
            error={fieldErrors.email?.[0]}
          />
        </div>

        <div className="mt-3">
          <Input
            label="Password (min 8 chars, 1 uppercase, 1 number)"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            error={fieldErrors.password?.[0]}
          />
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" className="w-full" isLoading={isPending}>
          Create Shop Account & Onboard
        </Button>
      </div>
    </form>
  );
}

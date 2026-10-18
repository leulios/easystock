"use client";

import React, { useState, useTransition } from "react";
import { resetPasswordAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface ResetPasswordFormProps {
  token: string;
  email: string;
}

export function ResetPasswordForm({ token, email }: ResetPasswordFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    formData.set("token", token);
    formData.set("email", email);

    startTransition(async () => {
      const result = await resetPasswordAction(null, formData);
      if (!result.success) {
        setErrorMessage(result.error || "Failed to reset password.");
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 2500);
      }
    });
  };

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col items-center gap-2 text-emerald-800">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          <h3 className="font-semibold text-base">Password Reset Successfully</h3>
          <p className="text-xs text-emerald-700">
            Your account credentials have been updated and all prior active sessions were revoked.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/login">
            <Button className="w-full">
              Proceed to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Account Email
        </label>
        <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-mono">
          {email}
        </div>
      </div>

      <Input
        label="New Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        placeholder="Min. 8 characters, 1 uppercase, 1 digit"
        error={fieldErrors.password?.[0]}
      />

      <Input
        label="Confirm New Password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        placeholder="Re-enter your new password"
        error={fieldErrors.confirmPassword?.[0]}
      />

      <div className="pt-2">
        <Button type="submit" className="w-full" isLoading={isPending}>
          Set New Password & Invalidate Sessions
        </Button>
      </div>
    </form>
  );
}

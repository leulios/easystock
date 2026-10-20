"use client";

import React, { useState, useTransition } from "react";
import { loginAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

interface LoginFormProps {
  redirectUrl?: string;
}

export function LoginForm({ redirectUrl }: LoginFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await loginAction(null, formData);
      if (!result.success) {
        setErrorMessage(result.error || t("error"));
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      } else {
        const dest = redirectUrl && redirectUrl.startsWith("/") ? redirectUrl : (result.redirectUrl || "/");
        router.push(dest);
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

      <Input
        label={t("emailLabel")}
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@company.com"
        error={fieldErrors.email?.[0]}
      />

      <Input
        label={t("passwordLabel")}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        placeholder="••••••••"
        error={fieldErrors.password?.[0]}
      />

      <div className="pt-2">
        <Button type="submit" className="w-full" isLoading={isPending}>
          {t("signInBtn")}
        </Button>
      </div>
    </form>
  );
}

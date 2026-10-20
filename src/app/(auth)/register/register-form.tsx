"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AlertCircle, Building2, Store } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export function RegisterForm() {
  const router = useRouter();
  const { t, language } = useLanguage();
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
        setErrorMessage(result.error || (language === "am" ? "የሱቅ ምዝገባው አልተሳካም።" : "Registration failed."));
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
    <div>
      <div className="text-center mb-6">
        <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto shadow-sm">
          ES
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-4">
          {t("registerBusinessHeading")}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t("registerBusinessSubheading")}
        </p>
      </div>

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
            <Building2 className="h-3.5 w-3.5 text-blue-600" /> {t("organizationDetailsSection")}
          </div>
          <Input
            label={t("companyNameLabel")}
            name="organizationName"
            required
            placeholder={language === "am" ? "ለምሳሌ፡ ራስ ደጀን ትሬዲንግ" : "Apex Retail Group"}
            error={fieldErrors.organizationName?.[0]}
          />
        </div>

        {/* Primary Shop Section */}
        <div className="pt-1 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <Store className="h-3.5 w-3.5 text-blue-600" /> {t("initialShopBranchSection")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t("shopNameLabel")}
              name="shopName"
              required
              placeholder={language === "am" ? "ፒያሳ ዋና ሱቅ" : "Main Downtown Store"}
              error={fieldErrors.shopName?.[0]}
            />
            <Input
              label={t("shopCodeLabel")}
              name="shopCode"
              required
              placeholder="MAIN-01"
              helperText={language === "am" ? "አጭር የእንግሊዝኛ ኮድ" : "Short uppercase code"}
              error={fieldErrors.shopCode?.[0]}
            />
          </div>
        </div>

        {/* Owner Account Section */}
        <div className="pt-1 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            {t("ownerCredentialsSection")}
          </div>
          <Input
            label={t("fullNameLabel")}
            name="fullName"
            required
            placeholder={language === "am" ? "ሙሉ ስምዎ" : "Jane Doe"}
            error={fieldErrors.fullName?.[0]}
          />

          <div className="mt-3">
            <Input
              label={t("emailLabel")}
              name="email"
              type="email"
              required
              placeholder="owner@myretail.com"
              error={fieldErrors.email?.[0]}
            />
          </div>

          <div className="mt-3">
            <Input
              label={`${t("passwordLabel")} (${language === "am" ? "ቢያንስ 8 ፊደላት፣ 1 ቁጥር" : "min 8 chars, 1 uppercase, 1 number"})`}
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
            {t("registerBtn")}
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/login" className="text-blue-600 font-semibold hover:underline">
          {t("signInBtn")}
        </Link>
      </div>
    </div>
  );
}

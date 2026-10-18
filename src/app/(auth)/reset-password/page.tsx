import Link from "next/link";
import { validateRecoveryToken } from "@/lib/auth/service";
import { ResetPasswordForm } from "./reset-password-form";
import { AlertTriangle, KeyRound } from "lucide-react";

interface ResetPasswordPageProps {
  searchParams: Promise<{
    token?: string;
    email?: string;
  }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token, email } = await searchParams;

  let validationResult: { valid: boolean; error?: string; user?: any } = {
    valid: false,
    error: "Missing recovery token or email in request URL.",
  };

  if (token && email) {
    validationResult = await validateRecoveryToken(token, email);
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white mx-auto shadow-sm">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-4">
            Reset Account Password
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Secure admin-assisted credentials recovery
          </p>
        </div>

        {!validationResult.valid ? (
          <div className="space-y-6">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Invalid or Expired Link</h4>
                <p className="text-xs text-amber-700 mt-1">
                  {validationResult.error || "The requested password recovery token could not be verified."}
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
              <p className="font-semibold text-slate-700">Security notice:</p>
              <p>Recovery tokens are cryptographically hashed, single-use, and expire automatically after 1 hour.</p>
              <p>Please contact your SaaS Platform Administrator to generate a fresh recovery link.</p>
            </div>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
              Resetting password for{" "}
              <strong className="text-slate-900">{validationResult.user?.fullName}</strong>.
            </div>

            <ResetPasswordForm token={token!} email={email!} />

            <div className="mt-6 text-center text-xs text-slate-500">
              Remember your password?{" "}
              <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

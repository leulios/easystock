import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto shadow-sm">
            ES
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-4">
            Register your business
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Setup your multi-tenant shop and owner administrative workspace
          </p>
        </div>

        <RegisterForm />

        <div className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

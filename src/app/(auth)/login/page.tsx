import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto shadow-sm">
            ES
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-4">
            Sign in to your account
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access your multi-tenant shop management terminal
          </p>
        </div>

        <LoginForm />

        <div className="mt-6 text-center text-xs text-slate-500">
          New to EasyStock?{" "}
          <Link href="/register" className="text-blue-600 font-semibold hover:underline">
            Register your shop
          </Link>
        </div>
      </div>
    </div>
  );
}

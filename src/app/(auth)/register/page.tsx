import Link from "next/link";
import { RegisterForm } from "./register-form";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-slate-50 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <RegisterForm />
      </div>
    </div>
  );
}

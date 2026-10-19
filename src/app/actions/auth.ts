"use server";

import { cookies } from "next/headers";
import { registerSchema, loginSchema, resetPasswordSchema } from "@/lib/validations/auth";
import {
  registerShopOwner,
  loginUser,
  logoutSession,
  switchActiveShop,
  resolveSessionContext,
  validateRecoveryToken,
  consumeRecoveryToken,
} from "@/lib/auth/service";
import { SESSION_COOKIE_NAME, SESSION_DURATION_DAYS } from "@/lib/auth/session";
import { redirect } from "next/navigation";


export interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  redirectUrl?: string;
}


export async function registerAction(prevState: any, formData: FormData): Promise<ActionResult> {
  const rawData = {
    organizationName: formData.get("organizationName"),
    shopName: formData.get("shopName"),
    shopCode: formData.get("shopCode"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    currency: formData.get("currency") || "USD",
  };

  const parsed = registerSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "Please correct the highlighted errors.",
    };
  }

  try {
    const result = await registerShopOwner(parsed.data);

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    });

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to complete registration.",
    };
  }
}

export async function loginAction(prevState: any, formData: FormData): Promise<ActionResult> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "Please enter a valid email and password.",
    };
  }

  try {
    const result = await loginUser(parsed.data);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    });

    const isPlatformAdmin = result.user.platformRole === "SUPER_ADMIN";
    return {
      success: true,
      redirectUrl: isPlatformAdmin ? "/platform-admin" : "/",
    };
  } catch (err: any) {

    return {
      success: false,
      error: err.message || "Invalid credentials.",
    };
  }
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await logoutSession(sessionToken);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

export async function switchShopAction(shopId: string): Promise<ActionResult> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    await switchActiveShop(sessionToken, shopId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to switch shop." };
  }
}

export async function getCurrentContext() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return resolveSessionContext(sessionToken);
}

export async function validateRecoveryTokenAction(token: string, email: string) {
  try {
    return await validateRecoveryToken(token, email);
  } catch (err: any) {
    return { valid: false, error: err.message || "Failed to validate recovery token." };
  }
}

export async function resetPasswordAction(prevState: any, formData: FormData): Promise<ActionResult> {
  const rawData = {
    token: formData.get("token"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = resetPasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "Please correct the errors below.",
    };
  }

  try {
    await consumeRecoveryToken(parsed.data.token, parsed.data.email, parsed.data.password);
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to reset password.",
    };
  }
}


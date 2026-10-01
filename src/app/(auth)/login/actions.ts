"use server";

import { signIn } from "next-auth/react";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      return { success: false, message: "Invalid email or password" };
    }

    return { success: true };
  } catch {
    return { success: false, message: "Unexpected error" };
  }
}

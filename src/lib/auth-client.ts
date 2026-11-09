"use client";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Sign-in returns { twoFactorRedirect: true } when a code is needed; the sign-in form handles it.
  plugins: [twoFactorClient()],
});

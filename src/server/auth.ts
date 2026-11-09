import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { haveIBeenPwned } from "better-auth/plugins/haveibeenpwned";
import { twoFactor } from "better-auth/plugins/two-factor";
import { db } from "@/db";
import { APP_NAME } from "@/lib/brand";
import { TRIAL_DAYS } from "@/lib/plans";
import { countryFromHeaders, defaultsForCountry } from "@/lib/units";
import * as schema from "@/db/schema";
import { linkEmail, sendEmail } from "./mailer";

export const auth = betterAuth({
  appName: APP_NAME,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  // The admin site (admin.keystub.com) signs in through the same accounts system.
  trustedOrigins: process.env.NEXT_PUBLIC_ADMIN_HOST
    ? [`${/localhost|127.0.0.1/.test(process.env.NEXT_PUBLIC_ADMIN_HOST) ? "http" : "https"}://${process.env.NEXT_PUBLIC_ADMIN_HOST}`]
    : [],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      rateLimit: schema.rateLimit,
      twoFactor: schema.twoFactor,
    },
  }),
  user: {
    additionalFields: {
      plan: { type: "string", defaultValue: "free", input: false },
      trialEndsAt: { type: "date", required: false, input: false },
      reminderLeadDays: { type: "number", defaultValue: 30, input: false },
      reminderLeadKm: { type: "number", defaultValue: 500, input: false },
      homeKwhPrice: { type: "number", defaultValue: 0.18, input: false },
      compareL100: { type: "number", defaultValue: 9, input: false },
      compareFuelPrice: { type: "number", defaultValue: 1.6, input: false },
      distanceUnit: { type: "string", defaultValue: "km", input: false },
      volumeUnit: { type: "string", defaultValue: "L", input: false },
      economyUnit: { type: "string", defaultValue: "l100", input: false },
      currency: { type: "string", defaultValue: "CAD", input: false },
      onboardedAt: { type: "date", required: false, input: false },
    },
    deleteUser: { enabled: true },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: `Reset your ${APP_NAME} password`,
        ...linkEmail({
          heading: "Reset your password",
          body: "Someone (hopefully you) asked to reset the password for your account. This link expires in 1 hour.",
          url,
          cta: "Choose a new password",
        }),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: `Confirm your email for ${APP_NAME}`,
        ...linkEmail({
          heading: "Confirm your email",
          body: "Thanks for signing up! Confirm your email address to start tracking your vehicles.",
          url,
          cta: "Confirm email",
        }),
      });
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Every new account starts with a TRIAL_DAYS-day Pro trial (no card; see src/lib/plans.ts), and
        // units + currency matching the visitor's country (changeable any time in Account).
        before: async (user, ctx) => {
          const { staffInfoFor } = await import("./staff");
          const staffAcct = (await staffInfoFor(user.email))?.dedicated;
          const host = (ctx?.headers?.get("x-forwarded-host") ?? ctx?.headers?.get("host") ?? "").toLowerCase();
          const onAdminSite = !!process.env.NEXT_PUBLIC_ADMIN_HOST && host === process.env.NEXT_PUBLIC_ADMIN_HOST;
          if (onAdminSite && !staffAcct)
            throw new APIError("FORBIDDEN", { message: "This sign-up is for invited KeyStub staff. To use KeyStub, create an account at keystub.com." });
          return {
            data: {
              ...user,
              // Staff work accounts: no trial and no customer welcome tour.
              ...(staffAcct ? { onboardedAt: new Date() } : { trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000) }),
              ...defaultsForCountry(countryFromHeaders(ctx?.headers)),
            },
          };
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh daily while in use
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    // Database-backed so limits hold across serverless instances and restarts.
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/forget-password": { window: 300, max: 3 },
      "/request-password-reset": { window: 300, max: 3 },
      "/two-factor/verify-totp": { window: 60, max: 5 },
      "/two-factor/verify-backup-code": { window: 60, max: 5 },
    },
  },
  // Rejects passwords that appear in known breaches (k-anonymity — the password never leaves the server).
  plugins: [
    ...(process.env.DISABLE_PWNED_CHECK ? [] : [haveIBeenPwned()]),
    // Optional two-factor sign-in with an authenticator app, plus one-time backup codes.
    // Repeated wrong codes lock the account for 15 minutes (plugin default).
    twoFactor({ issuer: APP_NAME }),
    nextCookies(), // must stay last
  ],
});

export type Session = typeof auth.$Infer.Session;

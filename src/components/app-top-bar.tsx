import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import { Logo } from "./logo";
import { SignOutButton } from "./sign-out-button";
import { ThemeButton } from "./theme-toggle";

export function AppTopBar() {
  return (
    <div className="header-row" style={{ paddingTop: 12 }}>
      <Link href="/app/home" className="logo-link" aria-label={`${APP_NAME} home`}>
        <Logo size={17} tone="app" />
      </Link>
      <div className="topbar-links" style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <ThemeButton />
        <Link href="/app/home" className="btn ghost sm">
          Home
        </Link>
        <Link href="/app?garage=1" className="btn ghost sm">
          Garage
        </Link>
        <Link href="/app/account" className="btn ghost sm">
          Account
        </Link>
        <SignOutButton />
      </div>
    </div>
  );
}

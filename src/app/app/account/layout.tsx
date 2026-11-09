import { AccountNav } from "@/components/account-nav";
import { AppTopBar } from "@/components/app-top-bar";
import { HomeNav } from "@/components/home-nav";

export default function AccountLayout({ children }: LayoutProps<"/app/account">) {
  return (
    <div className="shell has-mnav">
      <AppTopBar />
      <HomeNav />
      <main className="page">
        <h1 style={{ fontSize: 22, margin: "0 0 12px" }}>Account</h1>
        <div className="acc-layout">
          <AccountNav />
          <div className="acc-body">{children}</div>
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";
import { AppTopBar } from "@/components/app-top-bar";
import { HomeNav } from "@/components/home-nav";
import { VehicleForm } from "@/components/vehicle-form";

export const metadata = { title: "Add vehicle" };

export default function NewVehiclePage() {
  return (
    <div className="shell has-mnav">
      <AppTopBar />
      <HomeNav />
      <main className="page" style={{ maxWidth: 760 }}>
        <Link href="/app?garage=1" className="muted" style={{ fontSize: 13 }}>
          ← Garage
        </Link>
        <h1 style={{ fontSize: 22, margin: "8px 0 0" }}>Add a vehicle</h1>
        <VehicleForm />
      </main>
    </div>
  );
}

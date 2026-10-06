import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingNav } from "@/components/marketing/nav";
import "./marketing.css";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mk">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}

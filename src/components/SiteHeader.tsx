import { Link } from "@tanstack/react-router";
import logo from "@/assets/kelmarkets-logo.png";
import { usePortfolio } from "@/lib/positions";
import { NotificationBell } from "./NotificationBell";
import { MarketViewToggle } from "./MarketViewToggle";
import { AccountMenu } from "./AccountMenu";

export function SiteHeader() {
  const { balance, ready } = usePortfolio();
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="KELMARKET logo" width={32} height={32} className="h-8 w-8" />
          <span className="font-display text-lg font-bold tracking-tight">
            KEL<span className="text-primary">MARKET</span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link
            to="/"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-foreground bg-secondary" }}
          >
            Markets
          </Link>
          <Link
            to="/portfolio"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "text-foreground bg-secondary" }}
          >
            Portfolio
          </Link>
          <Link
            to="/admin"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "text-foreground bg-secondary" }}
          >
            Admin
          </Link>
          <NotificationBell />
        </nav>
        <MarketViewToggle />
        <AccountMenu />
        <div className="hidden items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-1.5 sm:flex">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Cash</span>
          <span className="num text-sm font-semibold text-primary">
            ${ready ? balance.toFixed(2) : "—"}
          </span>
        </div>
      </div>
    </header>
  );
}
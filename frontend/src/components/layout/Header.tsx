import { Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, Spade } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { to: '/', label: '首页' },
  { to: '/game', label: '游戏大厅' },
  { to: '/rules', label: '游戏规则' },
] as const;

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const logoutMutation = useLogout();
  const location = useLocation();

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 glass backdrop-blur-xl">
      <div className="mx-auto flex h-10 max-w-6xl items-center justify-between px-3">
        {/* Logo with Glassmorphism - Coordinated Colors */}
        <Link to="/" className="flex items-center gap-1.5 font-display text-base font-bold group leading-none">
          <div className="relative">
            <Spade className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 blur-md bg-primary/20 group-hover:bg-primary/30 transition-all" />
          </div>
          <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            升级
          </span>
        </Link>

        {/* Navigation Links - Glass Style */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                location.pathname === to
                  ? 'glass-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:glass',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Auth Buttons - Glassmorphism Style */}
        <div className="hidden items-center gap-1.5 md:flex">
          {isAuthenticated && user ? (
            <>
              <span className="text-[11px] font-medium glass-light px-2 py-0.5 rounded-full border border-white/20 leading-none">
                {user.username}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="h-7 px-2 text-xs glass-card hover:glass-strong"
              >
                <LogOut className="mr-1 h-3.5 w-3.5" />
                退出
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs glass-card hover:glass-strong">登录</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="h-7 px-2 text-xs glass-strong bg-gradient-to-r from-primary/80 to-accent/80 hover:from-primary hover:to-accent text-white border-2 border-white/30">注册</Button>
              </Link>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-7 w-7"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/40 glass backdrop-blur-xl px-4 pb-4 md:hidden animate-fade-in">
          <nav className="flex flex-col gap-2 pt-3">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={closeMobile}
                className={cn(
                  'rounded-xl px-4 py-3 text-sm font-semibold transition-all',
                  location.pathname === to
                    ? 'glass-card text-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:glass',
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex gap-2 border-t border-border/40 pt-4">
            {isAuthenticated && user ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full glass-card hover:glass-strong"
                onClick={() => {
                  logoutMutation.mutate();
                  closeMobile();
                }}
              >
                <LogOut className="mr-1 h-4 w-4" />
                退出 ({user.username})
              </Button>
            ) : (
              <>
                <Link to="/login" className="flex-1" onClick={closeMobile}>
                  <Button variant="ghost" size="sm" className="w-full glass-card hover:glass-strong">登录</Button>
                </Link>
                <Link to="/register" className="flex-1" onClick={closeMobile}>
                  <Button size="sm" className="w-full glass-strong bg-gradient-to-r from-primary/80 to-accent/80 hover:from-primary hover:to-accent text-white border-2 border-white/30">注册</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

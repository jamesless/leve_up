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
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <Spade className="h-6 w-6 text-amber-500" />
          <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            升级
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-foreground',
                location.pathname === to
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated && user ? (
            <>
              <span className="text-sm text-muted-foreground">
                {user.username}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="mr-1 h-4 w-4" />
                退出
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">登录</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" variant="game">注册</Button>
              </Link>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/40 bg-background px-4 pb-4 md:hidden animate-fade-in">
          <nav className="flex flex-col gap-1 pt-2">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={closeMobile}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  location.pathname === to
                    ? 'text-foreground bg-accent'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex gap-2 border-t border-border/40 pt-3">
            {isAuthenticated && user ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
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
                  <Button variant="ghost" size="sm" className="w-full">登录</Button>
                </Link>
                <Link to="/register" className="flex-1" onClick={closeMobile}>
                  <Button size="sm" variant="game" className="w-full">注册</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

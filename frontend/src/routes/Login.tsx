import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Spade, Loader2, ChevronRight, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLogin } from '@/hooks/useAuth';

const HIGHLIGHTS = [
  { icon: Shield, text: '公平竞技' },
  { icon: Sparkles, text: '实时对战' },
  { icon: Spade, text: '经典玩法' },
] as const;

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  return (
    <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-background via-purple-950/20 to-background">
      {/* 简洁渐变背景 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-900/20 via-background to-background" />

      {/* 移动端：表单卡片直接贴顶 */}
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] flex-col items-center justify-start px-4 pt-6 sm:pt-10 lg:max-w-7xl lg:flex-row lg:items-center lg:justify-center lg:gap-10 lg:px-8 lg:py-12">
        {/* 桌面端左侧品牌区 */}
        <div className="hidden w-full max-w-md animate-fade-in text-center lg:block lg:text-left xl:max-w-xl">
          <div className="glass-badge mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">欢迎回到升级</span>
          </div>

          <div className="mb-6 space-y-4">
            <h1 className="font-display text-4xl font-black tracking-tight xl:text-5xl">
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                登录后
              </span>
              <br />
              <span className="bg-gradient-to-r from-foreground via-primary/80 to-accent/80 bg-clip-text text-transparent">继续你的牌局节奏</span>
            </h1>

            <p className="text-base leading-7 text-foreground/80 xl:text-lg">
              延续首页的梦幻玻璃质感，快速回到五人三副牌找朋友的对局世界。
            </p>
          </div>

          <div className="mb-6 flex flex-wrap justify-center gap-3 lg:justify-start">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="bg-white/10 flex items-center gap-2 rounded-full border border-white/20 px-4 py-3 backdrop-blur-sm transition-all hover:scale-105"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{text}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="glass-card rounded-2xl border border-white/20 p-3">
              <Spade className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-display text-lg font-bold">经典升级扑克</p>
              <p className="text-sm text-muted-foreground">登录即刻开局。</p>
            </div>
          </div>
        </div>

        {/* 表单卡片 — 移动端全宽，桌面端居右 */}
        <div className="w-full animate-slide-up sm:max-w-md lg:animate-slide-up lg:self-center" style={{ animationDelay: '0.1s' }}>
          <Card className="glass-card w-full overflow-hidden rounded-2xl border-white/20 bg-white/10 shadow-[0_20px_80px_rgba(99,102,241,0.18)] backdrop-blur-sm">
            {/* 移动端紧凑头部 */}
            <CardHeader className="border-b border-white/10 bg-white/5 pb-4 pt-5 text-center sm:space-y-3 sm:pb-6 sm:pt-6">
              <div className="glass-card mx-auto flex h-12 w-12 items-center justify-center rounded-2xl sm:h-14 sm:w-14">
                <Spade className="h-6 w-6 text-primary drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] sm:h-7 sm:w-7" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl sm:text-3xl">账号登录</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  使用你的账号继续游戏，回到熟悉的升级战场。
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-7">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="username" className="text-xs font-semibold text-foreground/90 sm:text-sm">
                    用户名
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="输入用户名"
                    required
                    autoComplete="username"
                    className="h-11 rounded-xl border-white/20 bg-white/50 text-sm backdrop-blur-sm placeholder:text-muted-foreground/80 focus-visible:ring-primary/70 sm:h-12"
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold text-foreground/90 sm:text-sm">
                    密码
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入密码"
                    required
                    autoComplete="current-password"
                    className="h-11 rounded-xl border-white/20 bg-white/50 text-sm backdrop-blur-sm placeholder:text-muted-foreground/80 focus-visible:ring-primary/70 sm:h-12"
                  />
                </div>

                {loginMutation.isError && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-xs text-destructive backdrop-blur-sm sm:text-sm sm:py-3">
                    {loginMutation.error.message || '登录失败，请重试'}
                  </div>
                )}

                <Button
                  type="submit"
                  className="group h-11 w-full rounded-xl border-2 border-white/30 bg-gradient-to-r from-primary/85 via-accent/80 to-secondary/85 text-sm font-bold text-white shadow-[0_0_30px_rgba(139,92,246,0.28)] transition-all hover:scale-[1.01] hover:from-primary hover:via-accent hover:to-secondary sm:h-12 sm:text-base"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  <span className="flex items-center gap-2">
                    登录并继续
                    {!loginMutation.isPending && (
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    )}
                  </span>
                </Button>
              </form>

              <div className="mt-4 space-y-3 text-center sm:mt-5">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  还没有账号？{' '}
                  <Link
                    to="/register"
                    className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text font-semibold text-transparent underline-offset-4 hover:underline"
                  >
                    立即注册
                  </Link>
                </p>

                <p className="hidden text-xs text-muted-foreground/70 sm:block">
                  登录后即可进入大厅、匹配对局，并继续你的升级进度。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

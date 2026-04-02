import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Spade, Loader2, ChevronRight, Zap, Sparkles, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRegister } from '@/hooks/useAuth';

const HIGHLIGHTS = [
  { icon: Zap, text: '快速上手' },
  { icon: Sparkles, text: '实时对战' },
  { icon: Heart, text: '找朋友' },
] as const;

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const registerMutation = useRegister();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (username.length < 3) {
      setValidationError('用户名至少 3 个字符');
      return;
    }
    if (password.length < 4) {
      setValidationError('密码至少 4 个字符');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('两次输入的密码不一致');
      return;
    }

    registerMutation.mutate({ username, password });
  };

  const errorMessage =
    validationError || (registerMutation.isError ? registerMutation.error.message : '');

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
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">加入升级</span>
          </div>

          <div className="mb-6 space-y-4">
            <h1 className="font-display text-4xl font-black tracking-tight xl:text-5xl">
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                免费注册
              </span>
              <br />
              <span className="bg-gradient-to-r from-foreground via-primary/80 to-accent/80 bg-clip-text text-transparent">开启你的牌局之旅</span>
            </h1>

            <p className="text-base leading-7 text-foreground/80 xl:text-lg">
              创建账号只需几秒，进入五人三副牌找朋友的精彩世界。
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
              <p className="text-sm text-muted-foreground">注册即享智能 AI 对战与实时多人匹配。</p>
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
                <CardTitle className="text-2xl sm:text-3xl">创建账号</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  几步完成注册，立即加入升级牌局。
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
                    placeholder="至少 3 个字符"
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
                    placeholder="至少 4 个字符"
                    required
                    autoComplete="new-password"
                    className="h-11 rounded-xl border-white/20 bg-white/50 text-sm backdrop-blur-sm placeholder:text-muted-foreground/80 focus-visible:ring-primary/70 sm:h-12"
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground/90 sm:text-sm">
                    确认密码
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
                    required
                    autoComplete="new-password"
                    className="h-11 rounded-xl border-white/20 bg-white/50 text-sm backdrop-blur-sm placeholder:text-muted-foreground/80 focus-visible:ring-primary/70 sm:h-12"
                  />
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-xs text-destructive backdrop-blur-sm sm:text-sm sm:py-3">
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  className="group h-11 w-full rounded-xl border-2 border-white/30 bg-gradient-to-r from-primary/85 via-accent/80 to-secondary/85 text-sm font-bold text-white shadow-[0_0_30px_rgba(139,92,246,0.28)] transition-all hover:scale-[1.01] hover:from-primary hover:via-accent hover:to-secondary sm:h-12 sm:text-base"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  <span className="flex items-center gap-2">
                    立即注册
                    {!registerMutation.isPending && (
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    )}
                  </span>
                </Button>
              </form>

              <div className="mt-4 space-y-3 text-center sm:mt-5">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  已有账号？{' '}
                  <Link
                    to="/login"
                    className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text font-semibold text-transparent underline-offset-4 hover:underline"
                  >
                    立即登录
                  </Link>
                </p>

                <p className="hidden text-xs text-muted-foreground/70 sm:block">
                  注册即表示同意服务条款，账号安全由我们保障。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

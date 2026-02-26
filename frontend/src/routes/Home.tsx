import { Link } from 'react-router-dom';
import { Spade, Users, Trophy, Zap, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';

const FEATURES = [
  {
    icon: Users,
    title: '五人对战',
    desc: '五位玩家同桌竞技，找朋友机制增加策略深度',
  },
  {
    icon: Zap,
    title: '三副牌',
    desc: '162 张牌海量组合，考验你的记忆力和判断力',
  },
  {
    icon: Trophy,
    title: '升级竞赛',
    desc: '从 2 打到 A，率先打完所有级别即可获胜',
  },
] as const;

const RULES = [
  '每局由 5 名玩家参与，使用 3 副扑克牌（含大小王）',
  '庄家通过叫主确定主牌花色，并选择朋友牌',
  '庄家一方与闲家一方进行对抗',
  '根据得分决定升级幅度，先打完 A 的队伍获胜',
] as const;

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center md:py-32">
          <div className="mb-6 flex items-center gap-3">
            <Spade className="h-12 w-12 text-amber-500" />
            <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl">
              <span className="bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600 bg-clip-text text-transparent">
                升级
              </span>
            </h1>
          </div>
          <p className="mb-2 font-display text-xl text-muted-foreground md:text-2xl">
            五人三副牌找朋友
          </p>
          <p className="mb-10 max-w-lg text-sm text-muted-foreground/70">
            经典中国扑克牌游戏，策略与配合的完美结合。支持单人 AI 模式和多人在线对战。
          </p>
          <div className="flex gap-3">
            {isAuthenticated ? (
              <Link to="/game">
                <Button size="lg" variant="game" className="gap-2 text-base">
                  进入大厅
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button size="lg" variant="game" className="gap-2 text-base">
                    立即开始
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="text-base">
                    登录
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20">
        <h2 className="mb-12 text-center font-display text-3xl font-bold">游戏特色</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 transition-colors group-hover:bg-amber-500/20">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border/40 bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="mb-8 text-center font-display text-3xl font-bold">快速了解规则</h2>
          <div className="mx-auto max-w-2xl space-y-4">
            {RULES.map((rule, i) => (
              <div key={i} className="flex gap-4 rounded-lg border border-border/50 bg-background p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 font-display text-sm font-bold text-amber-500">
                  {i + 1}
                </span>
                <p className="pt-1 text-sm text-muted-foreground">{rule}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/rules">
              <Button variant="outline" className="gap-2">
                查看完整规则
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground/50">
        升级 - 五人三副牌找朋友 &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

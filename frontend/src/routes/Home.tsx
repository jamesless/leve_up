import { Link } from 'react-router-dom';
import { Spade, Heart, Diamond, Club, Users, Trophy, Zap, ChevronRight, Sparkles, Gamepad2, Shield, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';

const FEATURES = [
  {
    icon: Users,
    title: '五人对战',
    desc: '五位玩家同桌竞技，找朋友机制增加策略深度',
    color: 'purple',
  },
  {
    icon: Zap,
    title: '三副牌',
    desc: '162 张牌海量组合，考验你的记忆力和判断力',
    color: 'blue',
  },
  {
    icon: Trophy,
    title: '升级竞赛',
    desc: '从 2 打到 A，率先打完所有级别即可获胜',
    color: 'pink',
  },
] as const;

const HIGHLIGHTS = [
  { icon: Gamepad2, text: '智能 AI 对手' },
  { icon: Shield, text: '公平竞技' },
  { icon: Sparkles, text: '实时对战' },
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
    <div className="flex flex-col min-h-screen">
      {/* Hero Section - Glassmorphism Style */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Soft Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-card" />

        {/* Floating Glass Orbs - Symmetrical Color Distribution */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Top corners - matching colors */}
          <div className="absolute top-[15%] left-[8%] w-72 h-72 rounded-full glass-purple blur-3xl opacity-30 animate-float" />
          <div className="absolute top-[15%] right-[8%] w-72 h-72 rounded-full glass-pink blur-3xl opacity-30 animate-float" style={{ animationDelay: '1s' }} />
          {/* Bottom center - accent color */}
          <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-96 h-96 rounded-full glass-blue blur-3xl opacity-25 animate-float" style={{ animationDelay: '2s' }} />
        </div>

        {/* Decorative Card Suits - Harmonious Color Scheme */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-12">
          {/* Top corners - symmetrical colors */}
          <Spade className="absolute top-[12%] left-[6%] w-24 h-24 text-primary/80 rotate-12 animate-float" />
          <Heart className="absolute top-[12%] right-[6%] w-24 h-24 text-accent/80 -rotate-12 animate-float" style={{ animationDelay: '0.5s' }} />

          {/* Middle sides - complementary colors */}
          <Diamond className="absolute top-[40%] left-[3%] w-20 h-20 text-secondary/70 rotate-45 animate-float" style={{ animationDelay: '1s' }} />
          <Club className="absolute top-[40%] right-[3%] w-20 h-20 text-primary/70 -rotate-45 animate-float" style={{ animationDelay: '1.5s' }} />

          {/* Bottom accents */}
          <Crown className="absolute bottom-[25%] left-[15%] w-16 h-16 text-accent/60 rotate-12 animate-glow-pulse" />
          <Trophy className="absolute bottom-[25%] right-[15%] w-16 h-16 text-secondary/60 -rotate-12 animate-glow-pulse" style={{ animationDelay: '0.8s' }} />
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-20 text-center">
          {/* Enhanced Logo - Abstract Card Pattern */}
          <div className="mb-10 relative animate-fade-in">
            {/* Central Glass Card - Refined Colors */}
            <div className="relative glass-card rounded-3xl p-12 mb-8 hover:scale-105 transition-transform duration-500 border-2 border-white/20">
              {/* Four Suits in Corners - Coordinated Colors */}
              <div className="absolute top-4 left-4 text-primary/70">
                <Spade className="w-8 h-8" />
              </div>
              <div className="absolute top-4 right-4 text-accent/70">
                <Heart className="w-8 h-8" />
              </div>
              <div className="absolute bottom-4 left-4 text-secondary/70">
                <Diamond className="w-8 h-8" />
              </div>
              <div className="absolute bottom-4 right-4 text-primary/70">
                <Club className="w-8 h-8" />
              </div>

              {/* Main Title with Multiple Visual Layers */}
              <div className="relative">
                <h1 className="font-display text-7xl md:text-9xl font-black tracking-tight mb-4">
                  <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                    升级
                  </span>
                </h1>

                {/* Decorative Elements */}
                <div className="flex items-center justify-center gap-4 text-muted-foreground">
                  <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary" />
                  <Sparkles className="w-5 h-5 text-accent animate-glow-pulse" />
                  <div className="h-px w-16 bg-gradient-to-l from-transparent to-secondary" />
                </div>
              </div>
            </div>

            {/* Floating Accent Cards - Harmonized Colors */}
            <div className="absolute -top-8 -left-12 glass-card rounded-xl p-4 rotate-[-15deg] hover:rotate-[-20deg] transition-transform border border-primary/30">
              <Spade className="w-10 h-10 text-primary" />
            </div>
            <div className="absolute -top-8 -right-12 glass-card rounded-xl p-4 rotate-[15deg] hover:rotate-[20deg] transition-transform border border-accent/30">
              <Heart className="w-10 h-10 text-accent" />
            </div>
          </div>

          {/* Subtitle with Glass Effect */}
          <div className="mb-8 space-y-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="glass-light rounded-2xl px-8 py-4 inline-block backdrop-blur-xl">
              <p className="font-display text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                五人三副牌找朋友
              </p>
            </div>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              经典中国扑克牌游戏，策略与配合的完美结合。支持智能 AI 模式和实时在线对战。
            </p>
          </div>

          {/* Highlights Pills - Glass Design */}
          <div className="flex flex-wrap gap-3 mb-10 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="glass-card flex items-center gap-2 px-5 py-3 rounded-full hover:scale-105 hover:glass-strong transition-all"
              >
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">{text}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons with Glass Effect */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {isAuthenticated ? (
              <Link to="/game">
                <Button
                  size="lg"
                  className="relative group px-10 py-7 text-lg font-bold glass-strong bg-gradient-to-r from-primary/80 to-secondary/80 hover:from-primary hover:to-secondary text-white border-2 border-white/30 glow-soft transition-all hover:scale-105 backdrop-blur-xl"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    进入大厅
                    <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button
                    size="lg"
                    className="relative group px-10 py-7 text-lg font-bold glass-strong bg-gradient-to-r from-accent/80 to-primary/80 hover:from-accent hover:to-primary text-white border-2 border-white/30 glow-pink transition-all hover:scale-105 backdrop-blur-xl"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      立即开始
                      <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-10 py-7 text-lg font-bold glass-card border-2 border-white/20 hover:border-white/40 hover:glass-strong transition-all hover:scale-105 backdrop-blur-xl"
                  >
                    登录
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced Glass Cards */}
      <section className="relative py-24 md:py-36">
        <div className="absolute inset-0 bg-gradient-to-b from-card/30 to-background/50" />

        <div className="relative mx-auto w-full max-w-7xl px-4">
          <div className="text-center mb-20 space-y-6">
            <div className="inline-block glass-light rounded-2xl px-6 py-2 mb-4">
              <span className="text-sm font-semibold text-muted-foreground">FEATURES</span>
            </div>
            <h2 className="font-display text-5xl md:text-6xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              游戏特色
            </h2>
            <p className="text-lg text-muted-foreground">体验前所未有的升级游戏</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc, color }, index) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-3xl glass-card p-10 transition-all hover:scale-105 hover:glass-strong animate-slide-up"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Colored Glass Overlay */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                  color === 'purple' ? 'glass-purple' :
                  color === 'blue' ? 'glass-blue' :
                  'glass-pink'
                }`} />

                {/* Icon with Glass Background */}
                <div className={`relative mb-8 flex h-20 w-20 items-center justify-center rounded-2xl glass transition-all group-hover:scale-110 group-hover:rotate-6 ${
                  color === 'purple' ? 'text-primary' :
                  color === 'blue' ? 'text-secondary' :
                  'text-accent'
                }`}>
                  <Icon className="h-10 w-10" />
                </div>

                {/* Content */}
                <h3 className="relative mb-4 font-display text-3xl font-bold">{title}</h3>
                <p className="relative text-muted-foreground text-base leading-relaxed">{desc}</p>

                {/* Floating Accent */}
                <div className={`absolute -top-6 -right-6 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity ${
                  color === 'purple' ? 'bg-primary' :
                  color === 'blue' ? 'bg-secondary' :
                  'bg-accent'
                }`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rules Section - Glass Style */}
      <section className="relative py-24 md:py-36">
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-card/30" />

        <div className="relative mx-auto max-w-5xl px-4">
          <div className="text-center mb-16">
            <div className="inline-block glass-light rounded-2xl px-6 py-2 mb-4">
              <span className="text-sm font-semibold text-muted-foreground">RULES</span>
            </div>
            <h2 className="mb-6 font-display text-5xl md:text-6xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              快速了解规则
            </h2>
            <p className="text-lg text-muted-foreground">简单四步，立即上手</p>
          </div>

          <div className="space-y-6">
            {RULES.map((rule, i) => (
              <div
                key={i}
                className="group relative flex gap-6 rounded-2xl glass-card p-8 transition-all hover:scale-[1.02] hover:glass-strong animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {/* Number Badge with Glass */}
                <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl glass font-display text-2xl font-black transition-all group-hover:scale-110 ${
                  i === 0 ? 'text-primary bg-primary/10' :
                  i === 1 ? 'text-secondary bg-secondary/10' :
                  i === 2 ? 'text-accent bg-accent/10' :
                  'text-primary bg-primary/10'
                }`}>
                  {i + 1}
                </span>
                <p className="pt-3 text-lg leading-relaxed">{rule}</p>

                {/* Hover Glow */}
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity blur-xl ${
                  i === 0 ? 'bg-primary' :
                  i === 1 ? 'bg-secondary' :
                  i === 2 ? 'bg-accent' :
                  'bg-primary'
                }`} />
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link to="/rules">
              <Button
                variant="outline"
                size="lg"
                className="gap-2 px-8 py-6 text-lg glass-card border-2 border-white/20 hover:border-white/40 hover:glass-strong transition-all hover:scale-105"
              >
                查看完整规则
                <ChevronRight className="h-6 w-6" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer with Glass Effect */}
      <footer className="relative py-16 text-center">
        <div className="absolute inset-0 bg-gradient-to-t from-card/50 to-transparent" />
        <div className="relative glass-light rounded-3xl mx-auto max-w-2xl py-8 px-4">
          <p className="text-sm text-muted-foreground mb-2">
            升级 - 五人三副牌找朋友 &copy; {new Date().getFullYear()}
          </p>
          <p className="text-xs text-muted-foreground/60">
            Powered by Modern Tech Stack
          </p>
        </div>
      </footer>
    </div>
  );
}

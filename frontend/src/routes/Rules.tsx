import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const SECTIONS = [
  {
    title: '基本规则',
    items: [
      '五名玩家参与，使用 3 副扑克牌（含大小王），共 162 张牌',
      '每人发 25 张牌，剩余 12 张为底牌',
      '游戏从级别 2 开始，谁先升级打到 A 即获胜',
    ],
  },
  {
    title: '叫主与找朋友',
    items: [
      '发牌阶段，玩家可以叫主（选择主牌花色）',
      '最终获得叫主权的玩家成为庄家',
      '庄家获得底牌，选择要丢弃的牌，并选择一张"朋友牌"',
      '持有朋友牌的玩家为庄家的搭档（暗藏身份）',
    ],
  },
  {
    title: '出牌规则',
    items: [
      '每轮由上一轮获胜者先出牌',
      '其他玩家必须跟出相同花色，无该花色可出主牌或其他花色',
      '可以出单张、对子、连对、甩牌等组合',
      '主牌大于副牌，大小王为最大的主牌',
    ],
  },
  {
    title: '计分与升级',
    items: [
      '5、10、K 为分牌，分别值 5、10、10 分',
      '闲家每收集到的分牌计入总分',
      '根据闲家总分决定升级幅度：',
      '0 分 → 庄家升 3 级 | 40 分以下 → 庄家升 2 级 | 80 分以下 → 庄家升 1 级',
      '80 分 → 不升不降 | 120 分以上 → 闲家升 1 级 | 每多 40 分多升 1 级',
    ],
  },
] as const;

export default function Rules() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-4 gap-1">
            <ChevronLeft className="h-4 w-4" />
            返回首页
          </Button>
        </Link>
        <h1 className="font-display text-3xl font-bold">游戏规则</h1>
        <p className="mt-2 text-muted-foreground">
          五人三副牌找朋友升级 - 完整游戏规则说明
        </p>
      </div>

      <div className="space-y-8">
        {SECTIONS.map(({ title, items }, si) => (
          <section key={si}>
            <h2 className="mb-4 flex items-center gap-3 font-display text-xl font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-sm font-bold text-amber-500">
                {si + 1}
              </span>
              {title}
            </h2>
            <ul className="space-y-2 pl-11">
              {items.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

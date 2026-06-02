import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ECardSuit, type ICard } from '@/types/card';
import type { ICallRecord, IPlayer } from '@/types/game';

interface CallDealerDialogProps {
  onSubmit: (cardIndices: number[]) => void;
  isPending: boolean;
  /** 自己的级牌点数（用于"亮庄"主动出牌） */
  currentLevel?: string;
  /** 自己的手牌（按原始顺序，index 即后端识别用的 index） */
  myHand: ICard[];
  /** 所有玩家（用于读取其他玩家级牌） */
  players: IPlayer[];
  /** 自己的座位号 */
  myPosition: number;
  /** 已有亮庄/反庄记录（用于判断反庄条件） */
  callRecords?: ICallRecord[];
  /** 是否显示"不叫庄"按钮（已亮庄/已不叫则隐藏） */
  showPassButton?: boolean;
  /** 点击"不叫庄" */
  onPass?: () => void;
  /** "不叫庄" 是否处于 pending 状态 */
  isPassPending?: boolean;
}

// 四种花色按"黑桃 红桃 梅花 方块"顺序
const SUIT_ORDER: { suit: ECardSuit; symbol: string; colorClass: string }[] = [
  { suit: ECardSuit.SPADES, symbol: '♠', colorClass: 'text-slate-100' },
  { suit: ECardSuit.HEARTS, symbol: '♥', colorClass: 'text-rose-400' },
  { suit: ECardSuit.CLUBS, symbol: '♣', colorClass: 'text-slate-100' },
  { suit: ECardSuit.DIAMONDS, symbol: '♦', colorClass: 'text-rose-400' },
];

interface ButtonSpec {
  key: string;
  symbol: string;
  rank: string;
  count: number;
  isOwn: boolean;
  enabled: boolean;
  reason?: string;
  indices: number[];
  colorClass: string;
}

export default function CallDealerDialog({
  onSubmit,
  isPending,
  currentLevel = '2',
  myHand,
  players,
  myPosition,
  callRecords = [],
  showPassButton = false,
  onPass,
  isPassPending = false,
}: CallDealerDialogProps) {
  // 当前最新一条亮庄/反庄记录（用于反庄判断）
  const lastCall = useMemo(() => {
    if (!callRecords.length) return undefined;
    return [...callRecords].sort((a, b) => b.timestamp - a.timestamp)[0];
  }, [callRecords]);

  // 我的级数 + 其他玩家的级数（去重，排除我自己）
  const ranksToShow = useMemo(() => {
    const myRank = currentLevel;
    const othersSet = new Set<string>();
    players?.forEach((p) => {
      if (p.position !== myPosition && p.level && p.level !== myRank) {
        othersSet.add(p.level);
      }
    });
    return [
      { rank: myRank, isOwn: true },
      ...Array.from(othersSet).map((r) => ({ rank: r, isOwn: false })),
    ];
  }, [currentLevel, players, myPosition]);

  // 对每个 (suit, rank) 在我手里有多少张
  const countByKey = useMemo(() => {
    const map = new Map<string, number[]>();
    myHand.forEach((card, idx) => {
      const key = `${card.suit}|${card.value}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(idx);
    });
    return map;
  }, [myHand]);

  // 计算一个按钮的"是否显示+是否可选"
  const computeButton = (
    rank: string,
    count: number,
    isOwnRank: boolean,
    indices: number[],
  ): { visible: boolean; enabled: boolean; reason?: string } | null => {
    if (indices.length < count) return null;

    if (isOwnRank) {
      if (lastCall && lastCall.rank === rank) {
        if (count <= lastCall.count) return { visible: false, enabled: false };
        return { visible: true, enabled: true };
      }
      return { visible: true, enabled: true };
    }

    // 别人级数：反庄需至少 2 张
    if (count < 2) return null;

    if (!lastCall || lastCall.rank !== rank) {
      return { visible: true, enabled: false, reason: '等待该级别被叫后才能反' };
    }

    if (count <= lastCall.count) return null;

    return { visible: true, enabled: true };
  };

  // 按"花色 → 级数（自己优先）→ 张数升序"扁平化为一维按钮列表
  const buttons = useMemo<ButtonSpec[]>(() => {
    const result: ButtonSpec[] = [];
    SUIT_ORDER.forEach(({ suit, symbol, colorClass }) => {
      ranksToShow.forEach(({ rank, isOwn }) => {
        const indices = countByKey.get(`${suit}|${rank}`) ?? [];
        const maxCount = Math.min(indices.length, 3);
        const minCount = isOwn ? 1 : 2;
        for (let c = minCount; c <= maxCount; c++) {
          const state = computeButton(rank, c, isOwn, indices);
          if (!state || !state.visible) continue;
          result.push({
            key: `${suit}-${rank}-${c}`,
            symbol,
            rank,
            count: c,
            isOwn,
            enabled: state.enabled,
            reason: state.reason,
            indices,
            colorClass,
          });
        }
      });
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countByKey, ranksToShow, lastCall]);

  const handleClick = (btn: ButtonSpec) => {
    if (!btn.enabled || isPending) return;
    onSubmit(btn.indices.slice(0, btn.count));
  };

  return (
    <div className="rounded-lg border border-purple-400/30 bg-purple-950/60 backdrop-blur-md shadow-[0_2px_12px_rgba(139,92,246,0.25)] px-2 py-1.5">
      <div className="mb-1 flex items-baseline justify-between px-0.5">
        <h3 className="text-xs font-semibold text-white/85">亮庄 / 反庄</h3>
        <span className="text-[10px] text-white/45">
          {lastCall
            ? `当前: 座位${lastCall.seat} ${lastCall.rank}×${lastCall.count}`
            : buttons.length > 0
              ? '点击按钮即可亮庄'
              : '暂无可亮的牌'}
        </span>
      </div>

      {/* 横置一排：可横向滚动；右侧固定附带"不叫庄"按钮 */}
      <div className="flex flex-row flex-nowrap items-center gap-1 overflow-x-auto pb-0.5">
        {buttons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            title={btn.reason ?? (btn.enabled ? '点击亮庄/反庄' : '')}
            disabled={!btn.enabled || isPending}
            onClick={() => handleClick(btn)}
            className={cn(
              'shrink-0 rounded text-[11px] leading-tight px-1.5 py-1 border transition-colors whitespace-nowrap',
              btn.enabled
                ? cn(
                    'bg-purple-500/30 border-purple-300/60 text-white hover:bg-purple-400/50',
                    btn.isOwn ? '' : 'ring-1 ring-amber-300/40',
                  )
                : 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed',
            )}
          >
            <span className={cn('mr-0.5', btn.colorClass)}>{btn.symbol}</span>
            <span>{btn.rank}×{btn.count}</span>
          </button>
        ))}
        {showPassButton && onPass && (
          <button
            type="button"
            disabled={isPassPending}
            onClick={() => onPass()}
            className={cn(
              'shrink-0 ml-auto rounded text-[11px] leading-tight px-2 py-1 border transition-colors whitespace-nowrap',
              isPassPending
                ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                : 'bg-white/10 border-white/30 text-white/85 hover:bg-white/20',
            )}
          >
            不叫庄
          </button>
        )}
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
import { getSuitSymbol, isRedSuit, getCardDisplayValue } from '@/lib/card';
import { ECardSuit, type ICard } from '@/types';

interface IPlayingCardProps {
  card: ICard;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  className?: string;
  isTrumpRank?: boolean; // 是否是级牌（叫庄阶段高亮）
  isTrump?: boolean; // 是否是主牌（叫庄结束后高亮）
  showTrumpLabel?: boolean; // 是否显示"主"标签
  isFriend?: boolean; // 是否是盟友牌
}

const SIZE_CLASSES = {
  sm: 'w-10 h-14 text-xs',
  md: 'w-14 h-20 text-sm',
  lg: 'w-20 h-28 text-base',
} as const;

export default function PlayingCard({
  card,
  selected = false,
  onClick,
  size = 'md',
  faceDown = false,
  className,
  isTrumpRank = false,
  isTrump = false,
  showTrumpLabel = false,
  isFriend = false,
}: IPlayingCardProps) {
  if (faceDown) {
    return (
      <div
        className={cn(
          'rounded-xl glass-card border-2 border-white/20 shadow-md',
          SIZE_CLASSES[size],
          className,
        )}
      >
        <div className="flex h-full items-center justify-center">
          <div className="h-3/4 w-3/4 rounded-lg glass border border-white/30" />
        </div>
      </div>
    );
  }

  const red = isRedSuit(card.suit);
  const isJoker = card.suit === ECardSuit.JOKER;
  const isBigJoker = isJoker && card.value === 'Big';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col rounded-xl glass-card shadow-md transition-all duration-200',
        SIZE_CLASSES[size],
        onClick && 'cursor-pointer hover:-translate-y-2 hover:shadow-xl hover:glass-strong active:translate-y-0',
        selected
          ? 'border-2 border-primary/60 -translate-y-3 shadow-lg shadow-primary/30 ring-2 ring-primary/40 glow-soft'
          : isTrumpRank
            ? 'border-2 border-secondary/60 ring-2 ring-secondary/40 shadow-secondary/30 glow-blue'
            : isTrump
              ? 'border-2 border-accent/60 ring-2 ring-accent/40 shadow-accent/30 glow-pink'
              : 'border-2 border-white/20',
        className,
      )}
    >
      {/* 主牌标签 */}
      {showTrumpLabel && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-lg glass-card bg-accent/90 px-2 py-1 text-[10px] font-bold text-white shadow-md border border-white/30">
          主
        </div>
      )}
      {/* 盟友牌标签 */}
      {isFriend && (
        <div className="absolute -right-1 -top-1 rounded-full glass-card bg-primary/90 px-2 py-1 text-[10px] font-bold text-white shadow-md border border-white/30">
          友
        </div>
      )}
      <div
        className={cn(
          'flex flex-1 flex-col items-start p-1.5 font-mono font-bold leading-none',
          red ? 'text-red-600' : isJoker ? (isBigJoker ? 'text-red-600' : 'text-slate-800') : 'text-slate-900',
        )}
      >
        <span className={size === 'sm' ? 'text-[11px]' : 'text-sm'}>
          {getCardDisplayValue(card)}
        </span>
        <span className={size === 'sm' ? 'text-sm' : 'text-base'}>
          {getSuitSymbol(card.suit)}
        </span>
      </div>
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center pointer-events-none',
          red ? 'text-red-600' : isJoker ? (isBigJoker ? 'text-red-600' : 'text-slate-800') : 'text-slate-900',
        )}
      >
        <span className={cn(size === 'sm' ? 'text-xl' : size === 'md' ? 'text-3xl' : 'text-4xl', 'opacity-15')}>
          {getSuitSymbol(card.suit)}
        </span>
      </div>
    </button>
  );
}

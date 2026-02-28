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
}: IPlayingCardProps) {
  if (faceDown) {
    return (
      <div
        className={cn(
          'rounded-lg border-2 border-slate-600 bg-gradient-to-br from-blue-900 to-blue-950 shadow-md',
          SIZE_CLASSES[size],
          className,
        )}
      >
        <div className="flex h-full items-center justify-center">
          <div className="h-3/4 w-3/4 rounded border border-blue-700 bg-blue-800/50" />
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
        'relative flex flex-col rounded-lg border-2 bg-white shadow-md transition-all duration-150',
        SIZE_CLASSES[size],
        onClick && 'cursor-pointer hover:-translate-y-1 hover:shadow-lg active:translate-y-0',
        selected
          ? 'border-amber-400 -translate-y-2 shadow-amber-400/30 ring-2 ring-amber-400/50'
          : isTrumpRank
            ? 'border-blue-400 ring-2 ring-blue-400/50 shadow-blue-400/30' // 级牌高亮（蓝色）
            : isTrump
              ? 'border-green-400 ring-2 ring-green-400/50 shadow-green-400/30' // 主牌高亮（绿色）
              : 'border-slate-200',
        className,
      )}
    >
      {/* 主牌标签 */}
      {showTrumpLabel && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded bg-green-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
          主
        </div>
      )}
      <div
        className={cn(
          'flex flex-1 flex-col items-start p-1 font-mono font-bold leading-none',
          red ? 'text-red-600' : isJoker ? (isBigJoker ? 'text-red-600' : 'text-slate-800') : 'text-slate-900',
        )}
      >
        <span className={size === 'sm' ? 'text-[10px]' : 'text-xs'}>
          {getCardDisplayValue(card)}
        </span>
        <span className={size === 'sm' ? 'text-xs' : 'text-sm'}>
          {getSuitSymbol(card.suit)}
        </span>
      </div>
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          red ? 'text-red-600' : isJoker ? (isBigJoker ? 'text-red-600' : 'text-slate-800') : 'text-slate-900',
        )}
      >
        <span className={cn(size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-3xl', 'opacity-20')}>
          {getSuitSymbol(card.suit)}
        </span>
      </div>
    </button>
  );
}

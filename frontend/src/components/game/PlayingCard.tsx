import { cn } from '@/lib/utils';
import { getSuitSymbol, isRedSuit, getCardDisplayValue, isJoker, isBigJoker, getJokerImageUrl } from '@/lib/card';
import type { ICard } from '@/types';

interface IPlayingCardProps {
  card: ICard;
  selected?: boolean;
  onClick?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  className?: string;
  isTrumpRank?: boolean;
  isOtherTrumpRank?: boolean;
  isTrump?: boolean;
  showTrumpLabel?: boolean;
  isFriend?: boolean;
  trumpType?: 'mine' | 'other' | 'confirmed';
}

const SIZE_CLASSES = {
  xs: 'w-8 h-11 text-[10px]',
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
  isOtherTrumpRank = false,
  isTrump = false,
  showTrumpLabel = false,
  isFriend = false,
  trumpType,
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
  const isJokerCard = isJoker(card);
  const isBig = isBigJoker(card);
  const jokerImageUrl = getJokerImageUrl(card);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col rounded-xl glass-card shadow-md transition-all duration-200 overflow-hidden',
        SIZE_CLASSES[size],
        onClick && 'cursor-pointer hover:-translate-y-2 hover:shadow-xl active:translate-y-0',
        selected
          ? 'border-2 border-purple-400/70 -translate-y-3 shadow-lg shadow-purple-500/40 ring-2 ring-purple-400/50'
          : isOtherTrumpRank
            ? 'border-2 border-white/60 ring-1 ring-white/40'
            : isTrumpRank
              ? 'border-2 border-amber-400/80 ring-2 ring-amber-400/50'
              : isTrump
                ? 'border-2 border-purple-400/60 ring-2 ring-purple-400/40'
                : 'border-2 border-white/20 hover:border-white/35 hover:shadow-lg hover:shadow-white/10',
        className,
      )}
    >
      {/* 闪光层 */}
      {trumpType === 'mine' && (
        <div className="absolute inset-0 z-20 pointer-events-none rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/40 to-transparent -translate-x-full
            animate-[flash-sweep_2s_ease-in-out_infinite]" />
        </div>
      )}
      {trumpType === 'other' && (
        <div className="absolute inset-0 z-20 pointer-events-none rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full
            animate-[flash-sweep_2.5s_ease-in-out_infinite]" />
        </div>
      )}
      {trumpType === 'confirmed' && (
        <div className="absolute inset-0 z-20 pointer-events-none rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-200/50 to-transparent -translate-x-full
            animate-[flash-sweep_3s_ease-in-out_infinite]" />
        </div>
      )}

      {/* 主牌标签 */}
      {showTrumpLabel && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-lg backdrop-blur-md bg-pink-500/80 border border-pink-300/40 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg shadow-pink-500/30 z-20">
          主
        </div>
      )}
      {/* 盟友牌标签 */}
      {isFriend && (
        <div className="absolute -right-1 -top-1 rounded-md backdrop-blur-md bg-purple-600/90 border border-purple-300/50 px-1 py-0.5 text-[9px] font-bold text-white shadow-lg shadow-purple-500/40 z-10">
          友
        </div>
      )}

      {/* 大小王显示图片 */}
      {isJokerCard ? (
        <div className="flex flex-1 items-center justify-center relative z-10">
          <img
            src={jokerImageUrl}
            alt={isBig ? '大王' : '小王'}
            className={cn(
              'object-contain',
              size === 'xs' ? 'w-6 h-8' : size === 'sm' ? 'w-7 h-10' : size === 'md' ? 'w-10 h-14' : 'w-14 h-20'
            )}
          />
        </div>
      ) : (
        <>
          <div
            className={cn(
              'flex flex-1 flex-col items-start p-1.5 font-mono font-bold leading-none relative z-10',
              red ? 'text-red-600' : 'text-slate-900',
            )}
          >
            <span className={size === 'xs' ? 'text-[9px]' : size === 'sm' ? 'text-[11px]' : 'text-sm'}>
              {getCardDisplayValue(card)}
            </span>
            <span className={size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-sm' : 'text-base'}>
              {getSuitSymbol(card.suit)}
            </span>
          </div>
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center pointer-events-none',
              red ? 'text-red-600' : 'text-slate-900',
            )}
          >
            <span className={cn(size === 'xs' ? 'text-lg' : size === 'sm' ? 'text-xl' : size === 'md' ? 'text-3xl' : 'text-4xl', 'opacity-15')}>
              {getSuitSymbol(card.suit)}
            </span>
          </div>
        </>
      )}
    </button>
  );
}

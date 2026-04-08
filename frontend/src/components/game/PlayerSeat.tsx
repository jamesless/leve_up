import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import type { IPlayer } from '@/types';

interface IPlayerSeatProps {
  player?: IPlayer;
  isCurrentTurn?: boolean;
  isDealer?: boolean;
  position?: 'top' | 'left' | 'right' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  score?: number; // 当前得分
  friendRevealed?: boolean;
  cardCount?: number;
}

// 五角星对称布局 - 玩家在底部中心，其他4人均匀分布形成对称美感
// 移动端调整：顶部和左右两侧往中间收拢，避免超出视口
const POSITION_STYLES: Record<string, React.CSSProperties> = {
  'top': {
    top: '4%',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  'top-left': {
    top: '30%',
    left: '4%',
  },
  'top-right': {
    top: '30%',
    right: '4%',
  },
  'bottom-left': {
    bottom: '20%',
    left: '10%',
  },
  'bottom-right': {
    bottom: '20%',
    right: '10%',
  },
  // Keeping old positions for backward compatibility
  'left': {
    top: '30%',
    left: '4%',
  },
  'right': {
    top: '30%',
    right: '4%',
  },
};

export default function PlayerSeat({
  player,
  isCurrentTurn = false,
  isDealer = false,
  position,
  score = 0,
  friendRevealed,
  cardCount,
}: IPlayerSeatProps) {
  const positionStyle = position ? POSITION_STYLES[position] || {} : {};

  return (
    <div
      className="absolute flex flex-col items-center gap-1 sm:gap-1.5"
      style={positionStyle}
    >
      {/* 玩家信息卡 */}
      {player && (
        <div className="glass-card rounded-xl px-2 py-1 sm:px-2.5 sm:py-1.5 backdrop-blur-md border border-white/20 bg-white/10 shadow-lg">
          <span className="text-[9px] sm:text-xs font-medium text-white/90 max-w-[60px] sm:max-w-[80px] truncate block">
            {player.username}
          </span>
        </div>
      )}

      <div className="relative">
        {/* 头像光晕（轮到时） */}
        {isCurrentTurn && (
          <div className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)',
              filter: 'blur(8px)',
              animation: 'seat-glow 2s ease-in-out infinite',
            }} />
        )}
        <div
          className={cn(
            'relative flex items-center justify-center rounded-full border-2 transition-all backdrop-blur-md',
            // 移动端更小头像
            'h-9 w-9 sm:h-11 sm:w-11 md:h-13 md:w-13',
            player
              ? isCurrentTurn
                ? 'border-purple-400 bg-purple-500/25 shadow-lg shadow-purple-500/30'
                : 'border-white/30 bg-white/10'
              : 'border-dashed border-white/20 bg-white/5',
          )}
        >
          {player ? (
            player.isAI ? (
              <span className="text-sm sm:text-base md:text-lg">🤖</span>
            ) : (
              <User className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white/70" />
            )
          ) : (
            <span className="text-[8px] sm:text-xs text-white/30">空</span>
          )}
        </div>
        {player && !player.isAI && (
          <span
            className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 text-[8px] sm:text-[10px] px-0.5 sm:px-1 py-0 min-w-[14px] sm:min-w-[18px] h-[14px] sm:h-[18px] flex items-center justify-center glass-card border border-white/30 text-white/90 shadow-md backdrop-blur-sm rounded-full"
          >
            {player.level || '2'}
          </span>
        )}
      </div>

      {player && (
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex gap-0.5 flex-wrap justify-center">
            {isDealer && (
              <span className="status-badge-glass rounded-full px-1.5 py-0 text-[8px] sm:text-[10px] border-amber-400/50 text-amber-300 backdrop-blur-sm">
                庄
              </span>
            )}
            {player.isAI && (
              <span className="status-badge-glass rounded-full px-1.5 py-0 text-[8px] sm:text-[10px] border-blue-400/40 text-blue-300 backdrop-blur-sm">
                AI
              </span>
            )}
            {(friendRevealed || player.isFriend) && (
              <span className="status-badge-glass rounded-full px-1.5 py-0 text-[8px] sm:text-[10px] border-primary/50 text-primary-foreground backdrop-blur-sm">
                友
              </span>
            )}
            <span className="status-badge-glass rounded-full px-1.5 py-0 text-[8px] sm:text-[10px] border-white/20 text-white/50 backdrop-blur-sm">
              {cardCount ?? player.cardCount ?? 0}张
            </span>
            {score > 0 && (
              <span className="status-badge-glass rounded-full px-1.5 py-0 text-[8px] sm:text-[10px] border-emerald-400/40 text-emerald-300 backdrop-blur-sm">
                {score}分
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

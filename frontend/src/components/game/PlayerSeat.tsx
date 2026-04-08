import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
      className="absolute flex flex-col items-center gap-0.5 sm:gap-1"
      style={positionStyle}
    >
      <div className="relative">
        <div
          className={cn(
            'flex items-center justify-center rounded-full border-2 transition-all',
            // 移动端更小头像
            'h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12',
            player
              ? isCurrentTurn
                ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/20'
                : 'border-slate-600 bg-slate-800'
              : 'border-dashed border-slate-700 bg-slate-900/50',
          )}
        >
          {player ? (
            player.isAI ? (
              <span className="text-sm sm:text-base md:text-lg">🤖</span>
            ) : (
              <User className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-slate-400" />
            )
          ) : (
            <span className="text-[8px] sm:text-xs text-slate-600">空</span>
          )}
        </div>
        {player && !player.isAI && (
          <Badge
            variant="default"
            className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 text-[8px] sm:text-[10px] px-0.5 sm:px-1 py-0 min-w-[14px] sm:min-w-[18px] h-[14px] sm:h-[18px] flex items-center justify-center bg-amber-500 text-white border-0"
          >
            {player.level || '2'}
          </Badge>
        )}
      </div>
      {player && (
        <div className="flex flex-col items-center gap-0">
          <span className="text-[9px] sm:text-xs font-medium text-slate-300 max-w-[60px] sm:max-w-[80px] truncate">
            {player.username}
          </span>
          <div className="flex gap-0.5 flex-wrap justify-center">
            {isDealer && <Badge variant="warning" className="text-[8px] sm:text-[10px] px-1 py-0">庄</Badge>}
            {player.isAI && <Badge variant="secondary" className="text-[8px] sm:text-[10px] px-1 py-0">AI</Badge>}
            {(friendRevealed || player.isFriend) && <Badge variant="secondary" className="text-[8px] sm:text-[10px] px-1 py-0 bg-purple-600/30 text-purple-300 border-purple-500/30">友</Badge>}
            <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1 py-0 text-slate-400 border-slate-700">
              {cardCount ?? player.cardCount ?? 0}张
            </Badge>
            {score > 0 && (
              <Badge variant="secondary" className="text-[8px] sm:text-[10px] px-1 py-0 bg-green-600/20 text-green-400 border-green-600/30">
                {score}分
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

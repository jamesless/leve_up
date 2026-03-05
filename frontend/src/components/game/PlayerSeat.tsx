import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { IPlayer } from '@/types';

interface IPlayerSeatProps {
  player?: IPlayer;
  isCurrentTurn?: boolean;
  isDealer?: boolean;
  position: 'top' | 'left' | 'right' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

// 圆桌布局：5个玩家均匀分布在圆周上
// 假设玩家自己在底部中心，其他4个玩家分布在圆周的其他位置
const POSITION_STYLES: Record<string, React.CSSProperties> = {
  'top': {
    top: '8%',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  'top-left': {
    top: '20%',
    left: '15%',
  },
  'top-right': {
    top: '20%',
    right: '15%',
  },
  'bottom-left': {
    bottom: '25%',
    left: '8%',
  },
  'bottom-right': {
    bottom: '25%',
    right: '8%',
  },
  // Keeping old positions for backward compatibility
  'left': {
    top: '20%',
    left: '15%',
  },
  'right': {
    top: '20%',
    right: '15%',
  },
};

export default function PlayerSeat({
  player,
  isCurrentTurn = false,
  isDealer = false,
  position,
}: IPlayerSeatProps) {
  const positionStyle = POSITION_STYLES[position] || {};

  return (
    <div
      className="absolute flex flex-col items-center gap-1"
      style={positionStyle}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all',
          player
            ? isCurrentTurn
              ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/20'
              : 'border-slate-600 bg-slate-800'
            : 'border-dashed border-slate-700 bg-slate-900/50',
        )}
      >
        {player ? (
          player.isAI ? (
            <span className="text-lg">🤖</span>
          ) : (
            <User className="h-5 w-5 text-slate-400" />
          )
        ) : (
          <span className="text-xs text-slate-600">空位</span>
        )}
      </div>
      {player && (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs font-medium text-slate-300 max-w-[80px] truncate">
            {player.username}
          </span>
          <div className="flex gap-1">
            {isDealer && <Badge variant="warning" className="text-[10px] px-1.5 py-0">庄</Badge>}
            {player.isAI && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">AI</Badge>}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-400 border-slate-700">
              {player.cardCount}张
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}

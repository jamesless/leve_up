import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { IPlayer } from '@/types';

interface IPlayerSeatProps {
  player?: IPlayer;
  isCurrentTurn?: boolean;
  isDealer?: boolean;
  position: 'top' | 'left' | 'right' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  score?: number; // 当前得分
}

// 五角星对称布局 - 玩家在底部中心，其他4人均匀分布形成对称美感
const POSITION_STYLES: Record<string, React.CSSProperties> = {
  'top': {
    top: '8%',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  'top-left': {
    top: '25%',
    left: '12%',
  },
  'top-right': {
    top: '25%',
    right: '12%',
  },
  'bottom-left': {
    bottom: '28%',
    left: '18%',
  },
  'bottom-right': {
    bottom: '28%',
    right: '18%',
  },
  // Keeping old positions for backward compatibility
  'left': {
    top: '25%',
    left: '12%',
  },
  'right': {
    top: '25%',
    right: '12%',
  },
};

export default function PlayerSeat({
  player,
  isCurrentTurn = false,
  isDealer = false,
  position,
  score = 0,
}: IPlayerSeatProps) {
  const positionStyle = POSITION_STYLES[position] || {};

  return (
    <div
      className="absolute flex flex-col items-center gap-2"
      style={positionStyle}
    >
      <div className="relative">
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all glass-card',
            player
              ? isCurrentTurn
                ? 'border-primary/60 shadow-lg shadow-primary/30 glow-soft'
                : 'border-white/20'
              : 'border-dashed border-white/10',
          )}
        >
          {player ? (
            player.isAI ? (
              <span className="text-xl">🤖</span>
            ) : (
              <User className="h-6 w-6 text-foreground/80" />
            )
          ) : (
            <span className="text-xs text-muted-foreground">空位</span>
          )}
        </div>
        {player && !player.isAI && (
          <Badge
            variant="default"
            className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 min-w-[20px] h-[20px] flex items-center justify-center bg-gradient-to-r from-primary to-accent text-white border-0 shadow-md"
          >
            {player.level || '2'}
          </Badge>
        )}
      </div>
      {player && (
        <div className="flex flex-col items-center gap-1 glass-light rounded-xl px-3 py-2 min-w-[100px]">
          <span className="text-sm font-semibold text-foreground max-w-[90px] truncate">
            {player.username}
          </span>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {isDealer && <Badge variant="default" className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-accent to-primary">庄</Badge>}
            {player.isAI && <Badge variant="secondary" className="text-[10px] px-2 py-0.5 glass">AI</Badge>}
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 glass-light border-white/20">
              {player.cardCount}张
            </Badge>
            {score > 0 && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 glass-blue border-secondary/30 text-secondary font-semibold">
                {score}分
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

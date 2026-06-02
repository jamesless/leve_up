import { Button } from '@/components/ui/button';
import type { IGameState, IGameRoundResult } from '@/types/game';

interface IFinishedPanelProps {
  game: IGameState;
  userId?: string;
  onNextRound: () => void;
  isNextRoundPending: boolean;
}

function formatTeamName(team?: 'host' | 'guest'): string {
  if (team === 'host') return '庄家方';
  if (team === 'guest') return '闲家方';
  return '未知';
}

function getMyResult(
  results: IGameRoundResult[] | undefined,
  userId?: string,
): IGameRoundResult | undefined {
  if (!results || !userId) return undefined;
  return results.find((r) => r.user_id === userId);
}

export default function FinishedPanel({
  game,
  userId,
  onNextRound,
  isNextRoundPending,
}: IFinishedPanelProps) {
  const winnerTeam = game.lastPlay?.winnerTeam;
  const finalScore = game.lastPlay?.finalScore ?? game.totalPoints ?? 0;
  const results = game.lastPlay?.gameResults ?? game.roundResults;
  const myResult = getMyResult(results, userId);

  const dealerSeatList =
    game.dealerTeam && game.dealerTeam.length > 0
      ? game.dealerTeam
          .map((seat) => {
            const p = game.players.find((pl) => pl.position === seat);
            return p ? p.username : `座位${seat}`;
          })
          .join('、')
      : '未确定';

  return (
    <div className="border-b border-amber-300/30 bg-gradient-to-r from-amber-900/40 via-purple-900/40 to-amber-900/40 backdrop-blur-md px-4 py-4 shadow-[0_4px_24px_rgba(251,191,36,0.15)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-amber-200">本局结算</h2>
            <p className="mt-0.5 text-sm text-white/60">
              {winnerTeam
                ? `${formatTeamName(winnerTeam)} 获胜 · 抓分方共 ${finalScore} 分`
                : '游戏已结束'}
            </p>
          </div>
          <Button
            variant="game"
            onClick={onNextRound}
            disabled={isNextRoundPending}
          >
            {isNextRoundPending ? '准备中...' : '开始下一局'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg glass-card border border-white/15 px-3 py-2">
            <div className="text-xs text-white/50">庄家</div>
            <div className="mt-1 text-sm font-semibold text-white/90">
              {dealerSeatList}
            </div>
          </div>
          <div className="rounded-lg glass-card border border-white/15 px-3 py-2">
            <div className="text-xs text-white/50">当前级别</div>
            <div className="mt-1 text-sm font-semibold text-white/90">
              {game.currentLevel ?? '-'}
            </div>
          </div>
          <div className="rounded-lg glass-card border border-white/15 px-3 py-2">
            <div className="text-xs text-white/50">我的结果</div>
            <div className="mt-1 text-sm font-semibold text-white/90">
              {myResult
                ? `${myResult.is_winner ? '胜' : '负'} · ${myResult.old_level} → ${myResult.new_level}`
                : '—'}
            </div>
          </div>
        </div>

        {results && results.length > 0 && (
          <div className="rounded-lg glass-card border border-white/15 p-3">
            <div className="mb-2 text-xs text-white/50">全场结果</div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              {results.map((r) => {
                const player = game.players.find(
                  (p) => String(p.id) === r.user_id,
                );
                const name = player?.username ?? `玩家${r.user_id}`;
                return (
                  <div
                    key={r.user_id}
                    className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-sm ${
                      r.is_winner
                        ? 'border-amber-300/40 bg-amber-500/10 text-amber-100'
                        : 'border-white/10 bg-white/5 text-white/70'
                    }`}
                  >
                    <span className="truncate">{name}</span>
                    <span className="ml-2 text-xs">
                      {r.old_level} → {r.new_level}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

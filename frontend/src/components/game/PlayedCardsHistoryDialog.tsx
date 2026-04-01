import { X, History, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlayerPlayedCards } from '@/hooks/useGame';
import { cn } from '@/lib/utils';
import type { IPlayedCards, IPlayer } from '@/types';

interface PlayedCardsHistoryDialogProps {
  gameId: string;
  onClose: () => void;
  currentTrick: IPlayedCards[]; // 当前轮次所有人出的牌
  lastCompletedTrick: IPlayedCards[]; // 上一轮完成的所有人出的牌
  players: IPlayer[]; // 所有玩家信息
  myPosition: number; // 自己的座位号
}

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
  joker: '🃏',
};

const getSuitClass = (suit: string) => {
  if (suit === 'hearts' || suit === 'diamonds') {
    return 'text-red-600';
  }
  return 'text-slate-900';
};

export default function PlayedCardsHistoryDialog({
  gameId,
  onClose,
  currentTrick,
  lastCompletedTrick,
  players,
  myPosition,
}: PlayedCardsHistoryDialogProps) {
  const { data, isLoading } = usePlayerPlayedCards(gameId, true);

  // 过滤出别人在当前轮次出的牌（不包括自己）
  const othersCurrentPlay = currentTrick.filter((played) => played.playerId !== myPosition);

  // 获取玩家名称
  const getPlayerName = (playerId: number) => {
    const player = players.find((p) => p.id === playerId);
    return player?.username || `玩家${playerId}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg border-2 border-blue-500/50 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-bold text-slate-100">我的出牌记录</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                <p className="text-slate-400">加载中...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 上一轮完成的所有玩家的牌 */}
              {lastCompletedTrick.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-400" />
                    <h4 className="text-sm font-semibold text-slate-200">
                      上一轮 - 所有玩家的牌
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {lastCompletedTrick.map((played, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-green-700/50 bg-green-900/20 p-4"
                      >
                        <div className="mb-2 text-sm font-medium text-green-300">
                          {getPlayerName(played.playerId)}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {played.cards.map((card, cardIndex) => (
                            <div
                              key={cardIndex}
                              className={cn(
                                'flex h-16 w-12 flex-col items-center justify-center rounded-md border-2 bg-white text-sm font-bold shadow-sm',
                                'border-slate-300'
                              )}
                            >
                              <span className={getSuitClass(card.suit)}>
                                {SUIT_SYMBOLS[card.suit] || ''}
                              </span>
                              <span className={getSuitClass(card.suit)}>
                                {card.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 分隔线 */}
              {lastCompletedTrick.length > 0 && othersCurrentPlay.length > 0 && (
                <div className="border-t border-slate-700"></div>
              )}

              {/* 当前轮次其他玩家的牌 */}
              {othersCurrentPlay.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-400" />
                    <h4 className="text-sm font-semibold text-slate-200">
                      当前轮次 - 其他玩家的牌
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {othersCurrentPlay.map((played, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-amber-700/50 bg-amber-900/20 p-4"
                      >
                        <div className="mb-2 text-sm font-medium text-amber-300">
                          {getPlayerName(played.playerId)}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {played.cards.map((card, cardIndex) => (
                            <div
                              key={cardIndex}
                              className={cn(
                                'flex h-16 w-12 flex-col items-center justify-center rounded-md border-2 bg-white text-sm font-bold shadow-sm',
                                'border-slate-300'
                              )}
                            >
                              <span className={getSuitClass(card.suit)}>
                                {SUIT_SYMBOLS[card.suit] || ''}
                              </span>
                              <span className={getSuitClass(card.suit)}>
                                {card.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 分隔线 */}
              {othersCurrentPlay.length > 0 && data?.playedCards && data.playedCards.length > 0 && (
                <div className="border-t border-slate-700"></div>
              )}

              {/* 我的出牌历史 */}
              {data?.playedCards && data.playedCards.length > 0 ? (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <History className="h-4 w-4 text-blue-400" />
                    <h4 className="text-sm font-semibold text-slate-200">
                      我的出牌历史
                    </h4>
                  </div>
                  <div className="space-y-4">
                    {data.playedCards.map((record, index) => {
                      const cards = record.actionData?.cards || [];
                      const playType = record.actionData?.play_type || '出牌';
                      const isLead = record.actionData?.is_lead || false;

                      return (
                        <div
                          key={record.id}
                          className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-300">
                                第 {index + 1} 次
                              </span>
                              {isLead && (
                                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                                  领牌
                                </span>
                              )}
                              <span className="text-xs text-slate-500">
                                {playType}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(record.timestamp).toLocaleTimeString('zh-CN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>

                          {/* Cards */}
                          <div className="flex flex-wrap gap-2">
                            {cards.map((card, cardIndex) => (
                              <div
                                key={cardIndex}
                                className={cn(
                                  'flex h-16 w-12 flex-col items-center justify-center rounded-md border-2 bg-white text-sm font-bold shadow-sm',
                                  'border-slate-300'
                                )}
                              >
                                <span className={getSuitClass(card.suit)}>
                                  {SUIT_SYMBOLS[card.suit] || ''}
                                </span>
                                <span className={getSuitClass(card.suit)}>
                                  {card.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                !lastCompletedTrick.length && !othersCurrentPlay.length && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <History className="mb-4 h-12 w-12 text-slate-600" />
                    <p className="text-slate-400">还没有出牌记录</p>
                    <p className="mt-2 text-sm text-slate-500">
                      开始出牌后，这里会显示你的所有出牌历史
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 bg-slate-800 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              {lastCompletedTrick.length > 0 && (
                <span className="mr-4">上一轮: {lastCompletedTrick.length} 位玩家</span>
              )}
              {othersCurrentPlay.length > 0 && (
                <span className="mr-4">当前轮: {othersCurrentPlay.length} 位已出牌</span>
              )}
              {data?.count ? `我的历史: ${data.count} 次` : ''}
            </span>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
            >
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

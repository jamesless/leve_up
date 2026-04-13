import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, User, Play, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { useGameReplay, useGameActions } from '@/hooks/useGame';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';

type TActionItem = {
  id?: number;
  actionType?: string;
  playerSeat?: number;
  playerId?: string;
  actionData?: {
    card_indices?: number[];
    cards?: Array<{ suit: string; value: string }>;
    is_lead?: boolean;
    play_type?: string;
    suit?: string;
    rank?: string;
    count?: number;
    friend_card?: { suit: string; value: string; position: number };
    trump_suit?: string;
    trump_rank?: string;
    dealer_seat?: number;
    revealed?: boolean;
    friend_seat?: number;
    is_solo?: boolean;
  };
  resultData?: Record<string, unknown>;
  timestamp?: string;
};

type TReplayData = {
  gameId?: string;
  totalActions?: number;
  durationSeconds?: number;
  winnerTeam?: string;
  finalScore?: number;
  initialState?: {
    dealerSeat?: number;
    trumpSuit?: string;
    trumpRank?: string;
  };
  finalState?: {
    totalPoints?: number;
    winnerTeam?: string;
    results?: Array<{
      playerId?: string;
      playerName?: string;
      isWinner?: boolean;
      score?: number;
    }>;
  };
};

// 花色符号映射
const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
  joker: '🃏',
};

const getSuitClass = (suit: string): string => {
  if (suit === 'hearts' || suit === 'diamonds') return 'text-red-500';
  if (suit === 'clubs' || suit === 'spades') return 'text-slate-200';
  if (suit === 'joker') return 'text-purple-400';
  return 'text-slate-200';
};

// 获取动作描述
const getActionDescription = (action: TActionItem): string => {
  switch (action.actionType) {
    case 'game_create':
      return '创建游戏';
    case 'player_join':
      return `玩家 ${action.playerSeat} 加入`;
    case 'player_ready':
      return `玩家 ${action.playerSeat} 准备`;
    case 'start_game':
      return '游戏开始';
    case 'deal_cards':
      return '发牌';
    case 'call_dealer':
      return `叫庄: ${SUIT_SYMBOLS[action.actionData?.suit || ''] || ''}${action.actionData?.rank || ''} (${action.actionData?.count || 0}张)`;
    case 'pass_call':
      return '不叫';
    case 'dealer_confirmed':
      return `庄家确认: ${SUIT_SYMBOLS[action.resultData?.trump_suit as string || ''] || ''}${action.resultData?.trump_rank || ''}`;
    case 'call_friend':
      return `叫朋友: ${SUIT_SYMBOLS[action.actionData?.friend_card?.suit || ''] || ''}${action.actionData?.friend_card?.value || ''} 第${action.actionData?.friend_card?.position || ''}张`;
    case 'friend_revealed':
      return action.actionData?.revealed ? `朋友揭晓: 座位${action.actionData?.friend_seat}` : '1打4独打模式';
    case 'discard_bottom':
      return '扣底牌';
    case 'play_cards':
      const playType = action.actionData?.play_type || '单牌';
      const typeNames: Record<string, string> = {
        single: '单牌',
        pair: '对子',
        triple: '三张',
        tractor: '拖拉机',
        throw: '甩牌',
      };
      return `${typeNames[playType] || playType}: ${(action.actionData?.cards || []).map(c => `${SUIT_SYMBOLS[c.suit] || ''}${c.value}`).join(' ')}`;
    case 'pass_turn':
      return '不出';
    case 'trick_complete':
      return `本轮结束, ${action.resultData?.winner_seat ? `座位${action.resultData.winner_seat}获胜` : ''}`;
    case 'round_complete':
      return '一局结束';
    case 'game_end':
      return `游戏结束: ${action.resultData?.winner_team === 'host' ? '庄家队胜利' : action.resultData?.winner_team === 'guest' ? '防守队胜利' : action.resultData?.winner_team || '-'}`;
    default:
      return action.actionType || '未知动作';
  }
};

// 获取动作类型分组
const getActionCategory = (actionType?: string): string => {
  if (!actionType) return 'other';
  if (['game_create', 'player_join', 'player_ready', 'start_game'].includes(actionType)) return 'setup';
  if (['deal_cards', 'call_dealer', 'pass_call', 'dealer_confirmed'].includes(actionType)) return 'calling';
  if (['call_friend', 'friend_revealed'].includes(actionType)) return 'friend';
  if (['discard_bottom'].includes(actionType)) return 'discard';
  if (['play_cards', 'pass_turn', 'trick_complete'].includes(actionType)) return 'playing';
  if (['round_complete', 'game_end'].includes(actionType)) return 'end';
  return 'other';
};

export default function Replay() {
  const { id } = useParams<{ id: string }>();
  const gameId = id ?? '';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const replayQuery = useGameReplay(gameId);
  const actionsQuery = useGameActions(gameId);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['playing']));
  const [selectedAction, setSelectedAction] = useState<TActionItem | null>(null);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!gameId) return <Navigate to="/game" replace />;

  if (replayQuery.isLoading || actionsQuery.isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (replayQuery.isError || actionsQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>回放加载失败</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            无法获取回放数据，请稍后重试。
          </CardContent>
        </Card>
      </div>
    );
  }

  const replayData = (replayQuery.data?.replay as TReplayData) || {};
  const actions = (actionsQuery.data?.actions ?? []) as TActionItem[];

  // 按类别分组动作
  const groupedActions = useMemo(() => {
    const groups: Record<string, TActionItem[]> = {
      setup: [],
      calling: [],
      friend: [],
      discard: [],
      playing: [],
      end: [],
      other: [],
    };

    actions.forEach(action => {
      const category = getActionCategory(action.actionType);
      groups[category].push(action);
    });

    return groups;
  }, [actions]);

  // 统计每个玩家出的牌
  const playerStats = useMemo(() => {
    const stats: Record<number, { playedCards: Array<{ suit: string; value: string }>; count: number }> = {};

    actions.forEach(action => {
      if (action.actionType === 'play_cards' && action.playerSeat) {
        if (!stats[action.playerSeat]) {
          stats[action.playerSeat] = { playedCards: [], count: 0 };
        }
        const cards = action.actionData?.cards || [];
        stats[action.playerSeat].playedCards.push(...cards);
        stats[action.playerSeat].count += cards.length;
      }
    });

    return stats;
  }, [actions]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const categoryNames: Record<string, string> = {
    setup: '游戏设置',
    calling: '叫庄阶段',
    friend: '叫朋友',
    discard: '扣牌',
    playing: '出牌记录',
    end: '结算',
    other: '其他',
  };

  const categoryOrder = ['setup', 'calling', 'friend', 'discard', 'playing', 'end', 'other'];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-emerald-950 to-slate-950">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-black/50 backdrop-blur-md px-4 py-3">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1 text-white/80 hover:text-white hover:bg-white/10" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <h1 className="text-lg font-bold text-white">游戏回放</h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* 游戏概览 */}
        <Card className="bg-black/30 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-400" />
              游戏概览
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-white">{replayData.totalActions ?? actions.length}</div>
                <div className="text-xs text-white/60">总动作数</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-emerald-400">{replayData.durationSeconds ?? 0}s</div>
                <div className="text-xs text-white/60">游戏时长</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-amber-400">
                  {replayData.winnerTeam === 'host' ? '庄家' : replayData.winnerTeam === 'guest' ? '防守' : '-'}
                </div>
                <div className="text-xs text-white/60">获胜方</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-purple-400">{replayData.finalScore ?? '-'}</div>
                <div className="text-xs text-white/60">最终得分</div>
              </div>
            </div>

            {/* 主牌信息 */}
            {(replayData.initialState?.trumpSuit || replayData.initialState?.trumpRank) && (
              <div className="mt-4 flex items-center justify-center gap-4">
                <div className={cn(
                  'px-4 py-2 rounded-lg border',
                  replayData.initialState?.trumpSuit === 'hearts' || replayData.initialState?.trumpSuit === 'diamonds'
                    ? 'bg-red-500/20 border-red-400/50'
                    : 'bg-slate-500/20 border-slate-400/50'
                )}>
                  <span className={cn('text-2xl font-black', getSuitClass(replayData.initialState?.trumpSuit || ''))}>
                    {SUIT_SYMBOLS[replayData.initialState?.trumpSuit || ''] || ''}
                  </span>
                </div>
                <div className="text-white">
                  <span className="text-sm text-white/60">主牌</span>
                  <span className="ml-2 font-bold">{replayData.initialState?.trumpRank}级</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 玩家出牌统计 */}
        {Object.keys(playerStats).length > 0 && (
          <Card className="bg-black/30 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <User className="h-5 w-5 text-amber-400" />
                玩家出牌统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(playerStats)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([seat, stats]) => (
                    <div key={seat} className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white">座位 {seat}</span>
                        <span className="text-sm text-white/60">{stats.count}张</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {stats.playedCards.map((card, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'w-7 h-9 rounded flex flex-col items-center justify-center text-xs font-bold border',
                              card.suit === 'hearts' || card.suit === 'diamonds'
                                ? 'bg-red-500/20 border-red-400/50'
                                : card.suit === 'joker'
                                  ? 'bg-purple-500/20 border-purple-400/50'
                                  : 'bg-slate-500/20 border-slate-400/50'
                            )}
                          >
                            <span className={cn('text-[10px] leading-none', getSuitClass(card.suit))}>
                              {SUIT_SYMBOLS[card.suit] || ''}
                            </span>
                            <span className={cn('text-[8px] leading-none', getSuitClass(card.suit))}>
                              {card.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 动作时间线 */}
        <Card className="bg-black/30 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <ChevronRight className="h-5 w-5 text-blue-400" />
              动作时间线
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categoryOrder.map(category => {
              const categoryActions = groupedActions[category] || [];
              if (categoryActions.length === 0) return null;

              const isExpanded = expandedCategories.has(category);

              return (
                <div key={category} className="rounded-lg border border-white/10 overflow-hidden">
                  {/* 类别标题 */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'w-2 h-2 rounded-full',
                        category === 'setup' ? 'bg-blue-400' :
                        category === 'calling' ? 'bg-amber-400' :
                        category === 'friend' ? 'bg-purple-400' :
                        category === 'discard' ? 'bg-orange-400' :
                        category === 'playing' ? 'bg-emerald-400' :
                        category === 'end' ? 'bg-red-400' : 'bg-gray-400'
                      )} />
                      <span className="font-medium text-white">{categoryNames[category]}</span>
                      <span className="text-sm text-white/50">({categoryActions.length}个动作)</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-white/50" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-white/50" />
                    )}
                  </button>

                  {/* 动作列表 */}
                  {isExpanded && (
                    <div className="divide-y divide-white/5">
                      {categoryActions.map((action, idx) => (
                        <button
                          key={action.id ?? idx}
                          onClick={() => setSelectedAction(selectedAction?.id === action.id ? null : action)}
                          className={cn(
                            'w-full text-left px-4 py-2 hover:bg-white/5 transition-colors',
                            selectedAction?.id === action.id && 'bg-white/10'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {/* 序号 */}
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm text-white/60">
                              {idx + 1}
                            </span>

                            {/* 主牌图标 */}
                            {action.actionType === 'play_cards' && (action.actionData?.cards || []).length > 0 && (
                              <div className="flex gap-0.5">
                                {action.actionData?.cards?.slice(0, 5).map((card, cIdx) => (
                                  <div
                                    key={cIdx}
                                    className={cn(
                                      'w-6 h-8 rounded flex flex-col items-center justify-center text-xs font-bold border',
                                      card.suit === 'hearts' || card.suit === 'diamonds'
                                        ? 'bg-red-500/20 border-red-400/50'
                                        : card.suit === 'joker'
                                          ? 'bg-purple-500/20 border-purple-400/50'
                                          : 'bg-slate-500/20 border-slate-400/50'
                                    )}
                                  >
                                    <span className={cn('text-[9px] leading-none', getSuitClass(card.suit))}>
                                      {SUIT_SYMBOLS[card.suit] || ''}
                                    </span>
                                    <span className={cn('text-[7px] leading-none', getSuitClass(card.suit))}>
                                      {card.value}
                                    </span>
                                  </div>
                                ))}
                                {(action.actionData?.cards?.length || 0) > 5 && (
                                  <div className="w-6 h-8 rounded bg-white/10 flex items-center justify-center text-[10px] text-white/60">
                                    +{(action.actionData?.cards?.length || 0) - 5}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 动作描述 */}
                            <div className="flex-1">
                              <div className="text-sm text-white">
                                {getActionDescription(action)}
                              </div>
                              <div className="text-xs text-white/50">
                                {action.playerSeat ? `座位${action.playerSeat}` : ''}
                                {action.timestamp && ` · ${new Date(action.timestamp).toLocaleTimeString()}`}
                              </div>
                            </div>

                            {/* 牌型标签 */}
                            {action.actionType === 'play_cards' && action.actionData?.play_type && (
                              <span className={cn(
                                'px-2 py-0.5 rounded text-xs font-medium',
                                action.actionData.play_type === 'tractor' ? 'bg-orange-500/30 text-orange-300' :
                                action.actionData.play_type === 'pair' ? 'bg-blue-500/30 text-blue-300' :
                                action.actionData.play_type === 'triple' ? 'bg-purple-500/30 text-purple-300' :
                                'bg-emerald-500/30 text-emerald-300'
                              )}>
                                {action.actionData.play_type === 'tractor' ? '拖拉机' :
                                 action.actionData.play_type === 'pair' ? '对子' :
                                 action.actionData.play_type === 'triple' ? '三张' :
                                 action.actionData.play_type === 'throw' ? '甩牌' : '单牌'}
                              </span>
                            )}
                          </div>

                          {/* 展开详情 */}
                          {selectedAction?.id === action.id && (
                            <div className="mt-3 pl-11">
                              <div className="p-3 rounded bg-black/30 border border-white/10 text-xs text-white/70 space-y-1">
                                <div>动作类型: {action.actionType}</div>
                                {action.playerSeat && <div>座位: {action.playerSeat}</div>}
                                {action.playerId && <div>玩家ID: {action.playerId}</div>}
                                {action.actionData?.cards && (
                                  <div className="mt-2">
                                    <div className="text-white/50 mb-1">出的牌:</div>
                                    <div className="flex flex-wrap gap-1">
                                      {action.actionData.cards.map((card, cIdx) => (
                                        <span key={cIdx} className={cn('font-bold', getSuitClass(card.suit))}>
                                          {SUIT_SYMBOLS[card.suit]}{card.value}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {action.timestamp && (
                                  <div>时间: {new Date(action.timestamp).toLocaleString()}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {actions.length === 0 && (
              <div className="text-center py-8 text-white/50">
                暂无动作记录
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useParams, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, ArrowLeft, Play, SkipForward, Film, Eye, EyeOff, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PlayerHand from '@/components/game/PlayerHand';
import PlayerSeat from '@/components/game/PlayerSeat';
import CallDealerDialog from '@/components/game/CallDealerDialog';
import DiscardDialog from '@/components/game/DiscardDialog';
import CallFriendDialog from '@/components/game/CallFriendDialog';
import PlayedCardsHistoryDialog from '@/components/game/PlayedCardsHistoryDialog';
import {
  useGameTable,
  usePlayCards,
  usePassTurn,
  useAiPlay,
  useStartSinglePlayerGame,
  useCallDealer,
  usePassCall,
  useDiscardBottomCards,
  useCallFriend,
  useJoinGame,
  usePlayerReady,
  useCancelReady,
  useReadyStatus,
  useDealNextCard,
} from '@/hooks/useGame';
import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { EGameStatus, ECardSuit } from '@/types';
import { useEffect, useRef, useState } from 'react';

// 五角星对称布局 - 玩家在底部，其他4人均匀分布
const SEAT_POSITIONS = ['top', 'top-left', 'bottom-left', 'bottom-right', 'top-right'] as const;

// 花色符号映射
const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
  joker: 'Joker',
};

// 获取花色显示类名
const getSuitClass = (suit: string): string => {
  if (suit === 'hearts' || suit === 'diamonds') return 'text-red-600';
  if (suit === 'clubs' || suit === 'spades') return 'text-slate-900';
  if (suit === 'joker') return 'text-purple-600';
  return 'text-slate-900';
};

export default function GameTable() {
  const { id } = useParams<{ id: string }>();
  const gameId = id ?? '';
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const { selectedCardIndices, clearSelection } = useGameStore();
  const isSinglePlayerRoute = location.pathname.startsWith('/game/singleplayer/');

  const { data, isLoading, isError } = useGameTable(gameId);
  const playCards = usePlayCards(gameId);
  const passTurn = usePassTurn(gameId);
  const aiPlay = useAiPlay(gameId);
  const callDealerMutation = useCallDealer(gameId);
  const passCallMutation = usePassCall(gameId);
  const discardMutation = useDiscardBottomCards(gameId);
  const callFriendMutation = useCallFriend(gameId);
  const startSinglePlayerMutation = useStartSinglePlayerGame(gameId);
  const joinGameMutation = useJoinGame();
  const readyMutation = usePlayerReady(gameId);
  const cancelReadyMutation = useCancelReady(gameId);
  const { data: readyStatusData } = useReadyStatus(gameId);
  const dealNextCardMutation = useDealNextCard(gameId);
  const dealingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTriggeredAutoStartRef = useRef(false);
  const hasAttemptedJoinRef = useRef(false);
  const lastAITurnRef = useRef<number | null>(null);
  const game = data?.game;

  // DEBUG: Log game data
  useEffect(() => {
    if (game) {
      console.log('=== GAME DATA DEBUG ===');
      console.log('Total players:', game.players?.length);
      console.log('Players:', game.players);
      console.log('My position:', game.myPosition);
      console.log('=======================');
    }
  }, [game]);

  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showCallFriendDialog, setShowCallFriendDialog] = useState(false);
  const [showHand, setShowHand] = useState(true); // 控制手牌显示/隐藏
  const [showPlayedCardsDialog, setShowPlayedCardsDialog] = useState(false); // 控制已出牌历史对话框

  useEffect(() => {
    if (!isSinglePlayerRoute || hasTriggeredAutoStartRef.current) return;
    if (!game) return;
    if (game.status !== EGameStatus.WAITING) return;
    hasTriggeredAutoStartRef.current = true;
    startSinglePlayerMutation.mutate();
  }, [game?.status, game?.id, isSinglePlayerRoute, startSinglePlayerMutation.mutate]);

  // 自动显示叫庄或扣牌或叫朋友对话框
  useEffect(() => {
    if (!game) return;
    if (game.status === EGameStatus.CALLING) {
      // 检查玩家是否已经叫过庄或选择不叫
      const mySeat = game.myPosition;
      const hasCalled = game.callRecords?.some(r => r.seat === mySeat);
      const hasPassed = game.passedSeats?.includes(mySeat);
      const isFinished = game.callPhase === 'finished';
      // 只有在玩家还没有做出选择且阶段未结束时才显示对话框
      if (!hasCalled && !hasPassed && !isFinished) {
        setShowCallDialog(true);
      } else {
        setShowCallDialog(false);
      }
    } else if (game.status === EGameStatus.DISCARDING) {
      // 只有庄家才能扣牌
      if (game.dealerSeat === game.myPosition) {
        setShowDiscardDialog(true);
      } else {
        setShowDiscardDialog(false);
      }
    } else if (game.status === EGameStatus.CALLING_FRIEND) {
      // 只有庄家才会自动弹出叫朋友对话框
      if (game.dealerSeat === game.myPosition) {
        setShowCallFriendDialog(true);
      } else {
        setShowCallFriendDialog(false);
      }
    } else {
      setShowCallDialog(false);
      setShowDiscardDialog(false);
      setShowCallFriendDialog(false);
    }
  }, [game?.status, game?.callRecords, game?.passedSeats, game?.callPhase, game?.myPosition, game?.dealerSeat]);

  // 自动加入游戏（如果尚未加入）
  useEffect(() => {
    if (!game) return;
    if (isSinglePlayerRoute) return; // 单人模式不需要加入
    if (hasAttemptedJoinRef.current) return;
    if (!user?.id) return;

    // 检查当前用户是否已经在游戏中
    const isInGame = game.players?.some(p => p.id === Number(user.id));
    if (!isInGame && game.status === EGameStatus.WAITING) {
      console.log('自动加入游戏');
      hasAttemptedJoinRef.current = true;
      joinGameMutation.mutate(gameId);
    }
  }, [game?.players, game?.status, gameId, user?.id, isSinglePlayerRoute]);

  // AI自动出牌
  useEffect(() => {
    if (!game) return;
    if (game.status !== EGameStatus.PLAYING) return;

    // 查找当前玩家
    const currentPlayer = game.players.find(p => p.position === game.currentPlayer);
    if (!currentPlayer || !currentPlayer.isAI) {
      // 重置ref如果不是AI的回合
      lastAITurnRef.current = null;
      return;
    }

    // 检查是否已经为这个玩家的这个回合触发过AI出牌
    const turnKey = game.currentPlayer;
    if (lastAITurnRef.current === turnKey) {
      return; // 已经触发过，不再重复触发
    }

    // 如果是AI且没有正在执行操作，自动触发AI出牌
    if (!aiPlay.isPending) {
      lastAITurnRef.current = turnKey;
      setTimeout(() => aiPlay.mutate(), 500); // 延迟500ms让用户看到轮到AI了
    }
  }, [game?.currentPlayer, game?.status]);

  // 注意：自动开始游戏的逻辑已移至后端，当5人全部准备后自动触发

  // 发牌轮询逻辑
  useEffect(() => {
    if (!game) return;
    if (game.status !== EGameStatus.DEALING) {
      // 清理轮询
      if (dealingIntervalRef.current) {
        clearInterval(dealingIntervalRef.current);
        dealingIntervalRef.current = null;
      }
      return;
    }

    // 每200ms请求发下一轮牌
    if (!dealingIntervalRef.current && !dealNextCardMutation.isPending) {
      dealingIntervalRef.current = setInterval(() => {
        if (!dealNextCardMutation.isPending) {
          dealNextCardMutation.mutate();
        }
      }, 200);
    }

    return () => {
      if (dealingIntervalRef.current) {
        clearInterval(dealingIntervalRef.current);
        dealingIntervalRef.current = null;
      }
    };
  }, [game?.status, dealNextCardMutation.isPending]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!gameId) return <Navigate to="/game" replace />;

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (isError || !data?.success || !game) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">无法加载游戏数据</p>
        <Button variant="outline" onClick={() => navigate('/game')}>
          返回大厅
        </Button>
      </div>
    );
  }

  const otherPlayers = game.players.filter(player => player.position !== game.myPosition);

  const handlePlay = () => {
    if (selectedCardIndices.size === 0) return;
    // 不再限制出牌数量，用户可以选择任意数量的牌
    playCards.mutate(
      { cardIndices: Array.from(selectedCardIndices) },
      { onSuccess: () => clearSelection() },
    );
  };

  const handlePass = () => {
    passTurn.mutate(
      undefined,
      { onSuccess: () => clearSelection() },
    );
  };

  const handleCallDealer = (cardIndices: number[]) => {
    callDealerMutation.mutate(
      { cardIndices },
      { onSuccess: () => {
        clearSelection();
        setShowCallDialog(false);
      }},
    );
  };

  const handleDiscard = (cardIndices: number[]) => {
    discardMutation.mutate(
      cardIndices,
      { onSuccess: () => {
        clearSelection();
        setShowDiscardDialog(false);
      }},
    );
  };

  const handleCallFriend = (suit: ECardSuit, value: string, position: number) => {
    callFriendMutation.mutate(
      { suit, value, position },
      { onSuccess: () => {
        setShowCallFriendDialog(false);
      }},
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-2">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/game')}>
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => navigate(`/game/replay/${gameId}`)}
          >
            <Film className="h-4 w-4" />
            回放
          </Button>
          <Badge variant={game.status === EGameStatus.PLAYING ? 'success' : 'secondary'}>
            {game.status === EGameStatus.WAITING
              ? '等待中'
              : game.status === EGameStatus.DEALING
                ? '发牌中'
                : game.status === EGameStatus.CALLING
                  ? `叫庄中${game.callCountdown ? ` (${game.callCountdown}秒)` : ''}`
                  : game.status === EGameStatus.CALLING_FRIEND
                    ? '叫朋友中'
                    : game.status === EGameStatus.DISCARDING
                      ? '扣牌中'
                      : game.status === EGameStatus.PLAYING
                        ? '进行中'
                        : '已结束'}
          </Badge>
          {game.currentLevel && (
            <Badge variant="outline" className="gap-1">
              级别: {game.currentLevel}
            </Badge>
          )}
          {game.trumpSuit && (
            <Badge variant="outline" className="gap-1">
              主牌: {game.trumpSuit === 'hearts' ? '红桃' : game.trumpSuit === 'diamonds' ? '方片' : game.trumpSuit === 'clubs' ? '梅花' : game.trumpSuit === 'spades' ? '黑桃' : game.trumpSuit}
            </Badge>
          )}
          {game.hostCalledCard && (
            <Badge variant="outline" className="gap-1 bg-purple-900/70 border-purple-400/50 text-purple-100 shadow-lg shadow-purple-500/30">
              <span className="text-pink-300 animate-sparkle">🎯 盟友牌:</span>{' '}
              <span className={getSuitClass(game.hostCalledCard.suit)}>
                {SUIT_SYMBOLS[game.hostCalledCard.suit]}
              </span>{' '}
              <span className="font-bold">{game.hostCalledCard.value}</span>
              <span className="text-neon-cyan ml-1">
                (打出第{game.hostCalledCard.position}张时亮明身份)
              </span>
            </Badge>
          )}
        </div>
      </div>

      <div className="relative flex-1 bg-gradient-to-br from-background via-background to-card">
        {/* Soft Glassmorphism Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(150,100,255,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(100,150,255,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,100,200,0.08),transparent_60%)]" />

        {/* Main Table Surface - Enhanced Glass */}
        <div className="absolute inset-4 rounded-3xl glass-card relative overflow-hidden">
          {/* Subtle Border Glow */}
          <div className="absolute inset-0 rounded-3xl border-2 border-white/10" />

          {/* Corner Accents - Soft Colors */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 blur-3xl rounded-tl-3xl" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-3xl rounded-tr-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 blur-3xl rounded-bl-3xl" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-br-3xl" />
          {otherPlayers.map((player, i) => (
            <PlayerSeat
              key={player.id}
              player={player}
              position={SEAT_POSITIONS[i] ?? 'top'}
              isCurrentTurn={game.currentPlayer === player.position}
              isDealer={game.dealerTeam.includes(player.id)}
              score={game.scores?.[player.position] ?? 0}
            />
          ))}

          {game.currentTrick.length > 0 && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-4">
              {game.currentTrick.map((played, i) => (
                <div key={i} className="flex flex-col items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <span className="text-sm font-semibold px-4 py-2 rounded-full glass-light border border-white/20">
                    {game.players.find((p) => p.id === played.playerId)?.username}
                  </span>
                  <div className="flex gap-2">
                    {played.cards.map((card, j) => (
                      <div
                        key={j}
                        className="relative group flex h-14 w-11 flex-col items-center justify-center rounded-xl glass-card text-sm font-bold shadow-lg hover:scale-110 transition-all animate-fade-in"
                        style={{ animationDelay: `${j * 0.05}s` }}
                      >
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className={`relative z-10 text-lg ${getSuitClass(card.suit)}`}>
                          {SUIT_SYMBOLS[card.suit] || ''}
                        </span>
                        <span className={`relative z-10 font-bold ${getSuitClass(card.suit)}`}>
                          {card.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 手牌区域 - 手机端可折叠 */}
      <div className="border-t-2 border-white/10 glass backdrop-blur-xl">
        {/* 折叠按钮 */}
        <button
          onClick={() => setShowHand(!showHand)}
          className="w-full py-4 flex items-center justify-center gap-3 bg-gradient-to-r from-primary/60 via-accent/60 to-secondary/60 hover:from-primary/80 hover:via-accent/80 hover:to-secondary/80 text-white font-bold transition-all duration-300 shadow-lg relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
          {showHand ? (
            <EyeOff className="w-5 h-5 relative z-10" />
          ) : (
            <Eye className="w-5 h-5 relative z-10" />
          )}
          <span className="relative z-10 text-lg">{showHand ? '隐藏手牌' : '查看手牌'}</span>
          <span className="relative z-10 text-sm glass-light px-3 py-1 rounded-full">{game.myHand?.length || 0} 张</span>
        </button>

        {/* 手牌区域 - 当有对话框或点击展开时显示 */}
        {(showHand || showCallDialog || showDiscardDialog || showCallFriendDialog) && (
          <div className="p-4 pb-2 overflow-x-auto">
            <div className="min-w-max">
              <PlayerHand
                cards={game.myHand}
                trumpRank={game.trumpRank}
                trumpSuit={game.trumpSuit ?? undefined}
                gameStatus={game.status}
                friendCard={game.hostCalledCard}
                size="sm"
              />
            </div>
          </div>
        )}

        {/* 叫庄对话框 */}
        {showCallDialog && (
          <div className="mb-4">
            <CallDealerDialog
              onSubmit={handleCallDealer}
              isPending={callDealerMutation.isPending}
              currentLevel={game.trumpRank || '2'}
            />
          </div>
        )}

        {/* 扣牌对话框 */}
        {showDiscardDialog && (
          <div className="mb-4">
            <DiscardDialog
              bottomCards={game.bottomCards}
              onSubmit={handleDiscard}
              isPending={discardMutation.isPending}
            />
          </div>
        )}

        {/* 叫朋友对话框 */}
        {showCallFriendDialog && (
          <CallFriendDialog
            onSubmit={handleCallFriend}
            isPending={callFriendMutation.isPending}
            currentLevel={game.currentLevel}
            playerHand={game.myHand}
          />
        )}

        {/* 游戏控制按钮 */}
        <div className="mt-3 rounded-lg border-2 border-purple-400/30 bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-purple-900/40 p-4 shadow-lg backdrop-blur-sm">
          {game.status === EGameStatus.WAITING && (
            <div className="flex flex-col items-center gap-3">
              <div className="text-center">
                <p className="text-sm text-purple-200/90 dark:text-purple-100/90 font-medium">
                  等待玩家准备... ({readyStatusData?.readyStates?.filter(s => s.isReady).length || 0}/5 已准备)
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {game.players?.map((player) => {
                    const readyState = readyStatusData?.readyStates?.find(s => s.userId === String(player.id));
                    const isReady = readyState?.isReady || false;
                    return (
                      <div
                        key={player.id}
                        className={`rounded-full px-3 py-1 text-sm font-medium shadow-md transition-all ${
                          isReady
                            ? 'bg-gradient-to-r from-neon-green to-neon-cyan text-white animate-glow-pulse'
                            : 'bg-gradient-to-r from-neon-cyan/50 to-neon-magenta/50 text-foreground'
                        }`}
                      >
                        {player.username}
                        {player.id === Number(user?.id) && ' (你)'}
                        {isReady && ' ✓'}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 准备/取消准备按钮 */}
              {(() => {
                const myReadyState = readyStatusData?.readyStates?.find(s => s.userId === user?.id);
                const amIReady = myReadyState?.isReady ?? false;

                return amIReady ? (
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2 text-base border-amber-500/50 text-amber-200 hover:bg-amber-900/30"
                    onClick={() => cancelReadyMutation.mutate()}
                    disabled={cancelReadyMutation.isPending}
                  >
                    {cancelReadyMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      '取消准备'
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="game"
                    size="lg"
                    className="gap-2 text-base font-bold"
                    onClick={() => readyMutation.mutate()}
                    disabled={readyMutation.isPending}
                  >
                    {readyMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Play className="h-5 w-5" />
                        准备
                      </>
                    )}
                  </Button>
                );
              })()}

              {(game.players?.length || 0) < 5 && (
                <p className="text-xs text-amber-200/60">
                  需要5人加入并全部准备后开始游戏
                </p>
              )}
              {(game.players?.length || 0) >= 5 && (
                <p className="text-xs text-amber-200/60">
                  所有玩家准备后游戏将自动开始
                </p>
              )}
            </div>
          )}

          {/* 发牌状态 */}
          {game.status === EGameStatus.DEALING && (
            <div className="flex flex-col items-center gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-purple-100 dark:text-pink-100 animate-pulse">发牌中...</p>
                <p className="text-sm text-purple-200/90 dark:text-purple-100/90">
                  已发 {game.dealtCardCount || 0}/{game.totalCardsPerPlayer || 31} 张/人
                </p>
                <div className="mt-2 w-64 h-3 glass rounded-full overflow-hidden shadow-inner border border-neon-cyan/30">
                  <div
                    className="h-full bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-cyan bg-200% transition-all duration-200 animate-gradient-x shadow-lg shadow-neon-cyan/50"
                    style={{
                      width: `${((game.dealtCardCount || 0) / 31) * 100}%`,
                      backgroundSize: '200% 100%'
                    }}
                  />
                </div>
              </div>

              {/* 发牌过程中可以抢庄 */}
              <p className="text-xs text-neon-cyan/80">
                可以在发牌过程中选择级牌进行抢庄
              </p>

              {selectedCardIndices.size > 0 && (
                <Button
                  variant="game"
                  size="sm"
                  onClick={() => handleCallDealer(Array.from(selectedCardIndices))}
                  disabled={callDealerMutation.isPending}
                >
                  {callDealerMutation.isPending ? '提交中...' : '抢庄'}
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {game.status === EGameStatus.CALLING && !showCallDialog && (
              <>
                {/* 判断当前玩家是否已经叫过庄 */}
                {(() => {
                  const mySeat = game.myPosition;
                  const hasCalled = game.callRecords?.some(r => r.seat === mySeat);
                  const hasPassed = game.passedSeats?.includes(mySeat);
                  const hasSomeoneCalled = (game.callRecords?.length ?? 0) > 0;
                  const isFinished = game.callPhase === 'finished';

                  // 如果已经叫过庄或已结束，不显示叫庄按钮
                  if (hasCalled || isFinished) {
                    return null;
                  }

                  return (
                    <>
                      {/* 叫庄/抢庄按钮 */}
                      <Button
                        variant="game"
                        size="lg"
                        className="gap-2 text-base font-bold"
                        onClick={() => setShowCallDialog(true)}
                        disabled={hasPassed}
                      >
                        {hasSomeoneCalled ? '抢庄' : '叫庄'}
                      </Button>
                      {/* 不叫按钮 - 如果还没选择不叫 */}
                      {!hasPassed && (
                        <Button
                          variant="outline"
                          size="lg"
                          className="gap-2 text-base"
                          onClick={() => passCallMutation.mutate()}
                          disabled={passCallMutation.isPending}
                        >
                          不叫
                        </Button>
                      )}
                    </>
                  );
                })()}
              </>
            )}
            {game.status === EGameStatus.DISCARDING && game.dealerSeat === game.myPosition && !showDiscardDialog && (
              <Button
                variant="game"
                size="lg"
                className="gap-2 text-base font-bold"
                onClick={() => setShowDiscardDialog(true)}
              >
                扣牌
              </Button>
            )}
            {game.status === EGameStatus.DISCARDING && game.dealerSeat !== game.myPosition && (
              <div className="rounded-lg border-2 border-purple-400/40 bg-gradient-to-r from-purple-900/30 to-pink-900/30 p-4 text-center backdrop-blur-sm">
                <p className="text-purple-200 dark:text-pink-200">等待庄家扣牌...</p>
              </div>
            )}
            {game.status === EGameStatus.CALLING_FRIEND && !showCallFriendDialog && (
              <>
                {game.dealerSeat === game.myPosition ? (
                  <Button
                    variant="game"
                    size="lg"
                    className="gap-2 text-base font-bold"
                    onClick={() => setShowCallFriendDialog(true)}
                  >
                    叫朋友
                  </Button>
                ) : (
                  <div className="rounded-lg border-2 border-purple-400/40 bg-gradient-to-r from-purple-900/30 to-pink-900/30 p-4 text-center backdrop-blur-sm">
                    <p className="text-purple-200 dark:text-pink-200">请等待庄家选择花色</p>
                  </div>
                )}
              </>
            )}
            {game.status === EGameStatus.PLAYING && game.currentPlayer === game.myPosition && (
              <>
                <div className="flex gap-2">
                  <Button
                    variant="game"
                    size="lg"
                    className="gap-2 text-base font-bold"
                    onClick={handlePlay}
                    disabled={selectedCardIndices.size === 0 || playCards.isPending}
                  >
                    {playCards.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                    出牌 ({selectedCardIndices.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2 text-base"
                    onClick={() => setShowPlayedCardsDialog(true)}
                  >
                    <History className="h-5 w-5" />
                    查看已出牌
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 text-base"
                  onClick={handlePass}
                  disabled={passTurn.isPending}
                >
                  {passTurn.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SkipForward className="h-5 w-5" />}
                  不出
                </Button>
                {passTurn.isError && (
                  <p className="mt-2 text-center text-sm text-red-400">
                    操作失败，请重试
                  </p>
                )}
              </>
            )}
            {game.status === EGameStatus.PLAYING && game.currentPlayer !== game.myPosition && (
              <div className="rounded-xl border-2 border-neon-cyan/40 glass p-6 text-center backdrop-blur-sm animate-glow-pulse">
                <p className="text-neon-cyan font-bold text-lg">等待其他玩家出牌...</p>
              </div>
            )}
          </div>
          {selectedCardIndices.size > 0 && game.status === EGameStatus.PLAYING && (
            <p className="mt-2 text-center text-sm text-purple-200 dark:text-pink-200 font-medium animate-pulse">
              已选择 {selectedCardIndices.size} 张牌，点击"出牌"按钮进行出牌
            </p>
          )}
        </div>
        {playCards.isError && (
          <p className="mt-2 text-center text-sm text-destructive">{playCards.error.message}</p>
        )}
        {callDealerMutation.isError && (
          <p className="mt-2 text-center text-sm text-destructive">{callDealerMutation.error.message}</p>
        )}
        {discardMutation.isError && (
          <p className="mt-2 text-center text-sm text-destructive">{discardMutation.error.message}</p>
        )}
        {callFriendMutation.isError && (
          <p className="mt-2 text-center text-sm text-destructive">{callFriendMutation.error.message}</p>
        )}
      </div>

      {/* 已出牌历史对话框 */}
      {showPlayedCardsDialog && game && (
        <PlayedCardsHistoryDialog
          gameId={gameId}
          onClose={() => setShowPlayedCardsDialog(false)}
          currentTrick={game.currentTrick || []}
          lastCompletedTrick={game.lastCompletedTrick || []}
          players={game.players || []}
          myPosition={game.myPosition}
        />
      )}
    </div>
  );
}

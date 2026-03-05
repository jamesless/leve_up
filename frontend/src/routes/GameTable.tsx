import { useParams, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, ArrowLeft, Play, SkipForward, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PlayerHand from '@/components/game/PlayerHand';
import PlayerSeat from '@/components/game/PlayerSeat';
import CallDealerDialog from '@/components/game/CallDealerDialog';
import DiscardDialog from '@/components/game/DiscardDialog';
import CallFriendDialog from '@/components/game/CallFriendDialog';
import {
  useGameTable,
  usePlayCards,
  usePassTurn,
  useAiPlay,
  useStartGame,
  useStartSinglePlayerGame,
  useCallDealer,
  useDiscardBottomCards,
  useCallFriend,
  useJoinGame,
} from '@/hooks/useGame';
import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { EGameStatus, ECardSuit } from '@/types';
import { useEffect, useRef, useState } from 'react';

const SEAT_POSITIONS = ['top', 'top-right', 'bottom-right', 'bottom-left', 'top-left'] as const;

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
  const discardMutation = useDiscardBottomCards(gameId);
  const callFriendMutation = useCallFriend(gameId);
  const startGameMutation = useStartGame();
  const startSinglePlayerMutation = useStartSinglePlayerGame(gameId);
  const joinGameMutation = useJoinGame();
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
      setShowCallDialog(true);
    } else if (game.status === EGameStatus.DISCARDING) {
      setShowDiscardDialog(true);
    } else if (game.status === EGameStatus.CALLING_FRIEND) {
      setShowCallFriendDialog(true);
    } else {
      setShowCallDialog(false);
      setShowDiscardDialog(false);
      setShowCallFriendDialog(false);
    }
  }, [game?.status]);

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

  // 5人自动开始游戏
  useEffect(() => {
    if (!game) return;
    // 只有在等待状态且玩家数量达到5人时才自动开始
    if (game.status === EGameStatus.WAITING && game.players && game.players.length >= 5) {
      // 检查是否是房主，只有房主可以开始游戏
      const gameInfo = data as unknown as { game?: { hostId?: string } };
      const hostId = gameInfo?.game?.hostId;
      if (hostId && user?.id === hostId && !startGameMutation.isPending) {
        console.log('5人已满，自动开始游戏');
        startGameMutation.mutate(gameId);
      }
    }
  }, [game?.players?.length, game?.status, gameId]);

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

  const handleCallDealer = (suit: ECardSuit, cardIndices: number[]) => {
    callDealerMutation.mutate(
      { suit, cardIndices },
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
              : game.status === EGameStatus.CALLING
                ? '叫庄中'
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
              主牌: {game.trumpSuit}
            </Badge>
          )}
        </div>
      </div>

      <div className="relative flex-1 bg-gradient-to-b from-felt-dark via-felt to-felt-dark">
        <div className="absolute inset-4 rounded-3xl border-4 border-amber-900/30 bg-felt/80 shadow-inner">
          {otherPlayers.map((player, i) => (
            <PlayerSeat
              key={player.id}
              player={player}
              position={SEAT_POSITIONS[i] ?? 'top'}
              isCurrentTurn={game.currentPlayer === player.position}
              isDealer={game.dealerTeam.includes(player.id)}
            />
          ))}

          {game.currentTrick.length > 0 && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
              {game.currentTrick.map((played, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-400">
                    {game.players.find((p) => p.id === played.playerId)?.username}
                  </span>
                  <div className="flex gap-0.5">
                    {played.cards.map((card, j) => (
                      <div
                        key={j}
                        className="flex h-10 w-7 items-center justify-center rounded border border-slate-400 bg-white text-xs font-bold"
                      >
                        <span className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-slate-900'}>
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

      <div className="border-t border-border/40 bg-background/95 p-4">
        <PlayerHand
          cards={game.myHand}
          trumpRank={game.trumpRank}
          trumpSuit={game.trumpSuit ?? undefined}
          gameStatus={game.status}
        />

        {/* 叫庄对话框 */}
        {showCallDialog && (
          <div className="mb-4">
            <CallDealerDialog
              onSubmit={handleCallDealer}
              isPending={callDealerMutation.isPending}
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
          />
        )}

        {/* 游戏控制按钮 */}
        <div className="mt-3 rounded-lg border-2 border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-amber-900/20 to-amber-950/20 p-4 shadow-lg">
          {game.status === EGameStatus.WAITING && (
            <div className="flex flex-col items-center gap-3">
              <div className="text-center">
                <p className="text-sm text-amber-200/80">
                  等待玩家加入... ({game.players?.length || 0}/5)
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {game.players?.map((player) => (
                    <div
                      key={player.id}
                      className="rounded-full bg-amber-900/40 px-3 py-1 text-sm text-amber-100"
                    >
                      {player.username}
                      {player.id === Number(user?.id) && ' (你)'}
                    </div>
                  ))}
                </div>
              </div>
              {(game.players?.length || 0) >= 5 && (
                <Button
                  variant="game"
                  size="lg"
                  className="gap-2 text-base font-bold"
                  onClick={() => startGameMutation.mutate(gameId)}
                  disabled={startGameMutation.isPending}
                >
                  {startGameMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      5人已满，开始游戏
                    </>
                  )}
                </Button>
              )}
              {(game.players?.length || 0) < 5 && (
                <p className="text-xs text-amber-200/60">
                  需要5人才能开始游戏
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {game.status === EGameStatus.CALLING && !showCallDialog && (
              <Button
                variant="game"
                size="lg"
                className="gap-2 text-base font-bold"
                onClick={() => setShowCallDialog(true)}
              >
                叫庄
              </Button>
            )}
            {game.status === EGameStatus.DISCARDING && !showDiscardDialog && (
              <Button
                variant="game"
                size="lg"
                className="gap-2 text-base font-bold"
                onClick={() => setShowDiscardDialog(true)}
              >
                扣牌
              </Button>
            )}
            {game.status === EGameStatus.CALLING_FRIEND && !showCallFriendDialog && (
              <Button
                variant="game"
                size="lg"
                className="gap-2 text-base font-bold"
                onClick={() => setShowCallFriendDialog(true)}
              >
                叫朋友
              </Button>
            )}
            {game.status === EGameStatus.PLAYING && (
              <>
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
                  onClick={handlePass}
                  disabled={passTurn.isPending}
                >
                  {passTurn.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SkipForward className="h-5 w-5" />}
                  不出
                </Button>
              </>
            )}
          </div>
          {selectedCardIndices.size > 0 && game.status === EGameStatus.PLAYING && (
            <p className="mt-2 text-center text-sm text-amber-400">
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
    </div>
  );
}

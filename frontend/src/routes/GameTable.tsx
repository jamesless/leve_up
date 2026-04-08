import { useParams, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Loader2, ArrowLeft, Play, SkipForward, Film, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import React, { useEffect, useRef, useState} from 'react';

const SEAT_POSITIONS = ['top', 'top-right', 'bottom-right', 'bottom-left', 'top-left'] as const;

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
    const [callFriendMinimized, setCallFriendMinimized] = useState(false); // 叫朋友对话框是否被最小化
    const [showHand, setShowHand] = useState(true); // 控制手牌显示/隐藏

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
                setCallFriendMinimized(false); // 重置最小化状态
            } else {
                setShowCallFriendDialog(false);
            }
        } else {
            setShowCallDialog(false);
            setShowDiscardDialog(false);
            setShowCallFriendDialog(false);
        }
    }, [game?.status, game?.callRecords, game?.passedSeats, game?.callPhase, game?.myPosition]);

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
            <div className="flex flex-wrap items-center justify-between border-b border-white/10 px-2 sm:px-4 py-1.5 sm:py-2 gap-1 bg-black/20 backdrop-blur-sm">
                <Button variant="ghost" size="sm" className="gap-1 text-white/80 hover:text-white hover:bg-white/10" onClick={() => navigate('/game')}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">返回</span>
                </Button>
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 hidden sm:flex glass border-white/20 text-white/80 hover:bg-white/10 hover:text-white"
                        onClick={() => navigate(`/game/replay/${gameId}`)}
                    >
                        <Film className="h-4 w-4" />
                        回放
                    </Button>
                    <span className={cn(
                        "status-badge-glass rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs",
                        game.status === EGameStatus.PLAYING ? 'border-emerald-400/40 text-emerald-300' :
                        game.status === EGameStatus.WAITING ? 'border-white/30 text-white/70' :
                        'border-purple-400/40 text-purple-200'
                    )}>
                        {game.status === EGameStatus.WAITING
                            ? '等待中'
                            : game.status === EGameStatus.DEALING
                                ? '发牌中'
                                : game.status === EGameStatus.CALLING
                                    ? `叫庄${game.callCountdown ? ` (${game.callCountdown}s)` : ''}`
                                    : game.status === EGameStatus.CALLING_FRIEND
                                        ? '叫朋友'
                                        : game.status === EGameStatus.DISCARDING
                                            ? '扣牌'
                                            : game.status === EGameStatus.PLAYING
                                                ? '进行中'
                                                : '已结束'}
                    </span>
                    {game.currentLevel && (
                        <span className="status-badge-glass rounded-full px-2 py-0.5 text-[10px] sm:text-xs border-amber-400/40 text-amber-300 hidden sm:inline-flex gap-1">
                            <span className="opacity-60">级</span>
                            <span className="font-bold">{game.currentLevel}</span>
                        </span>
                    )}
                    {game.trumpSuit && (
                        <span className="status-badge-glass rounded-full px-2 py-0.5 text-[10px] sm:text-xs border-pink-400/40 text-pink-300 hidden sm:inline-flex gap-1">
                            <span>主</span>
                            <span className="font-bold">
                                {game.trumpSuit === 'hearts' ? '♥' : game.trumpSuit === 'diamonds' ? '♦' : game.trumpSuit === 'clubs' ? '♣' : game.trumpSuit === 'spades' ? '♠' : game.trumpSuit}
                            </span>
                        </span>
                    )}
                    {game.hostCalledCard && (
                        <span className="status-badge-glass rounded-full px-2 py-0.5 text-[10px] sm:text-xs border-primary/50 text-primary-foreground hidden md:inline-flex gap-1">
                            <span>友</span>
                            <span className="font-bold">{SUIT_SYMBOLS[game.hostCalledCard.suit]}{game.hostCalledCard.value}</span>
                            <span className="opacity-60">(第{game.hostCalledCard.position}张)</span>
                        </span>
                    )}
                </div>
            </div>

            {/* 游戏桌面区域 - 响应式 */}
            <div className="relative flex-1 flex items-center justify-center p-2 sm:p-4">
                {/* 桌面容器 - 移动端小尺寸，桌面端自适应 */}
                <div className="relative w-[95vw] h-[45vh] sm:w-[90vw] sm:h-[55vh] md:w-[85vw] md:h-[60vh] lg:w-[75vw] lg:h-[65vh] xl:w-[70vw] xl:h-[65vh] max-w-5xl max-h-[70vh] rounded-2xl sm:rounded-3xl border-2 sm:border-[3px] border-white/20 game-table-surface shadow-inner">

                    {/* 浮动光斑 */}
                    <div className="table-orb w-32 h-24" style={{top:'8%',left:'12%','--duration':'14s','--delay':'0s','--dx1':'15px','--dy1':'-12px','--dx2':'-8px','--dy2':'10px',background:'radial-gradient(ellipse, rgba(168,85,247,0.35) 0%, transparent 70%)',filter:'blur(20px)'} as React.CSSProperties} />
                    <div className="table-orb w-24 h-20" style={{top:'65%',right:'10%','--duration':'18s','--delay':'-5s','--dx1':'-20px','--dy1':'15px','--dx2':'10px','--dy2':'-8px',background:'radial-gradient(ellipse, rgba(236,72,153,0.3) 0%, transparent 70%)',filter:'blur(16px)'} as React.CSSProperties} />
                    <div className="table-orb w-20 h-16" style={{bottom:'20%',left:'5%','--duration':'22s','--delay':'-10s','--dx1':'10px','--dy1':'-20px','--dx2':'-15px','--dy2':'12px',background:'radial-gradient(ellipse, rgba(59,130,246,0.3) 0%, transparent 70%)',filter:'blur(18px)'} as React.CSSProperties} />

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
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 trick-zone rounded-2xl p-3 sm:p-4 flex gap-2 sm:gap-3">
                            {game.currentTrick.map((played, i) => (
                                <div key={i} className="flex flex-col items-center gap-1 sm:gap-2">
                                    <span className="text-[10px] sm:text-xs text-white/60 font-medium">
                                        {game.players.find((p) => p.id === played.playerId)?.username}
                                    </span>
                                    <div className="flex gap-1">
                                        {played.cards.map((card, j) => (
                                            <div
                                                key={j}
                                                className="flex h-8 w-6 sm:h-11 sm:w-8 flex-col items-center justify-center rounded-xl glass-card border border-white/25 bg-white/15 text-[10px] sm:text-xs font-bold shadow-md"
                                            >
                                                <span className={cn(getSuitClass(card.suit), 'text-[10px] sm:text-sm')}>
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
                    )}
                </div>
            </div>

            {/* ====== 全屏对话框（渲染在游戏桌之上）====== */}
            {/* 叫庄对话框 */}
            {showCallDialog && (
                <CallDealerDialog
                    onSubmit={handleCallDealer}
                    isPending={callDealerMutation.isPending}
                    currentLevel={game.trumpRank || '2'}
                />
            )}

            {/* 扣牌对话框 */}
            {showDiscardDialog && (
                <DiscardDialog
                    bottomCards={game.bottomCards}
                    onSubmit={handleDiscard}
                    isPending={discardMutation.isPending}
                />
            )}

            {/* 叫朋友对话框 */}
            {showCallFriendDialog && (
                callFriendMinimized ? (
                    // 最小化状态：显示浮动恢复按钮
                    <button
                        onClick={() => setCallFriendMinimized(false)}
                        className="fixed bottom-24 right-4 z-50 rounded-full w-14 h-14 flex flex-col items-center justify-center gap-0.5 glass-card border border-purple-400/50 shadow-[0_4px_20px_rgba(139,92,246,0.4)] text-white/80 hover:text-white hover:bg-purple-500/20 transition-all"
                    >
                        <span className="text-base">👥</span>
                        <span className="text-[9px] font-bold">叫朋友</span>
                    </button>
                ) : (
                    <CallFriendDialog
                        onSubmit={handleCallFriend}
                        onMinimize={() => setCallFriendMinimized(true)}
                        isPending={callFriendMutation.isPending}
                        currentLevel={game.currentLevel}
                        playerHand={game.myHand}
                    />
                )
            )}

            {/* 手牌区域 - 手机端可折叠 */}
            <div className="border-t border-white/10 hand-area-glass">
                {/* 折叠按钮 */}
                <button
                    onClick={() => setShowHand(!showHand)}
                    className="w-full py-2 flex items-center justify-center gap-2 hand-toggle-bar text-white/80 hover:text-white transition-colors"
                >
                    {showHand ? (
                        <EyeOff className="w-4 h-4" />
                    ) : (
                        <Eye className="w-4 h-4" />
                    )}
                    <span>{showHand ? '隐藏手牌' : '查看手牌'}</span>
                    <span className="text-xs bg-slate-600 px-2 py-0.5 rounded">{game.myHand?.length || 0} 张</span>
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

                {/* 游戏控制按钮 */}
                <div className="mt-2 sm:mt-3 rounded-xl border border-white/15 game-control-panel p-2 sm:p-4">
                    {game.status === EGameStatus.WAITING && (
                        <div className="flex flex-col items-center gap-2 sm:gap-3">
                            <div className="text-center">
                                <p className="text-xs sm:text-sm text-white/70">
                                    等待玩家准备... ({readyStatusData?.readyStates?.filter(s => s.isReady).length || 0}/5 已准备)
                                </p>
                                <div className="mt-1 sm:mt-2 flex flex-wrap justify-center gap-1 sm:gap-2">
                                    {game.players?.map((player) => {
                                        const readyState = readyStatusData?.readyStates?.find(s => s.userId === String(player.id));
                                        const isReady = readyState?.isReady || false;
                                        return (
                                            <div
                                                key={player.id}
                                                className={`rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm backdrop-blur-sm transition-all ${
                                                    isReady
                                                        ? 'bg-emerald-500/25 border border-emerald-400/40 text-emerald-200'
                                                        : 'bg-white/10 border border-white/20 text-white/70'
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
                                        size="default"
                                        className="gap-1 sm:gap-2 text-sm sm:text-base border-white/25 text-white/80 hover:bg-white/10 hover:text-white w-full sm:w-auto backdrop-blur-sm"
                                        onClick={() => cancelReadyMutation.mutate()}
                                        disabled={cancelReadyMutation.isPending}
                                    >
                                        {cancelReadyMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                                        ) : (
                                            '取消准备'
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="game"
                                        size="default"
                                        className="gap-1 sm:gap-2 text-sm sm:text-base font-bold w-full sm:w-auto"
                                        onClick={() => readyMutation.mutate()}
                                        disabled={readyMutation.isPending}
                                    >
                                        {readyMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                                                准备
                                            </>
                                        )}
                                    </Button>
                                );
                            })()}

                            {(game.players?.length || 0) < 5 && (
                                <p className="text-[10px] sm:text-xs text-white/40 text-center px-1">
                                    需要5人加入并全部准备后开始游戏
                                </p>
                            )}
                            {(game.players?.length || 0) >= 5 && (
                                <p className="text-[10px] sm:text-xs text-white/40 text-center px-1">
                                    所有玩家准备后游戏将自动开始
                                </p>
                            )}
                        </div>
                    )}

                    {/* 发牌状态 */}
                    {game.status === EGameStatus.DEALING && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="text-center">
                                <p className="text-lg font-bold text-white/90">发牌中...</p>
                                <p className="text-sm text-white/60">
                                    已发 {game.dealtCardCount || 0}/{game.totalCardsPerPlayer || 31} 张/人
                                </p>
                                <div className="deal-progress-bar mt-2 w-64">
                                    <div
                                        className="deal-progress-fill"
                                        style={{ width: `${((game.dealtCardCount || 0) / 31) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* 发牌过程中可以抢庄 */}
                            <p className="text-xs text-white/40">
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

                    <div className="flex flex-col gap-2 sm:gap-3">
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
                                                size="default"
                                                className="gap-1 sm:gap-2 text-sm sm:text-base font-bold w-full sm:w-auto"
                                                onClick={() => setShowCallDialog(true)}
                                                disabled={hasPassed}
                                            >
                                                {hasSomeoneCalled ? '抢庄' : '叫庄'}
                                            </Button>
                                            {/* 不叫按钮 - 如果还没选择不叫 */}
                                            {!hasPassed && (
                                                <Button
                                                    variant="outline"
                                                    size="default"
                                                    className="gap-1 sm:gap-2 text-sm sm:text-base w-full sm:w-auto"
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
                                size="default"
                                className="gap-1 sm:gap-2 text-sm sm:text-base font-bold w-full sm:w-auto"
                                onClick={() => setShowDiscardDialog(true)}
                            >
                                扣牌
                            </Button>
                        )}
                        {game.status === EGameStatus.DISCARDING && game.dealerSeat !== game.myPosition && (
                            <div className="waiting-glass rounded-xl p-2 sm:p-4 text-center">
                                <p className="text-xs sm:text-sm text-white/70">等待庄家扣牌...</p>
                            </div>
                        )}
                        {game.status === EGameStatus.CALLING_FRIEND && !showCallFriendDialog && (
                            <>
                                {game.dealerSeat === game.myPosition ? (
                                    <Button
                                        variant="game"
                                        size="default"
                                        className="gap-1 sm:gap-2 text-sm sm:text-base font-bold w-full sm:w-auto"
                                        onClick={() => setShowCallFriendDialog(true)}
                                    >
                                        叫朋友
                                    </Button>
                                ) : (
                                    <div className="waiting-glass rounded-xl p-2 sm:p-4 text-center">
                                        <p className="text-xs sm:text-sm text-white/70">请等待庄家选择花色</p>
                                    </div>
                                )}
                            </>
                        )}
                        {game.status === EGameStatus.PLAYING && game.currentPlayer === game.myPosition && (
                            <>
                                <Button
                                    variant="game"
                                    size="default"
                                    className="gap-1 sm:gap-2 text-sm sm:text-base font-bold w-full sm:w-auto"
                                    onClick={handlePlay}
                                    disabled={selectedCardIndices.size === 0 || playCards.isPending}
                                >
                                    {playCards.isPending ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Play className="h-4 w-4 sm:h-5 sm:w-5" />}
                                    出牌 ({selectedCardIndices.size})
                                </Button>
                                <Button
                                    variant="outline"
                                    size="default"
                                    className="gap-1 sm:gap-2 text-sm sm:text-base w-full sm:w-auto glass border-white/20 text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-sm"
                                    onClick={handlePass}
                                    disabled={passTurn.isPending}
                                >
                                    {passTurn.isPending ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" />}
                                    不出
                                </Button>
                                {passTurn.isError && (
                                    <p className="mt-2 text-center text-xs sm:text-sm text-red-400">
                                        操作失败，请重试
                                    </p>
                                )}
                            </>
                        )}
                        {game.status === EGameStatus.PLAYING && game.currentPlayer !== game.myPosition && (
                            <div className="waiting-glass rounded-xl p-2 sm:p-4 text-center border-blue-400/20">
                                <p className="text-xs sm:text-sm text-blue-200">等待其他玩家出牌...</p>
                            </div>
                        )}
                    </div>
                    {selectedCardIndices.size > 0 && game.status === EGameStatus.PLAYING && (
                        <p className="mt-2 text-center text-xs sm:text-sm text-amber-400 px-2">
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

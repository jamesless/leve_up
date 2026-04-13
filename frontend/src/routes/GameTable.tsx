import { useParams, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Loader2, ArrowLeft, Play, Film, User } from 'lucide-react';
import { isJoker, getJokerImageUrl } from '@/lib/card';
import { Button } from '@/components/ui/button';
import PlayerHand from '@/components/game/PlayerHand';
import FinishedPanel from '@/components/game/FinishedPanel';
import CallDealerDialog from '@/components/game/CallDealerDialog';
import DiscardDialog from '@/components/game/DiscardDialog';
import CallFriendDialog from '@/components/game/CallFriendDialog';
import { PLAYER_COLORS } from '@/config/playerColors';
import {
    useGameTable,
    usePlayCards,
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
    useNextRound,
} from '@/hooks/useGame';
import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { EGameStatus, ECardSuit, ICard } from '@/types';
import { useEffect, useRef, useState} from 'react';

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
    if (suit === 'hearts' || suit === 'diamonds') return 'text-red-500';
    if (suit === 'clubs' || suit === 'spades') return 'text-slate-200';
    if (suit === 'joker') return 'text-purple-400';
    return 'text-slate-200';
};

// 获取花色颜色类名（用于背景）
const getSuitBgClass = (suit: string): string => {
    if (suit === 'hearts' || suit === 'diamonds') return 'bg-red-500/20 border-red-400/40';
    if (suit === 'clubs' || suit === 'spades') return 'bg-slate-600/30 border-slate-400/40';
    return 'bg-white/10 border-white/20';
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
    const nextRoundMutation = useNextRound(gameId);
    const dealingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasTriggeredAutoStartRef = useRef(false);
    const hasAttemptedJoinRef = useRef(false);
    const lastAITurnRef = useRef<number | null>(null);
const game = data?.game;

    // 安全属性，防止 undefined 报错
    const dealerTeam = game?.dealerTeam ?? [];
    const players = game?.players ?? [];

    // DEBUG: Log game data
    useEffect(() => {
        if (game) {
            console.log('=== GAME DATA DEBUG ===');
            console.log('Total players:', players.length);
            console.log('Players:', players);
            console.log('My position:', game.myPosition);
            console.log('=======================');
        }
    }, [game]);

    const [showCallDialog, setShowCallDialog] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);
    const [showCallFriendDialog, setShowCallFriendDialog] = useState(false);
    const [callFriendMinimized, setCallFriendMinimized] = useState(false); // 叫朋友对话框是否被最小化
    const [rightSidebarExpanded, setRightSidebarExpanded] = useState(true); // 右侧栏是否展开
    const [showLastTrick, setShowLastTrick] = useState(false); // 是否显示上一轮出牌

    // 计算当前轮中谁最大
    const getCurrentWinner = () => {
        if (!game?.currentTrick || game.currentTrick.length === 0) return null;
        if (!game.trumpSuit || !game.trumpRank) return null;

        let winner = game.currentTrick[0];

        for (const played of game.currentTrick) {
            if (compareCards(played.cards[0], winner.cards[0], game.trumpSuit, game.trumpRank) > 0) {
                winner = played;
            }
        }
        return winner;
    };

    // 计算上一轮中谁最大
    const getLastTrickWinner = () => {
        if (!game?.lastCompletedTrick || game.lastCompletedTrick.length === 0) return null;
        if (!game.trumpSuit || !game.trumpRank) return null;

        let winner = game.lastCompletedTrick[0];

        for (const played of game.lastCompletedTrick) {
            if (compareCards(played.cards[0], winner.cards[0], game.trumpSuit, game.trumpRank) > 0) {
                winner = played;
            }
        }
        return winner;
    };

    // 比较两张牌的大小，返回 1: a大, -1: b大, 0: 相等
    const compareCards = (a: ICard, b: ICard, trumpSuit: string, trumpRank: string): number => {
        const aIsTrump = isCardTrump(a, trumpSuit, trumpRank);
        const bIsTrump = isCardTrump(b, trumpSuit, trumpRank);

        // 主牌比副牌大
        if (aIsTrump && !bIsTrump) return 1;
        if (!aIsTrump && bIsTrump) return -1;

        // 都是主牌或都是副牌
        const aStrength = getCardStrength(a, trumpSuit, trumpRank);
        const bStrength = getCardStrength(b, trumpSuit, trumpRank);

        return aStrength - bStrength;
    };

    // 判断是否是主牌
    const isCardTrump = (card: ICard, trumpSuit: string, trumpRank: string): boolean => {
        if (card.suit === 'joker') return true;
        if (card.value === trumpRank) return true;
        if (card.suit === trumpSuit) return true;
        return false;
    };

    // 获取牌的强度值
    const getCardStrength = (card: ICard, trumpSuit: string, trumpRank: string): number => {
        const baseValues: Record<string, number> = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, 'Small': 15, 'Big': 16 };

        if (card.suit === 'joker') {
            return card.value === 'Big' ? 100 : 99;
        }

        const isTrumpRank = card.value === trumpRank;
        const isTrumpSuit = card.suit === trumpSuit;

        let strength = baseValues[card.value] || 0;

        // 主牌花色加50，同花色级牌加75（最高优先级）
        if (isTrumpSuit) strength += 50;
        if (isTrumpRank) strength += 25;

        return strength;
    };

    useEffect(() => {
        if (!isSinglePlayerRoute || hasTriggeredAutoStartRef.current) return;
        if (!game) return;
        if (game.status !== EGameStatus.WAITING) return;
        hasTriggeredAutoStartRef.current = true;
        startSinglePlayerMutation.mutate();
    }, [game?.status, game?.id, isSinglePlayerRoute, startSinglePlayerMutation.mutate]);

    // 跟踪上一轮完成出牌
    const prevTrickCountRef = useRef(0);
    useEffect(() => {
        if (!game) return;
        const currentCount = game.currentTrick.length;
        // 从有牌变成没牌，说明一轮结束，将最后一轮保存
        if (prevTrickCountRef.current > 0 && currentCount === 0) {
            // 当前轮已经被清空，使用 lastCompletedTrick 数据
        }
        prevTrickCountRef.current = currentCount;
    }, [game?.currentTrick?.length]);

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
        const isInGame = players?.some(p => p.id === Number(user.id));
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
        const currentPlayer = players.find(p => p.position === game.currentPlayer);
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

    const handlePlay = () => {
        if (selectedCardIndices.size === 0) return;
        // 不再限制出牌数量，用户可以选择任意数量的牌
        playCards.mutate(
            { cardIndices: Array.from(selectedCardIndices) },
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
            {/* 结算面板（游戏结束时显示） */}
            {game.status === EGameStatus.FINISHED && (
                <FinishedPanel
                    game={game}
                    userId={user?.id}
                    onNextRound={() => nextRoundMutation.mutate()}
                    isNextRoundPending={nextRoundMutation.isPending}
                />
            )}
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
                    {game.hostCalledCard && (
                        <span className="status-badge-glass rounded-full px-2 py-0.5 text-[10px] sm:text-xs border-primary/50 text-primary-foreground hidden md:inline-flex gap-1">
                            <span>友</span>
                            <span className="font-bold">{SUIT_SYMBOLS[game.hostCalledCard.suit]}{game.hostCalledCard.value}</span>
                            <span className="opacity-60">(第{game.hostCalledCard.position}张)</span>
                        </span>
                    )}
                </div>
            </div>

{/* 主体区域 */}
            <div className="flex flex-1 overflow-hidden flex-col sm:flex-row">
                {/* ====== PC端左侧玩家列表（手机端隐藏）====== */}
                <div className="hidden sm:flex border-r border-white/10 bg-black/20 backdrop-blur-sm flex-col w-24 md:w-28">
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
                        {players.map((player) => {
                            const isMe = player.id === Number(user?.id);
                            const isCurrentTurn = game.currentPlayer === player.position;
                            const isDealer = dealerTeam.includes(player.id);
                            const isOnFire = game.friendRevealed && (isDealer || player.position === game.friendSeat); // 确认朋友后才着火
                            const isSoloMode = game.friendRevealed && game.friendSeat === game.dealerSeat; // 1打4独打模式
                            const biggestCard = getCurrentWinner();
                            const isBiggest = biggestCard && biggestCard.playerId === player.id; // 当前轮最大牌
                            const score = game.scores?.[player.id] || 0;
                            return (
                                <div key={player.id} className={cn('rounded-lg p-1.5 transition-all border relative', isCurrentTurn ? 'bg-purple-500/20 border-purple-400/50' : 'bg-white/5 border-white/10', isOnFire && (isSoloMode ? 'fire-blue' : 'fire-border'), isBiggest && game.currentTrick.length > 0 && 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent')}>
                                    {isOnFire && <div className={isSoloMode ? 'fire-particles-blue' : 'fire-particles'} />}
                                    {isBiggest && game.currentTrick.length > 0 && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse z-20" />
                                    )}
                                    <div className={cn('relative flex items-center justify-center rounded-full border mx-auto mb-1 h-8 w-8', isCurrentTurn ? 'border-purple-400 bg-purple-500/25' : 'border-white/30 bg-white/10', isOnFire && 'z-10')}>
                                        {player.isAI ? <span className="text-xs z-10">🤖</span> : <User className="h-4 w-4 text-white/70 z-10" />}
                                        {isCurrentTurn && <div className="absolute -inset-0.5 rounded-full animate-pulse border border-purple-400/50" />}
                                    </div>
                                    <div className="text-center mb-0.5">
                                        <span className={cn('text-xs font-medium block truncate', isMe ? 'text-amber-300' : 'text-white/90')}>{player.username}</span>
                                        {isMe && <span className="text-[8px] text-amber-400/70">(我)</span>}
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-0.5 mb-1">
                                        {isDealer && <span className="text-[7px] px-1 py-0 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300">庄</span>}
                                        {player.isAI && <span className="text-[7px] px-1 py-0 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300">AI</span>}
                                        {player.isFriend && <span className="text-[7px] px-1 py-0 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-300">友</span>}
                                        {isSoloMode && game.dealerSeat === player.position && <span className="text-[7px] px-1 py-0 rounded font-bold bg-white text-amber-500 border-2 border-yellow-400">独</span>}
                                    </div>
                                    <div className="text-center">
                                        <span className="text-xs text-white/60">{player.cardCount || 0}张</span>
                                        {score > 0 && <div className="text-[9px] text-emerald-400">+{score}</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {game.status === EGameStatus.PLAYING && (
                        <div className="p-2 border-t border-white/10">
                            {(() => {
                                const currentPlayer = players.find(p => p.position === game.currentPlayer);
                                const isMyTurn = game.currentPlayer === game.myPosition;
                                return (
                                    <div className={cn('text-center text-[10px] rounded p-1.5', isMyTurn ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/60')}>
                                        {isMyTurn ? '▶你的回合' : `${currentPlayer?.username?.substring(0,4)||'?'}出牌`}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* ====== 右侧边栏：主牌 + 友牌 ====== */}
                {game.trumpSuit && game.status !== EGameStatus.WAITING && (
                    <div className="hidden sm:flex flex-col items-center justify-start pt-3 px-1 md:px-2 border-l border-white/10 bg-black/20 backdrop-blur-sm flex-shrink-0 gap-2 relative group">
                        {/* 展开/收起按钮 */}
                        <button
                            onClick={() => setRightSidebarExpanded(!rightSidebarExpanded)}
                            className={cn(
                                'absolute -left-3 top-3 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-200',
                                'bg-black/60 border border-white/20 hover:bg-black/80 hover:border-white/40',
                                'opacity-0 group-hover:opacity-100',
                                rightSidebarExpanded ? 'rotate-0' : 'rotate-180'
                            )}
                        >
                            ‹
                        </button>

                        {/* 主牌 */}
                        {rightSidebarExpanded ? (
                            <div className={cn(
                                'w-full rounded-xl glass-card px-2 py-2 border flex flex-col items-center gap-0.5',
                                getSuitBgClass(game.trumpSuit)
                            )}>
                                <span className="text-[9px] text-white/50">主牌</span>
                                <span className={cn('text-xl font-black leading-none', getSuitClass(game.trumpSuit))}>
                                    {SUIT_SYMBOLS[game.trumpSuit] ?? ''}
                                </span>
                                <span className="text-[10px] font-bold text-white/80">
                                    {(game.trumpRank ?? game.currentLevel)}级
                                </span>
                            </div>
                        ) : (
                            <div className={cn(
                                'w-10 h-10 rounded-lg border flex items-center justify-center',
                                getSuitBgClass(game.trumpSuit)
                            )}>
                                <span className={cn('text-lg font-black', getSuitClass(game.trumpSuit))}>
                                    {SUIT_SYMBOLS[game.trumpSuit] ?? ''}
                                </span>
                            </div>
                        )}

                        {/* 友牌 */}
                        {game.hostCalledCard && (
                            rightSidebarExpanded ? (
                                <div className="w-full rounded-xl glass-card glass-purple border border-purple-400/30 px-2 py-2 shadow-[0_2px_12px_rgba(139,92,246,0.3)] flex flex-col items-center gap-0.5">
                                    <span className="text-[9px] text-purple-300/70">友牌</span>
                                    <div className={cn(
                                        'w-8 h-11 rounded-lg border flex flex-col items-center justify-center font-bold',
                                        game.hostCalledCard.suit === 'hearts' || game.hostCalledCard.suit === 'diamonds'
                                            ? 'bg-red-500/20 border-red-400/50 text-red-500'
                                            : game.hostCalledCard.suit === 'clubs' || game.hostCalledCard.suit === 'spades'
                                                ? 'bg-slate-500/20 border-slate-400/50 text-slate-200'
                                                : 'bg-purple-500/20 border-purple-400/50 text-purple-400'
                                    )}>
                                        <span className="text-sm leading-none font-black">{SUIT_SYMBOLS[game.hostCalledCard.suit] ?? ''}</span>
                                        <span className="text-[10px] leading-none font-bold">{game.hostCalledCard.value}</span>
                                    </div>
                                    <span className="text-[8px] text-purple-300/60">第{game.hostCalledCard.position}张</span>
                                </div>
                            ) : (
                                <div className={cn(
                                    'w-10 h-12 rounded-lg border flex flex-col items-center justify-center font-bold',
                                    game.hostCalledCard.suit === 'hearts' || game.hostCalledCard.suit === 'diamonds'
                                        ? 'bg-red-500/20 border-red-400/50 text-red-500'
                                        : game.hostCalledCard.suit === 'clubs' || game.hostCalledCard.suit === 'spades'
                                            ? 'bg-slate-500/20 border-slate-400/50 text-slate-200'
                                            : 'bg-purple-500/20 border-purple-400/50 text-purple-400'
                                )}>
                                    <span className="text-xs leading-none font-black">{SUIT_SYMBOLS[game.hostCalledCard.suit] ?? ''}</span>
                                    <span className="text-[9px] leading-none font-bold">{game.hostCalledCard.value}</span>
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* ====== 游戏桌面（PC右侧/手机全宽）====== */}
                <div className="flex-1 relative flex flex-col overflow-hidden">
                    {/* 手机端：玩家信息条 */}
                    <div className="sm:hidden flex items-center justify-between px-2 py-1 border-b border-white/10 bg-black/30">
                        <div className="flex items-center gap-1 overflow-x-auto" style={{scrollbarWidth:'none'}}>
                            {players.map((player) => {
                                const isMe = player.id === Number(user?.id);
                                const isCurrentTurn = game.currentPlayer === player.position;
                                const isDealer = dealerTeam.includes(player.id);
                                const isOnFire = game.friendRevealed && (isDealer || player.position === game.friendSeat);
                                const isSoloMode = game.friendRevealed && game.friendSeat === game.dealerSeat;
                                const biggestCard = getCurrentWinner();
                                const isBiggest = biggestCard && biggestCard.playerId === player.id;
                                return (
                                    <div key={player.id} className={cn('flex-shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 border text-[9px] relative', isCurrentTurn ? 'bg-purple-500/30 border-purple-400/60' : 'bg-white/5 border-white/10', isOnFire && (isSoloMode ? 'fire-blue' : 'fire-border'), isBiggest && game.currentTrick.length > 0 && 'ring-1 ring-yellow-400')}>
                                        {isOnFire && <div className={isSoloMode ? 'fire-particles-blue' : 'fire-particles'} />}
                                        {isBiggest && game.currentTrick.length > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                                        )}
                                        <span className={isCurrentTurn ? 'text-purple-300' : ''}>{isCurrentTurn ? '▶' : ''}</span>
                                        <span className={isMe ? 'text-amber-300 font-medium' : 'text-white/80'}>{player.username.substring(0,3)}</span>
                                        {isDealer && <span className="text-amber-400">庄</span>}
                                        {player.isAI && <span className="text-blue-400">AI</span>}
                                        {isSoloMode && game.dealerSeat === player.position && <span className="font-bold text-amber-500 border border-yellow-400 rounded px-0.5 text-[8px]">独</span>}
                                        <span className="text-white/40">{player.cardCount||0}</span>
                                    </div>
                                );
                            })}
                        </div>
                        {game.status === EGameStatus.PLAYING && (
                            <div className="flex-shrink-0 text-[10px] px-2">
                                {game.currentPlayer === game.myPosition ? (
                                    <span className="text-emerald-400">你的回合</span>
                                ) : (
                                    <span className="text-white/50">等待...</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 游戏桌面 */}
                    <div className="flex-1 relative flex items-center justify-center p-1 sm:p-4 overflow-hidden">
                        <div className="relative w-full h-full max-w-3xl max-h-full rounded-xl sm:rounded-3xl border-2 sm:border-[3px] border-white/20 game-table-surface shadow-inner flex flex-col items-center justify-center overflow-hidden">

                            {/* 上一轮出牌 - 可折叠 */}
                            {game.lastCompletedTrick && game.lastCompletedTrick.length > 0 && (
                                <div className="w-full px-2 sm:px-4 mb-1 sm:mb-2">
                                    <button
                                        onClick={() => setShowLastTrick(!showLastTrick)}
                                        className="flex items-center gap-1 text-[9px] sm:text-xs text-white/50 hover:text-white/80 transition-colors mb-1"
                                    >
                                        <span className={cn('transition-transform', showLastTrick && 'rotate-90')}>▶</span>
                                        <span>上一轮 ({game.lastCompletedTrick.length}人)</span>
                                    </button>
                                    {showLastTrick && (
                                        <div className="flex flex-col justify-center gap-0.5 sm:gap-1 opacity-60">
                                            {game.lastCompletedTrick.map((played, i) => {
                                                const player = players.find(p => p.id === played.playerId);
                                                const colorIdx = (i % 5) + 1;
                                                const color = PLAYER_COLORS[colorIdx as keyof typeof PLAYER_COLORS] ?? PLAYER_COLORS[1];
                                                const lastWinner = getLastTrickWinner();
                                                const isLastWinner = lastWinner && lastWinner.playerId === played.playerId;
                                                return (
                                                    <div key={i} className={cn('flex items-center gap-1 rounded px-1.5 py-0.5 sm:px-2 sm:py-1 backdrop-blur-md border relative', color.bg, color.border, isLastWinner && 'ring-1 ring-yellow-400')}>
                                                        {isLastWinner && (
                                                            <div className="absolute -top-0.5 -right-0.5 px-1 py-0.5 rounded-full bg-yellow-400 text-[7px] sm:text-[9px] font-bold text-black">赢</div>
                                                        )}
                                                        <div className={cn(
                                                            'flex-shrink-0 px-1 py-0 rounded-full text-[8px] sm:text-[10px] font-bold border backdrop-blur-sm',
                                                            color.badge
                                                        )}>
                                                            {player?.username?.substring(0, 3) || '?'}
                                                        </div>
                                                        <div className="flex gap-px sm:gap-0.5 flex-wrap">
                                                            {played.cards.map((card, j) => (
                                                                <div key={j} className={cn('h-5 w-3.5 sm:h-6 sm:w-4.5 flex-col items-center justify-center rounded font-bold border backdrop-blur-sm bg-white/10 overflow-hidden flex', color.border)}>
                                                                    {isJoker(card) ? (
                                                                        <img src={getJokerImageUrl(card)} alt="" className="w-full h-full object-contain opacity-70" />
                                                                    ) : (
                                                                        <>
                                                                            <span className={cn(getSuitClass(card.suit), 'text-[7px] sm:text-[9px] leading-none font-black')}>{SUIT_SYMBOLS[card.suit]||''}</span>
                                                                            <span className={cn(getSuitClass(card.suit), 'text-[6px] sm:text-[7px] leading-none font-bold')}>{card.value}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 当前出牌区域 - 桌面内部 */}
                            {game.status === EGameStatus.PLAYING && game.currentTrick.length > 0 && (
                                <div className="w-full px-2 sm:px-4 mb-2 sm:mb-4">
                                    <div className="flex flex-col justify-center gap-1 sm:gap-2">
                                        {game.currentTrick.map((played, i) => {
                                            const player = players.find(p => p.id === played.playerId);
                                            const colorIdx = (i % 5) + 1;
                                            const color = PLAYER_COLORS[colorIdx as keyof typeof PLAYER_COLORS] ?? PLAYER_COLORS[1];
                                            const biggestCard = getCurrentWinner();
                                            const isBiggest = biggestCard && biggestCard.playerId === played.playerId;
                                            return (
                                                <div key={i} className={cn('flex items-center gap-2 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 backdrop-blur-md border relative', color.bg, color.border, isBiggest && 'ring-2 ring-yellow-400')}>
                                                    {isBiggest && (
                                                        <div className="absolute -top-1 -right-1 px-1 py-0.5 rounded-full bg-yellow-400 text-[8px] sm:text-[10px] font-bold text-black">最大</div>
                                                    )}
                                                    <div className={cn(
                                                        'flex-shrink-0 px-1.5 py-0.5 rounded-full text-[9px] sm:text-xs font-bold border backdrop-blur-sm',
                                                        color.badge
                                                    )}>
                                                        {player?.username?.substring(0, 4) || '?'}
                                                    </div>
                                                    <div className="flex gap-0.5 sm:gap-1 flex-wrap">
                                                        {played.cards.map((card, j) => (
                                                            <div key={j} className={cn('h-6 w-4 sm:h-9 sm:w-6 flex-col items-center justify-center rounded-md font-bold border backdrop-blur-sm bg-white/10 overflow-hidden flex', color.border)}>
                                                                {isJoker(card) ? (
                                                                    <img src={getJokerImageUrl(card)} alt={card.value === 'Big' ? '大王' : '小王'} className="w-full h-full object-contain" />
                                                                ) : (
                                                                    <>
                                                                        <span className={cn(getSuitClass(card.suit), 'text-[9px] sm:text-xs leading-none font-black')}>{SUIT_SYMBOLS[card.suit]||''}</span>
                                                                        <span className={cn(getSuitClass(card.suit), 'text-[7px] sm:text-[10px] leading-none font-bold')}>{card.value}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 无出牌时 */}
                            {game.status === EGameStatus.PLAYING && game.currentTrick.length === 0 && (
                                <div className="z-10 text-center p-4">
                                    <div className="text-white/30 text-sm sm:text-lg">等待出牌...</div>
                                    {game.currentPlayer === game.myPosition && (
                                        <div className="mt-2 text-emerald-400/60 text-xs sm:text-sm">请选择手牌</div>
                                    )}
                                </div>
                            )}

                            {/* 非进行中状态提示 */}
                            {game.status !== EGameStatus.PLAYING && (
                                <div className="z-10 text-center p-4">
                                    <div className="text-white/30 text-sm sm:text-base">{game.status === EGameStatus.WAITING ? '等待开始...' : ''}</div>
                                </div>
                            )}
                        </div>
                    </div>
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

            {/* 手牌区域 */}
            <div className="border-t border-white/10 hand-area-glass">
                <div className="sm:p-3 pt-4 overflow-hidden">
                    <PlayerHand
                        cards={game.myHand}
                        trumpRank={game.trumpRank}
                        trumpSuit={game.trumpSuit ?? undefined}
                        gameStatus={game.status}
                        friendCard={game.hostCalledCard}
                        size={game.myHand?.length > 20 ? "xs" : "sm"}
                        myCalledRank={(() => {
                          const myRecord = game.callRecords?.find(r => r.seat === game.myPosition);
                          return myRecord?.rank;
                        })()}
                        otherCalledRank={(() => {
                          const otherRecords = game.callRecords?.filter(r => r.seat !== game.myPosition);
                          return otherRecords?.length ? otherRecords[otherRecords.length - 1].rank : undefined;
                        })()}
                    />
                </div>

                {/* 游戏控制按钮 */}
                <div className="mt-2 sm:mt-3 rounded-xl border border-white/15 game-control-panel p-2 sm:p-4">
                    {game.status === EGameStatus.WAITING && (
                        <div className="flex flex-col items-center gap-2 sm:gap-3">
                            <div className="text-center">
                                <p className="text-xs sm:text-sm text-white/70">
                                    等待玩家准备... ({readyStatusData?.readyStates?.filter(s => s.isReady).length || 0}/5 已准备)
                                </p>
                                <div className="mt-1 sm:mt-2 flex flex-wrap justify-center gap-1 sm:gap-2">
                                    {players?.map((player) => {
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

                            {(players?.length || 0) < 5 && (
                                <p className="text-[10px] sm:text-xs text-white/40 text-center px-1">
                                    需要5人加入并全部准备后开始游戏
                                </p>
                            )}
                            {(players?.length || 0) >= 5 && (
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

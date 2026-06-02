import PlayingCard from './PlayingCard';
import { useGameStore } from '@/store/gameStore';
import type { ICard } from '@/types';
import { ECardSuit } from '@/types';
import { useEffect, useRef, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { isJoker, isBigJoker } from '@/lib/card';

interface IPlayerHandProps {
  cards: ICard[];
  interactive?: boolean;
  trumpRank?: string; // 当前级牌点数
  trumpSuit?: string; // 主牌花色
  gameStatus?: string; // 游戏状态
  friendCard?: {
    suit: string;
    value: string;
    position: number;
    count: number;
  }; // 盟友牌信息
  size?: 'xs' | 'sm' | 'md' | 'lg'; // 牌的大小
  otherCalledRank?: string; // 对方叫的级牌（用于白色粒子特效）
  myCalledRank?: string; // 自己叫的级牌（用于金色粒子特效）
}

export default function PlayerHand({
  cards,
  interactive = true,
  trumpRank,
  trumpSuit,
  gameStatus,
  friendCard,
  size = 'md',
  otherCalledRank,
  myCalledRank,
}: IPlayerHandProps) {
  const { selectedCardIndices, toggleCard, setCardCount } = useGameStore();
  const prevCount = useRef(cards.length);

  // 理牌函数：主牌单独放一堆，其他牌红黑交错
  const sortCards = (cards: ICard[]): ICard[] => {
    // 判断是否是主牌
    // 注意：发牌阶段 trumpSuit 尚未确定，但 trumpRank 已知，
    // 此时仍把"级牌 + 大小王"视作 trump，保证手牌从一开始就理好
    const isTrumpCard = (card: ICard): boolean => {
      if (card.suit === 'joker') return true;
      if (trumpRank && card.value === trumpRank) return true;
      if (trumpSuit && card.suit === trumpSuit) return true;
      return false;
    };

    // 非主牌的花色排序（红黑交错）
    const suitOrder: Record<string, number> = {
      [ECardSuit.SPADES]: 0,   // 黑桃 - 黑色
      [ECardSuit.HEARTS]: 1,   // 红桃 - 红色
      [ECardSuit.CLUBS]: 2,    // 梅花 - 黑色
      [ECardSuit.DIAMONDS]: 3, // 方片 - 红色
    };
    const valueOrder: Record<string, number> = {
      '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7, '10': 8,
      'J': 9, 'Q': 10, 'K': 11, 'A': 12, 'small': 13, 'big': 14,
    };

    return [...cards].sort((a, b) => {
      const aIsTrump = isTrumpCard(a);
      const bIsTrump = isTrumpCard(b);

      // 主牌放在最前面
      if (aIsTrump && !bIsTrump) return -1;
      if (!aIsTrump && bIsTrump) return 1;

      // 都是主牌：大小王优先排最前，然后级牌，然后按花色排序，再按点数排序（从大到小）
      if (aIsTrump && bIsTrump) {
        const aIsJokerCard = isJoker(a);
        const bIsJokerCard = isJoker(b);

        // 大小王优先
        if (aIsJokerCard && !bIsJokerCard) return -1;
        if (!aIsJokerCard && bIsJokerCard) return 1;

        // 大王 > 小王
        if (aIsJokerCard && bIsJokerCard) {
          const aIsBig = isBigJoker(a);
          const bIsBig = isBigJoker(b);
          if (aIsBig && !bIsBig) return -1;
          if (!aIsBig && bIsBig) return 1;
          return 0;
        }

        const aIsTrumpRank = a.value === trumpRank;
        const bIsTrumpRank = b.value === trumpRank;

        // 级牌优先
        if (aIsTrumpRank && !bIsTrumpRank) return -1;
        if (!aIsTrumpRank && bIsTrumpRank) return 1;

        const suitDiff = (a.suit === trumpSuit ? -1 : (suitOrder[a.suit] ?? 4)) - (b.suit === trumpSuit ? -1 : (suitOrder[b.suit] ?? 4));
        if (suitDiff !== 0) return suitDiff;
        return valueOrder[b.value] - valueOrder[a.value];
      }

      // 都是非主牌：红黑交错排序（从大到小）
      const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
      if (suitDiff !== 0) return suitDiff;
      return valueOrder[b.value] - valueOrder[a.value];
    });
  };

  // 排序后的手牌（用于显示），保持原始索引用于选牌
  // 依赖 cards / trumpSuit / trumpRank：发牌阶段每来一张新牌都会重新捋
  const sortedCards = useMemo(() => sortCards(cards), [cards, trumpSuit, trumpRank]); // eslint-disable-line react-hooks/exhaustive-deps

  // 判断是否是主牌（亮庄结束后）
  const isTrumpCard = (card: ICard) => {
    if (!trumpSuit || !trumpRank) return false;
    if (card.suit === 'joker') return true;
    if (card.value === trumpRank) return true;
    if (card.suit === trumpSuit) return true;
    return false;
  };

  // 按花色分组（用于移动端标签页）
  const groupCardsBySuit = useMemo(() => {
    const groups: Record<string, ICard[]> = {
      trump: [],
      spades: [],
      hearts: [],
      clubs: [],
      diamonds: [],
    };

    sortedCards.forEach(card => {
      if (isTrumpCard(card)) {
        groups.trump.push(card);
      } else if (card.suit === ECardSuit.SPADES) {
        groups.spades.push(card);
      } else if (card.suit === ECardSuit.HEARTS) {
        groups.hearts.push(card);
      } else if (card.suit === ECardSuit.CLUBS) {
        groups.clubs.push(card);
      } else if (card.suit === ECardSuit.DIAMONDS) {
        groups.diamonds.push(card);
      }
    });

    return groups;
  }, [sortedCards, trumpSuit, trumpRank]);

  const [activeTab, setActiveTab] = useState('all');

  // 创建排序后索引到原始索引的映射
  const sortedToOriginalIndex = useMemo(() => {
    const sorted = sortCards([...cards.map((c, i) => ({ ...c, _origIndex: i }))]);
    return sorted.map(card => (card as ICard & { _origIndex: number })._origIndex);
  }, [cards]);

  useEffect(() => {
    if (cards.length !== prevCount.current) {
      setCardCount(cards.length);
      prevCount.current = cards.length;
    }
  }, [cards.length, setCardCount]);

  // 判断是否是级牌
  const isTrumpRankCard = (card: ICard): boolean => {
    return trumpRank ? card.value === trumpRank : false;
  };

  // 判断是否显示级牌高亮（亮庄阶段）
  const shouldHighlightTrumpRank = (card: ICard): boolean => {
    if (gameStatus !== 'calling') return false;
    return isTrumpRankCard(card);
  };

  // 判断是否显示对方级牌高亮（亮庄阶段）
  const shouldHighlightOtherTrumpRank = (card: ICard): boolean => {
    if (gameStatus !== 'calling') return false;
    if (!otherCalledRank) return false;
    if (isTrumpRankCard(card)) return false; // 自己叫的不算
    return card.value === otherCalledRank;
  };

  // 获取主牌类型
  const getTrumpType = (card: ICard): 'mine' | 'other' | 'confirmed' | undefined => {
    // 亮庄阶段
    if (gameStatus === 'calling') {
      if (isTrumpRankCard(card) && myCalledRank) {
        return 'mine'; // 自己的级牌
      }
      if (shouldHighlightOtherTrumpRank(card)) {
        return 'other'; // 对方的级牌
      }
    }
    // 亮庄结束后，所有主牌
    if (gameStatus !== 'calling' && gameStatus !== 'waiting') {
      if (isTrumpCard(card)) {
        return 'confirmed';
      }
    }
    return undefined;
  };

  // 判断是否显示主牌高亮（亮庄结束后）
  const shouldHighlightTrump = (card: ICard) => {
    // 亮庄阶段结束后才高亮主牌
    if (gameStatus === 'calling' || gameStatus === 'waiting') return false;
    return isTrumpCard(card);
  };

  // 判断卡片是否可用
  const isCardDisabled = (_index: number): boolean => {
    //：所有玩家都可以 亮庄阶段选择级牌
    if (gameStatus === 'calling') return false;
    // 出牌阶段暂时不限制，任何牌都可以出
    return false;
  };

  // 判断是否是盟友牌
  const isFriendCard = (card: ICard): boolean => {
    if (!friendCard) return false;
    return card.suit === friendCard.suit && card.value === friendCard.value;
  };

  return (
    <>
      {/* 移动端：标签页布局 */}
      <div className="md:hidden w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {/* 全部手牌标签 */}
            <TabsTrigger value="all" className="relative">
              全部 <span className="ml-1 text-xs opacity-70">({sortedCards.length})</span>
            </TabsTrigger>
            {groupCardsBySuit.trump.length > 0 && (
              <TabsTrigger value="trump" className="relative">
                主 <span className="ml-1 text-xs opacity-70">({groupCardsBySuit.trump.length})</span>
              </TabsTrigger>
            )}
            {groupCardsBySuit.spades.length > 0 && (
              <TabsTrigger value="spades" className="relative">
                ♠ <span className="ml-1 text-xs opacity-70">({groupCardsBySuit.spades.length})</span>
              </TabsTrigger>
            )}
            {groupCardsBySuit.hearts.length > 0 && (
              <TabsTrigger value="hearts" className="relative">
                ♥ <span className="ml-1 text-xs opacity-70">({groupCardsBySuit.hearts.length})</span>
              </TabsTrigger>
            )}
            {groupCardsBySuit.clubs.length > 0 && (
              <TabsTrigger value="clubs" className="relative">
                ♣ <span className="ml-1 text-xs opacity-70">({groupCardsBySuit.clubs.length})</span>
              </TabsTrigger>
            )}
            {groupCardsBySuit.diamonds.length > 0 && (
              <TabsTrigger value="diamonds" className="relative">
                ♦ <span className="ml-1 text-xs opacity-70">({groupCardsBySuit.diamonds.length})</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* 全部手牌 */}
          <TabsContent value="all" className="mt-2">
            <div className="flex flex-wrap items-end justify-start gap-1">
              {sortedCards.map((card, i) => {
                const disabled = isCardDisabled(i);
                const isFriend = isFriendCard(card);
                return (
                  <div key={`${card.suit}-${card.value}-${i}`} className={disabled ? 'opacity-40' : ''}>
                    <PlayingCard
                      card={card}
                      selected={selectedCardIndices.has(sortedToOriginalIndex[i])}
                      onClick={interactive && !disabled ? () => toggleCard(sortedToOriginalIndex[i]) : undefined}
                      size="sm"
                      isTrumpRank={shouldHighlightTrumpRank(card)}
                      isOtherTrumpRank={shouldHighlightOtherTrumpRank(card)}
                      isTrump={shouldHighlightTrump(card)}
                      isFriend={isFriend}
                      trumpType={getTrumpType(card)}
                    />
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {Object.entries(groupCardsBySuit).map(([suit, suitCards]) => (
            suitCards.length > 0 && (
              <TabsContent key={suit} value={suit} className="mt-2">
                <div className="flex flex-wrap items-end justify-start gap-1">
                  {suitCards.map((card) => {
                    const i = sortedCards.indexOf(card);
                    const disabled = isCardDisabled(i);
                    const isFriend = isFriendCard(card);
                    return (
                      <div key={`${card.suit}-${card.value}-${i}`} className={disabled ? 'opacity-40' : ''}>
                        <PlayingCard
                          card={card}
                          selected={selectedCardIndices.has(sortedToOriginalIndex[i])}
                          onClick={interactive && !disabled ? () => toggleCard(sortedToOriginalIndex[i]) : undefined}
                          size="sm"
                          isTrumpRank={shouldHighlightTrumpRank(card)}
                          isOtherTrumpRank={shouldHighlightOtherTrumpRank(card)}
                          isTrump={shouldHighlightTrump(card)}
                          isFriend={isFriend}
                          trumpType={getTrumpType(card)}
                        />
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            )
          ))}
        </Tabs>
      </div>

      {/* 桌面端：平铺布局（可换行） */}
      <div className="hidden md:flex flex-wrap items-end justify-start gap-1">
        {sortedCards.map((card, i) => {
          const disabled = isCardDisabled(i);
          const isFriend = isFriendCard(card);
          return (
            <div
              key={`${card.suit}-${card.value}-${i}`}
              className={`animate-card-deal ${disabled ? 'opacity-40' : ''}`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <PlayingCard
                card={card}
                selected={selectedCardIndices.has(sortedToOriginalIndex[i])}
                onClick={interactive && !disabled ? () => toggleCard(sortedToOriginalIndex[i]) : undefined}
                size={size}
                isTrumpRank={shouldHighlightTrumpRank(card)}
                isOtherTrumpRank={shouldHighlightOtherTrumpRank(card)}
                isTrump={shouldHighlightTrump(card)}
                isFriend={isFriend}
                trumpType={getTrumpType(card)}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

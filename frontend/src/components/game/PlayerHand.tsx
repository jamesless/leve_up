import PlayingCard from './PlayingCard';
import { useGameStore } from '@/store/gameStore';
import type { ICard } from '@/types';
import { ECardSuit } from '@/types';
import { useEffect, useRef, useMemo } from 'react';

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
  size?: 'sm' | 'md' | 'lg'; // 牌的大小
}

export default function PlayerHand({
  cards,
  interactive = true,
  trumpRank,
  trumpSuit,
  gameStatus,
  friendCard,
  size = 'md',
}: IPlayerHandProps) {
  const { selectedCardIndices, toggleCard, setCardCount } = useGameStore();
  const prevCount = useRef(cards.length);

  // 理牌函数：主牌单独放一堆，其他牌红黑交错
  const sortCards = (cards: ICard[]): ICard[] => {
    // 判断是否是主牌
    const isTrumpCard = (card: ICard): boolean => {
      if (!trumpSuit || !trumpRank) return false;
      if (card.suit === 'joker') return true;
      if (card.value === trumpRank) return true;
      if (card.suit === trumpSuit) return true;
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

      // 都是主牌：级牌最大优先排前面，然后按花色排序，再按点数排序（从大到小）
      if (aIsTrump && bIsTrump) {
        const aIsTrumpRank = a.value === trumpRank;
        const bIsTrumpRank = b.value === trumpRank;

        // 级牌优先
        if (aIsTrumpRank && !bIsTrumpRank) return -1;
        if (!aIsTrumpRank && bIsTrumpRank) return 1;

        const suitDiff = (suitOrder[a.suit] ?? 4) - (suitOrder[b.suit] ?? 4);
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
  const sortedCards = useMemo(() => sortCards(cards), [cards]);

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

  // 判断是否是主牌（叫庄结束后）
  const isTrumpCard = (card: ICard) => {
    if (!trumpSuit || !trumpRank) return false;
    // 大小王永远是主牌
    if (card.suit === 'joker') return true;
    // 级牌永远是主牌
    if (card.value === trumpRank) return true;
    // 主牌花色的牌
    if (card.suit === trumpSuit) return true;
    return false;
  };

  // 判断是否显示级牌高亮（叫庄阶段）
  const shouldHighlightTrumpRank = (card: ICard): boolean => {
    if (gameStatus !== 'calling') return false;
    return isTrumpRankCard(card);
  };

  // 判断是否显示主牌高亮（叫庄结束后）
  const shouldHighlightTrump = (card: ICard) => {
    // 叫庄阶段结束后才高亮主牌
    if (gameStatus === 'calling' || gameStatus === 'waiting') return false;
    return isTrumpCard(card);
  };

  // 判断是否显示主牌标签
  const shouldShowTrumpLabel = (card: ICard) => {
    // 只在叫庄结束后显示标签
    if (gameStatus === 'calling' || gameStatus === 'waiting') return false;
    return isTrumpCard(card);
  };

  // 判断卡片是否可用
  const isCardDisabled = (_index: number): boolean => {
    //：所有玩家都可以 叫庄阶段选择级牌
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
    <div className="flex flex-wrap items-end justify-start gap-1">
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
              isTrump={shouldHighlightTrump(card)}
              showTrumpLabel={shouldShowTrumpLabel(card)}
              isFriend={isFriend}
            />
          </div>
        );
      })}
    </div>
  );
}

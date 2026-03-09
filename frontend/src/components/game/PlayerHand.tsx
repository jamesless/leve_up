import PlayingCard from './PlayingCard';
import { useGameStore } from '@/store/gameStore';
import type { ICard } from '@/types';
import { useEffect, useRef } from 'react';

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
}

export default function PlayerHand({
  cards,
  interactive = true,
  trumpRank,
  trumpSuit,
  gameStatus,
  friendCard,
}: IPlayerHandProps) {
  const { selectedCardIndices, toggleCard, setCardCount } = useGameStore();
  const prevCount = useRef(cards.length);

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
    <div className="flex flex-wrap items-end justify-center gap-1">
      {cards.map((card, i) => {
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
              selected={selectedCardIndices.has(i)}
              onClick={interactive && !disabled ? () => toggleCard(i) : undefined}
              size="md"
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

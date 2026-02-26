import PlayingCard from './PlayingCard';
import { sortCards } from '@/lib/card';
import { useGameStore } from '@/store/gameStore';
import type { ICard } from '@/types';
import { useEffect, useRef } from 'react';

interface IPlayerHandProps {
  cards: ICard[];
  interactive?: boolean;
}

export default function PlayerHand({ cards, interactive = true }: IPlayerHandProps) {
  const { selectedCardIndices, toggleCard, setCardCount } = useGameStore();
  const sorted = sortCards(cards);
  const prevCount = useRef(cards.length);

  useEffect(() => {
    if (cards.length !== prevCount.current) {
      setCardCount(cards.length);
      prevCount.current = cards.length;
    }
  }, [cards.length, setCardCount]);

  return (
    <div className="flex flex-wrap items-end justify-center gap-1">
      {sorted.map((card, i) => (
        <div
          key={`${card.suit}-${card.value}-${i}`}
          className="animate-card-deal"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          <PlayingCard
            card={card}
            selected={selectedCardIndices.has(i)}
            onClick={interactive ? () => toggleCard(i) : undefined}
            size="md"
          />
        </div>
      ))}
    </div>
  );
}

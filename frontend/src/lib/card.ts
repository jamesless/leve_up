import { ECardSuit, type ICard, type TCardValue } from '@/types';

const SUIT_SYMBOLS: Record<ECardSuit, string> = {
  [ECardSuit.HEARTS]: '♥',
  [ECardSuit.DIAMONDS]: '♦',
  [ECardSuit.CLUBS]: '♣',
  [ECardSuit.SPADES]: '♠',
  [ECardSuit.JOKER]: '★',
};

const CARD_ORDER: TCardValue[] = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',
];

const LEVELS: TCardValue[] = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',
];

export function getSuitSymbol(suit: ECardSuit): string {
  return SUIT_SYMBOLS[suit] ?? '';
}

export function isRedSuit(suit: ECardSuit): boolean {
  return suit === ECardSuit.HEARTS || suit === ECardSuit.DIAMONDS;
}

export function getCardDisplayValue(card: ICard): string {
  if (card.suit === ECardSuit.JOKER) {
    return card.value === 'Big' ? '大王' : '小王';
  }
  return card.value;
}

export function getCardSortValue(value: TCardValue): number {
  return CARD_ORDER.indexOf(value);
}

export function sortCards(cards: ICard[]): ICard[] {
  return [...cards].sort((a, b) => {
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
    return getCardSortValue(b.value) - getCardSortValue(a.value);
  });
}

export function getNextLevel(currentLevel: TCardValue): TCardValue {
  const index = LEVELS.indexOf(currentLevel);
  if (index < 0 || index >= LEVELS.length - 1) return currentLevel;
  return LEVELS[index + 1];
}

export function getLevelAfterJump(currentLevel: TCardValue, jump: number): TCardValue {
  const index = LEVELS.indexOf(currentLevel);
  if (index < 0) return currentLevel;
  const newIndex = Math.min(index + jump, LEVELS.length - 1);
  return LEVELS[newIndex];
}

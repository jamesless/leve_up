export enum ECardSuit {
  HEARTS = 'hearts',
  DIAMONDS = 'diamonds',
  CLUBS = 'clubs',
  SPADES = 'spades',
  JOKER = 'joker',
}

export type TCardValue =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A'
  | 'Small'
  | 'Big';

export interface ICard {
  suit: ECardSuit;
  value: TCardValue;
  index?: number;
}

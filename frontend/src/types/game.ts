import type { ICard, ECardSuit } from './card';

export enum EGameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished',
}

export interface IPlayer {
  id: number;
  username: string;
  position: number;
  isReady: boolean;
  isAI: boolean;
  cardCount: number;
}

export interface IRoom {
  id: number;
  name: string;
  host: string;
  hostId: number;
  players: IPlayer[];
  maxPlayers: number;
  status: EGameStatus;
  createdAt: string;
}

export interface IGameState {
  id: string;
  status: EGameStatus;
  currentLevel: string;
  currentPlayer: number;
  dealerTeam: number[];
  currentTrick: IPlayedCards[];
  players: IPlayer[];
  myHand: ICard[];
  myPosition: number;
  trumpSuit: ECardSuit | null;
  bottomCards: ICard[];
  scores: Record<number, number>;
}

export interface IPlayedCards {
  playerId: number;
  cards: ICard[];
}

export interface ICreateGameRequest {
  name: string;
  password?: string;
}

export interface IGameResponse {
  success: boolean;
  game?: IGameState;
  error?: string;
}

export interface IRoomsResponse {
  success: boolean;
  rooms?: IRoom[];
  error?: string;
}

export interface ICreateGameResponse {
  success: boolean;
  gameId?: string;
  game?: IGameState;
  error?: string;
}

export interface IPlayCardRequest {
  cardIndices?: number[];
  cardIndex?: number[] | number;
}

export interface IGameAction {
  type: string;
  playerId: number;
  cards?: ICard[];
  timestamp: string;
}

export interface IReplayData {
  actions: IGameAction[];
  players: IPlayer[];
  finalScores: Record<number, number>;
}

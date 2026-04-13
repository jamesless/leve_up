import type { ICard, ECardSuit } from './card';

export enum EGameStatus {
  WAITING = 'waiting',
  DEALING = 'dealing',           // 发牌阶段
  CALLING = 'calling',           // 叫庄阶段
  CALLING_FRIEND = 'calling_friend', // 叫朋友阶段
  DISCARDING = 'discarding',     // 扣牌阶段
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
  level: string;
  isFriend?: boolean;
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
  lastCompletedTrick?: IPlayedCards[]; // 上一轮完成的所有出牌记录
  players: IPlayer[];
  myHand: ICard[];
  myPosition: number;
  trumpSuit: ECardSuit | null;
  trumpRank?: string; // 级牌点数
  bottomCards: ICard[];
  scores: Record<number, number>;
  // 叫庄相关
  dealerSeat?: number;
  callPhase?: string;
  callCountdown?: number;
  currentCaller?: number;
  callRecords?: ICallRecord[];
  passedSeats?: number[];
  flippedBottomCards?: ICard[];
  // 叫朋友相关
  hostCalledCard?: {
    suit: string;
    value: string;
    position: number;
    count: number;
  };
  friendRevealed?: boolean;
  friendSeat?: number;
  // 发牌相关
  dealtCardCount?: number;
  totalCardsPerPlayer?: number;
  dealingPhase?: string;
  // 本局结算
  totalPoints?: number;   // 抓分方总得分
  roundResults?: IGameRoundResult[]; // 每个玩家的结算结果
  lastPlay?: ILastPlay;  // 最后一手牌结果（含结算信息）
}

export interface IGameRoundResult {
  user_id: string;
  old_level: string;
  new_level: string;
  is_winner: boolean;
  score: number;
}

export interface ILastPlay {
  success: boolean;
  message: string;
  nextPlayer: number;
  trickComplete: boolean;
  trickWinner?: number;
  gameEnded?: boolean;
  winnerTeam?: 'host' | 'guest';
  finalScore?: number;
  gameResults?: IGameRoundResult[];
}

export interface ICallRecord {
  seat: number;
  suit: string;
  rank: string;
  count: number;
  timestamp: number;
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
  table?: IGameState;
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

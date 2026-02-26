import { get, post } from '@/lib/request';
import type {
  ICreateGameResponse,
  IGameResponse,
  IPlayCardRequest,
} from '@/types';

export const createGame = (name: string) =>
  post<ICreateGameResponse>('/game/create', { name });

export const createSinglePlayerGame = () =>
  post<ICreateGameResponse>('/game/singleplayer');

export const getGame = (id: string) => get<IGameResponse>(`/game/${id}`);

export const getGameTable = (id: string) => get<IGameResponse>(`/game/${id}/table`);

export const joinGame = (id: string) =>
  post<{ success: boolean; error?: string }>(`/game/${id}/join`);

export const startGame = (id: string) =>
  post<{ success: boolean; error?: string }>(`/game/${id}/start`);

export const startSinglePlayerGame = (id: string) =>
  post<IGameResponse>(`/game/${id}/start-single`);

export const callFriend = (id: string, suit: string, value: string, position = 1) =>
  post<IGameResponse>(`/game/${id}/call-friend`, { suit, value, position });

export const callDealer = (id: string, suit: string, cardIndices: number[]) =>
  post<IGameResponse>(`/game/${id}/call-dealer`, { suit, cardIndices });

export const flipBottomCard = (id: string) =>
  post<IGameResponse>(`/game/${id}/flip-bottom`);

export const discardBottomCards = (id: string, cardIndices: number[]) =>
  post<IGameResponse>(`/game/${id}/discard-bottom`, { cardIndices });

export const playCards = (id: string, data: IPlayCardRequest) =>
  post<IGameResponse>(`/game/${id}/play`, data);

export const aiPlay = (id: string) =>
  post<IGameResponse>(`/game/${id}/ai-play`);

export const getGameReplay = (id: string) =>
  get<{ success: boolean; replay?: unknown }>(`/game/${id}/replay`);

export const getGameActions = (id: string) =>
  get<{ success: boolean; actions?: unknown[] }>(`/game/${id}/actions`);

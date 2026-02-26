import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as gameService from '@/services/game';
import type { IPlayCardRequest } from '@/types';

export function useGameTable(gameId: string) {
  return useQuery({
    queryKey: ['gameTable', gameId],
    queryFn: () => gameService.getGameTable(gameId),
    refetchInterval: 3000,
    enabled: Boolean(gameId),
  });
}

export function useGame(gameId: string) {
  return useQuery({
    queryKey: ['game', gameId],
    queryFn: () => gameService.getGame(gameId),
    refetchInterval: 5000,
    enabled: Boolean(gameId),
  });
}

export function useCreateGame() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (name: string) => gameService.createGame(name),
    onSuccess: (res) => {
      const gameId = res.gameId ?? res.game?.id;
      if (res.success && gameId) {
        navigate(`/game/table/${gameId}`);
      }
    },
  });
}

export function useCreateSinglePlayerGame() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => gameService.createSinglePlayerGame(),
    onSuccess: (res) => {
      const gameId = res.gameId ?? res.game?.id;
      if (res.success && gameId) {
        navigate(`/game/singleplayer/${gameId}`);
      }
    },
  });
}

export function useJoinGame() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (gameId: string) => gameService.joinGame(gameId),
    onSuccess: (_res, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
      navigate(`/game/table/${gameId}`);
    },
  });
}

export function useStartGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => gameService.startGame(gameId),
    onSuccess: (_res, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['gameTable', gameId] });
    },
  });
}

export function useStartSinglePlayerGame(gameId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => gameService.startSinglePlayerGame(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameTable', gameId] });
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
  });
}

export function usePlayCards(gameId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IPlayCardRequest) => gameService.playCards(gameId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameTable', gameId] });
    },
  });
}

export function useAiPlay(gameId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => gameService.aiPlay(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameTable', gameId] });
    },
  });
}

export function useGameReplay(gameId: string) {
  return useQuery({
    queryKey: ['gameReplay', gameId],
    queryFn: () => gameService.getGameReplay(gameId),
    enabled: Boolean(gameId),
  });
}

export function useGameActions(gameId: string) {
  return useQuery({
    queryKey: ['gameActions', gameId],
    queryFn: () => gameService.getGameActions(gameId),
    enabled: Boolean(gameId),
  });
}

export function useCallDealer(gameId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { suit: string; cardIndices: number[] }) =>
      gameService.callDealer(gameId, params.suit, params.cardIndices),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameTable', gameId] });
    },
  });
}

export function useDiscardBottomCards(gameId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardIndices: number[]) =>
      gameService.discardBottomCards(gameId, cardIndices),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameTable', gameId] });
    },
  });
}

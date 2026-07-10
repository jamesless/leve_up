import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';

interface GameRoom {
  id: string;
  name: string;
  hostId: string;
  playerIds: string[];
  maxPlayers: number;
  status: string;
  currentLevel: string;
  createdAt: string;
  players: Array<{ id: string; username: string; level: number }>;
}

interface WebSocketMessage {
  type: string;
  payload: any;
}

export function useLobbyWebSocket() {
  const queryClient = useQueryClient();

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'room_created': {
        // Add new room to the beginning of the list
        const newRoom = message.payload as GameRoom;
        queryClient.setQueryData(['games'], (old: any) => {
          if (!old || !old.games) return { games: [newRoom] };

          // Check if room already exists to avoid duplicates
          const exists = old.games.some((room: GameRoom) => room.id === newRoom.id);
          if (exists) return old;

          return { ...old, games: [newRoom, ...old.games] };
        });
        break;
      }

      case 'room_update': {
        // Update existing room
        const updatedRoom = message.payload as GameRoom;
        queryClient.setQueryData(['games'], (old: any) => {
          if (!old || !old.games) return old;

          return {
            ...old,
            games: old.games.map((room: GameRoom) =>
              room.id === updatedRoom.id ? updatedRoom : room
            ),
          };
        });
        break;
      }

      case 'room_deleted': {
        // Remove room from list
        const { roomId } = message.payload;
        queryClient.setQueryData(['games'], (old: any) => {
          if (!old || !old.games) return old;

          return {
            ...old,
            games: old.games.filter((room: GameRoom) => room.id !== roomId),
          };
        });
        break;
      }

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  };

  // Determine WebSocket URL based on current location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/ws/lobby`;

  return useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
    onOpen: () => {
      console.log('✅ WebSocket connected to lobby');
    },
    onClose: () => {
      console.log('❌ WebSocket disconnected from lobby');
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  });
}

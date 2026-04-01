import { useState, useMemo, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Bot, Users, Loader2, RefreshCw, Crown, Search, Clock, Play, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { useCurrentUser } from '@/hooks/useAuth';
import { useCreateGame, useCreateSinglePlayerGame, useJoinGame, useGameList } from '@/hooks/useGame';
import { useLobbyWebSocket } from '@/hooks/useLobbyWebSocket';

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

const statusLabels: Record<string, string> = {
  waiting: '等待中',
  calling: '抢庄中',
  calling_friend: '叫朋友中',
  discarding: '扣牌中',
  playing: '游戏中',
  finished: '已结束',
};

type FilterStatus = 'all' | 'waiting' | 'playing';

interface RoomCardProps {
  game: GameRoom;
  user: { id: string; username: string; wins: number; losses: number } | null;
  onJoin: (gameId: string) => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ game, user, onJoin }) => {
  const playerCount = game.players?.length || 0;
  const isHost = user && game.hostId === user.id;
  const canJoin = !isHost && playerCount < game.maxPlayers && game.status === 'waiting';

  return (
    <Card
      className={`relative transition-all duration-300 bg-gradient-to-br from-purple-950/10 via-purple-900/5 to-pink-950/10 border-purple-500/40 hover:border-purple-400/80 backdrop-blur-xl shadow-xl shadow-purple-900/10 hover:shadow-purple-500/50 hover:shadow-2xl ${
        canJoin ? 'cursor-pointer hover:bg-gradient-to-br hover:from-purple-950/15 hover:via-purple-900/10 hover:to-pink-950/15 group' : ''
      }`}
      style={{ backgroundColor: 'rgba(88, 28, 135, 0.02)' }}
      onClick={() => canJoin && onJoin(game.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate flex items-center gap-2">
              {game.name}
              {isHost && (
                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400/40 text-purple-100">
                  <Crown className="h-3 w-3 mr-1 text-yellow-400" />
                  我的
                </Badge>
              )}
            </CardTitle>
          </div>
          <Badge variant="outline">{statusLabels[game.status] || game.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            {playerCount}/{game.maxPlayers} 人
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {game.currentLevel ? `当前等级: ${game.currentLevel}` : '未开始'}
          </span>
        </div>
        {game.players && game.players.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {game.players.map((player) => (
              <Badge
                key={player.id}
                variant="secondary"
                className="text-xs bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30 text-purple-100 hover:from-purple-500/30 hover:to-pink-500/30"
              >
                {player.username}
                {player.id === game.hostId && <Crown className="ml-1 h-3 w-3 text-yellow-400" />}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      {canJoin && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-2 shadow-lg shadow-purple-500/50">
            <LogIn className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </Card>
  );
};

export default function GameLobby() {
  const { isAuthenticated, user } = useAuthStore();
  const [roomName, setRoomName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  useCurrentUser();

  // WebSocket connection
  const { isConnected: wsConnected } = useLobbyWebSocket();

  const createGame = useCreateGame();
  const createSingle = useCreateSinglePlayerGame();
  const joinGame = useJoinGame();
  const { data: gamesData, isLoading: isLoadingGames, refetch } = useGameList(wsConnected);

  const games = (gamesData?.games as GameRoom[]) || [];

  const filteredGames = useMemo(() => {
    let result = games;

    // 状态过滤
    if (filterStatus !== 'all') {
      result = result.filter((game) => {
        if (filterStatus === 'waiting') return game.status === 'waiting';
        if (filterStatus === 'playing')
          return ['calling', 'calling_friend', 'discarding', 'playing'].includes(game.status);
        return true;
      });
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (game) =>
          game.name.toLowerCase().includes(query) ||
          game.players?.some((p) => p.username.toLowerCase().includes(query))
      );
    }

    return result;
  }, [games, filterStatus, searchQuery]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    createGame.mutate(roomName.trim());
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-bold">游戏大厅</h1>
            {wsConnected ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                实时
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-xs">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                轮询
              </Badge>
            )}
          </div>
          {user && (
            <p className="text-sm text-muted-foreground">
              欢迎回来，{user.username} | 胜{user.wins} 负{user.losses}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            className="gap-2 bg-gradient-to-r from-purple-500/90 to-pink-500/90 hover:from-purple-600/90 hover:to-pink-600/90 text-white shadow-lg shadow-purple-500/20 border-0"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            创建房间
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/30 text-purple-300 hover:text-purple-200 shadow-md shadow-purple-500/10"
            onClick={() => createSingle.mutate()}
            disabled={createSingle.isPending}
          >
            {createSingle.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
            单人模式
          </Button>
        </div>
      </div>

      {showCreate && (
        <Card className="mb-6 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">创建房间</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex gap-3">
              <Input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="输入房间名称"
                className="flex-1"
                required
              />
              <Button type="submit" variant="game" disabled={createGame.isPending}>
                {createGame.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '创建'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                取消
              </Button>
            </form>
            {createGame.isError && (
              <p className="mt-2 text-sm text-destructive">{createGame.error.message}</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">房间列表</h2>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={() => refetch()}
            disabled={isLoadingGames}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingGames ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        {/* 状态过滤器 */}
        <div className="flex gap-2 border-b border-border pb-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterStatus('all')}
            className="gap-1.5"
          >
            <Users className="h-3.5 w-3.5" />
            全部
            <Badge variant={filterStatus === 'all' ? 'secondary' : 'outline'} className="ml-1">
              {games.length}
            </Badge>
          </Button>
          <Button
            variant={filterStatus === 'waiting' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterStatus('waiting')}
            className="gap-1.5"
          >
            <Clock className="h-3.5 w-3.5" />
            等待中
            <Badge variant={filterStatus === 'waiting' ? 'secondary' : 'outline'} className="ml-1">
              {games.filter((g) => g.status === 'waiting').length}
            </Badge>
          </Button>
          <Button
            variant={filterStatus === 'playing' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterStatus('playing')}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            游戏中
            <Badge variant={filterStatus === 'playing' ? 'secondary' : 'outline'} className="ml-1">
              {games.filter((g) => ['calling', 'calling_friend', 'discarding', 'playing'].includes(g.status)).length}
            </Badge>
          </Button>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索房间名称或玩家..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 统计信息 */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            显示 {filteredGames.length} / {games.length} 个房间
          </span>
          {isLoadingGames && (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              更新中...
            </span>
          )}
        </div>

        {isLoadingGames ? (
          <div className="rounded-lg border border-dashed border-border/60 py-16 text-center">
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-muted-foreground/30" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 py-16 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {games.length === 0 ? '暂无可用房间' : '没有找到匹配的房间'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              {games.length === 0 ? '创建一个房间或开始单人模式' : '尝试调整搜索条件或过滤器'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredGames.map((game) => (
              <RoomCard key={game.id} game={game} user={user} onJoin={joinGame.mutate} />
            ))}
          </div>
        )}
      </div>

      {joinGame.isError && (
        <p className="mt-4 text-sm text-destructive">{joinGame.error.message}</p>
      )}
    </div>
  );
}

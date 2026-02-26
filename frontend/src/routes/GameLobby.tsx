import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Bot, Users, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { useCurrentUser } from '@/hooks/useAuth';
import { useCreateGame, useCreateSinglePlayerGame, useJoinGame } from '@/hooks/useGame';

export default function GameLobby() {
  const { isAuthenticated, user } = useAuthStore();
  const [roomName, setRoomName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useCurrentUser();
  const createGame = useCreateGame();
  const createSingle = useCreateSinglePlayerGame();
  const joinGame = useJoinGame();

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
          <h1 className="font-display text-3xl font-bold">游戏大厅</h1>
          {user && (
            <p className="text-sm text-muted-foreground">
              欢迎回来，{user.username} | 胜{user.wins} 负{user.losses}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="game" className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            创建房间
          </Button>
          <Button
            variant="outline"
            className="gap-2"
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
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </Button>
        </div>

        <div className="rounded-lg border border-dashed border-border/60 py-16 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">暂无可用房间</p>
          <p className="mt-1 text-sm text-muted-foreground/60">创建一个房间或开始单人模式</p>
        </div>
      </div>

      {joinGame.isError && (
        <p className="mt-4 text-sm text-destructive">{joinGame.error.message}</p>
      )}
    </div>
  );
}

import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { useGameReplay, useGameActions } from '@/hooks/useGame';

type TActionItem = {
  id?: number;
  actionType?: string;
  playerSeat?: number;
  actionData?: unknown;
  timestamp?: string;
};

export default function Replay() {
  const { id } = useParams<{ id: string }>();
  const gameId = id ?? '';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const replayQuery = useGameReplay(gameId);
  const actionsQuery = useGameActions(gameId);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!gameId) return <Navigate to="/game" replace />;

  if (replayQuery.isLoading || actionsQuery.isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (replayQuery.isError || actionsQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>回放加载失败</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            无法获取回放数据，请稍后重试。
          </CardContent>
        </Card>
      </div>
    );
  }

  const replayData = replayQuery.data?.replay as Record<string, unknown> | undefined;
  const actions = (actionsQuery.data?.actions ?? []) as TActionItem[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" />
        返回
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>游戏回放</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div>游戏 ID: {String(replayData?.gameId ?? gameId)}</div>
          <div>动作数: {String(replayData?.totalActions ?? actions.length)}</div>
          <div>时长(秒): {String(replayData?.durationSeconds ?? '-')}</div>
          <div>获胜方: {String(replayData?.winnerTeam ?? '-')}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>动作历史</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无动作记录</p>
          ) : (
            actions.map((item, idx) => (
              <div key={item.id ?? idx} className="rounded-md border border-border/60 p-3 text-sm">
                <div className="font-medium">{item.actionType ?? 'unknown'}</div>
                <div className="mt-1 text-muted-foreground">
                  Seat: {item.playerSeat ?? '-'} · Time: {item.timestamp ?? '-'}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

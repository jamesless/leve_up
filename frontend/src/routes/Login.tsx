import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Spade, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLogin } from '@/hooks/useAuth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <Spade className="h-6 w-6 text-amber-500" />
          </div>
          <CardTitle className="text-2xl">登录</CardTitle>
          <CardDescription>登录你的账号，开始游戏</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入用户名"
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                required
                autoComplete="current-password"
              />
            </div>

            {loginMutation.isError && (
              <p className="text-sm text-destructive">
                {loginMutation.error.message || '登录失败，请重试'}
              </p>
            )}

            <Button
              type="submit"
              variant="game"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              登录
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            还没有账号？{' '}
            <Link to="/register" className="text-amber-500 hover:text-amber-400 underline-offset-4 hover:underline">
              立即注册
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

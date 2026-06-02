import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
  const location = useLocation();
  // 进入任何一个具体房间 / 回放后都隐藏全局 Header
  const path = location.pathname;
  const hideHeader =
    path.startsWith('/game/table/') ||
    path.startsWith('/game/singleplayer/') ||
    path.startsWith('/game/replay/');
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {!hideHeader && <Header />}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

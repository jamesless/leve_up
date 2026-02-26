import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Home from './Home';
import Login from './Login';
import Register from './Register';
import GameLobby from './GameLobby';
import GameTable from './GameTable';
import Replay from './Replay';
import Rules from './Rules';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/game', element: <GameLobby /> },
      { path: '/game/table/:id', element: <GameTable /> },
      { path: '/game/singleplayer/:id', element: <GameTable /> },
      { path: '/game/replay/:id', element: <Replay /> },
      { path: '/rules', element: <Rules /> },
    ],
  },
]);

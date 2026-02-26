# Agent Guidelines

## Project Architecture

| Layer        | Path         | Purpose                                      |
| ------------ | ------------ | -------------------------------------------- |
| **backend**  | `backend/`   | Go backend (Gin + PostgreSQL + JWT)          |
| **frontend** | `frontend/`  | React frontend (Vite + Tailwind + shadcn/ui) |

### Tech Stack

### Server (Go)

- Framework: Gin
- Database: PostgreSQL
- Auth: JWT (golang-jwt/jwt/v5)
- Port: 8080

### Client (React)

- Build: Vite
- UI: Tailwind CSS + shadcn/ui + Radix UI
- State: Zustand
- Data Fetching: TanStack React Query
- Routing: React Router v7
- Icons: Lucide React

## API Request Flow

When adding a new backend endpoint, follow this workflow:

### 1. Backend: Create the endpoint

Add route in `backend/main.go` and handler in `backend/handlers/`.

### 2. Client: Create a service function

Before using the API in components or hooks, create a corresponding function in `frontend/src/services/`.

```ts
// frontend/src/services/example.ts
import { get, post, put, del } from '@/lib/request';
import type { IExample, ICreateExample } from '@/types';

export const getExamples = () => get<IExample[]>('/examples');
export const createExample = (data: ICreateExample) => post<IExample>('/examples', data);
```

### 3. Client: Use the service in hooks

Import and use the service function in your React Query hooks:

```ts
// frontend/src/hooks/useExample.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExamples, createExample } from '@/services/example';
import type { ICreateExample } from '@/types';

export function useExamples() {
  return useQuery({
    queryKey: ['examples'],
    queryFn: getExamples,
  });
}

export function useCreateExample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ICreateExample) => createExample(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examples'] });
    },
  });
}
```

## Naming Conventions

- **Interface**: starts with `I` (e.g., `IUser`, `IGameState`)
- **Type**: starts with `T` (e.g., `TCardValue`, `TRequestOptions`)
- **Enum**: starts with `E` (e.g., `EGameStatus`, `ECardSuit`)
- **Components**: UpperCamelCase (e.g., `PlayingCard`, `GameLobby`)
- **Variables/Functions**: lowerCamelCase (e.g., `useAuth`, `getGame`)
- **Constants**: CONSTANT_CASE (e.g., `CARD_ORDER`, `BASE_URL`)

## Rules

- **Always use the wrapped request functions** (`get`, `post`, `put`, `del`) from `@/lib/request` for HTTP requests. Do not use raw `fetch`.
- **Always create a service function first** before consuming an API in components or hooks.
- **Keep services organized** by feature/domain (e.g., `auth.ts`, `game.ts`).
- **Use TypeScript types** from `frontend/src/types/` for all request/response types.
- **Use Zustand** for client-side state, **React Query** for server state.

## Code Quality

Before committing, ensure:

- `cd frontend && npx tsc --noEmit` passes without errors
- Frontend builds successfully with `cd frontend && npm run build`
- Go backend compiles with `cd backend && go build .`

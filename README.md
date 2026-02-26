# 升级 - 五人三副牌找朋友

经典中国扑克牌游戏「升级」，支持五人三副牌找朋友玩法。

## 项目结构

```text
leve_up/
├── backend/          # Go 后端
│   ├── main.go       # 入口文件
│   ├── handlers/     # API 路由处理
│   ├── middleware/   # 鉴权中间件
│   ├── models/       # 数据模型与游戏逻辑
│   ├── scripts/      # 初始化脚本
│   └── test/         # 后端测试与验证脚本
├── frontend/         # React 前端
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── store/
│   │   └── types/
│   └── ...config files
└── RULE.md           # 详细游戏规则文档
```

## 详细规则说明

- 完整规则请查看 `RULE.md`
- 建议按顺序阅读：基础术语 → 叫庄/反庄 → 找朋友 → 出牌判定 → 计分升级
- `README.md` 仅保留运行与开发说明，规则以 `RULE.md` 为准

## 技术栈

### 后端 (`backend/`)

| 技术       | 用途     |
| ---------- | -------- |
| Go 1.21    | 编程语言 |
| Gin        | Web 框架 |
| PostgreSQL | 数据库   |
| JWT        | 用户认证 |

### 前端 (`frontend/`)

| 技术                  | 用途           |
| --------------------- | -------------- |
| React 18              | UI 框架        |
| Vite                  | 构建工具       |
| TypeScript            | 类型安全       |
| Tailwind CSS          | 样式           |
| shadcn/ui             | UI 组件库      |
| TanStack React Query  | 服务端状态管理 |
| Zustand               | 客户端状态管理 |
| React Router v7       | 路由           |

## 快速开始

### 一键初始化（推荐）

```bash
./scripts/bootstrap.sh
```

该命令会自动完成：

- 校验 Go / Node / PostgreSQL 客户端
- 准备 pnpm（通过 corepack）
- 初始化本地数据库与权限
- 安装 backend/frontend 依赖
- 构建 frontend 产物
- 自动将可运行默认值注入 `backend/.env`

### 环境要求

- Go 1.21+
- Node.js 20+
- PostgreSQL

### 1) 初始化数据库（首次）

```bash
cd backend
cp .env.example .env

# 按需修改 DB_USER / DB_PASSWORD / DB_NAME 后执行
source .env
./scripts/init_local_db.sh
```

### 2) 启动后端 API

```bash
cd backend
source .env
go run .
```

后端默认运行在 `http://localhost:8080`。

### 3) 启动前端（开发模式）

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`，并代理 `/api` 到后端。

### 4) 构建前端（生产模式）

```bash
cd frontend
npm run build
```

构建产物输出到 `frontend/dist/`。

### 5) 生产链路（后端托管前端）

```bash
cd frontend && npm run build
cd ../backend && source .env && go run .
```

- 后端会直接返回 `frontend/dist/index.html`
- 前端路由（如 `/login`、`/game/replay/:id`）由 React Router 接管
- API 仍由 `/api/*` 提供

## API 概览

### 认证

| 方法 | 路径            | 说明         |
| ---- | --------------- | ------------ |
| POST | `/api/register` | 注册         |
| POST | `/api/login`    | 登录         |
| POST | `/api/logout`   | 退出         |
| GET  | `/api/user`     | 获取当前用户 |

### 游戏

| 方法 | 路径                    | 说明         |
| ---- | ----------------------- | ------------ |
| POST | `/api/game/create`      | 创建房间     |
| POST | `/api/game/singleplayer`| 创建单人游戏 |
| GET  | `/api/game/:id`         | 获取游戏信息 |
| GET  | `/api/game/:id/table`   | 获取牌桌状态 |
| POST | `/api/game/:id/join`    | 加入房间     |
| POST | `/api/game/:id/start`   | 开始游戏     |
| POST | `/api/game/:id/play`    | 出牌         |
| POST | `/api/game/:id/ai-play` | AI 出牌      |
| GET  | `/api/game/:id/replay`  | 获取回放信息 |
| GET  | `/api/game/:id/actions` | 获取动作历史 |

## 开发规范

详见 `AGENTS.md`。

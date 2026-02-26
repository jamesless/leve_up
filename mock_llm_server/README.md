# Mock LLM Server

一个轻量级的 LLM 流式响应模拟服务，兼容 OpenAI API，专为开发和测试场景设计。

## 简介

Mock LLM Server 通过 HTTP 服务模拟大语言模型的流式输出行为。它完全兼容 OpenAI Chat Completions API，支持通过请求头精确控制输出 Token 数量、流速和 Token 长度，无需消耗真实的 LLM 额度即可完成客户端测试、性能压测和集成联调。

## 特性

- **OpenAI 兼容**：响应格式与 OpenAI Chat Completions 流式接口完全一致，可直接替换
- **参数灵活可控**：通过 HTTP 请求头逐请求控制 Token 数量、输出速率和 Token 长度
- **真实流式模拟**：基于 SSE（Server-Sent Events）格式，异步逐 Token 推送
- **自动文档**：内置 Swagger UI 和 ReDoc 交互式 API 文档

## 目录结构

```
mock_llm_server/
├── server.py          # 主程序（FastAPI 应用）
└── requirements.txt   # Python 依赖
```

## 安装

```bash
pip install -r requirements.txt
```

**依赖说明：**

| 包 | 版本要求 | 用途 |
|----|---------|------|
| fastapi | >=0.111.0 | Web 框架 |
| uvicorn[standard] | >=0.30.0 | ASGI 服务器 |

## 快速开始

```bash
# 以默认配置启动（监听 0.0.0.0:8000）
python server.py

# 自定义地址、端口和工作进程数
python server.py --host 127.0.0.1 --port 8080 --workers 2
```

启动后访问：

- API 服务：`http://127.0.0.1:8000`
- Swagger UI：`http://127.0.0.1:8000/docs`
- ReDoc：`http://127.0.0.1:8000/redoc`

## 命令行参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--host` | `0.0.0.0` | 监听地址 |
| `--port` | `8000` | 监听端口 |
| `--workers` | `1` | 工作进程数 |

## API 接口

### POST `/v1/chat/completions`

模拟 LLM 流式输出，返回 SSE 格式的数据流。

**控制请求头：**

| 请求头 | 默认值 | 取值范围 | 说明 |
|--------|--------|---------|------|
| `X-Token-Count` | `100` | 1 – 10,000 | 输出 Token 总数 |
| `X-Tokens-Per-Second` | `10.0` | 0.1 – 1,000 | 输出速率（Token/秒） |
| `X-Token-Length` | `4` | 1 – 32 | 每个 Token 的字符数 |
| `X-Model-Id` | `mock-llm-model` | 任意字符串 | 响应中返回的模型名称 |

**响应头（回显实际生效值）：**

| 响应头 | 说明 |
|--------|------|
| `X-Actual-Token-Count` | 实际使用的 Token 数量 |
| `X-Actual-Tokens-Per-Second` | 实际使用的输出速率 |
| `X-Actual-Token-Length` | 实际使用的 Token 长度 |

**响应格式（SSE / OpenAI 格式）：**

```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"mock-llm-model","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"mock-llm-model","choices":[{"index":0,"delta":{"content":"token"},"finish_reason":null}]}

data: [DONE]
```

**cURL 示例：**

```bash
# 输出 50 个 Token，速率 5 Token/秒，每 Token 6 字符
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "X-Token-Count: 50" \
  -H "X-Tokens-Per-Second: 5" \
  -H "X-Token-Length: 6" \
  -N
```

---

### GET `/v1/models`

返回可用模型列表。

**响应示例：**

```json
{
  "object": "list",
  "data": [
    {
      "id": "mock-llm-model",
      "object": "model",
      "created": 1234567890,
      "owned_by": "mock-server",
      "description": "Mock LLM model for testing"
    }
  ]
}
```

---

### GET `/health`

健康检查接口。

**响应示例：**

```json
{
  "status": "ok",
  "service": "mock-llm-server",
  "version": "1.0.0"
}
```

## 架构说明

```
HTTP 请求
    ↓
FastAPI 路由
    ↓
请求头解析（X-Token-Count / X-Tokens-Per-Second / X-Token-Length）
    ↓
异步 Token 流生成器
    ├─ 推送首包（role: assistant）
    ├─ 循环 N 次（N = Token 数量）：
    │   ├─ 生成随机 Token
    │   ├─ 封装为 SSE chunk
    │   ├─ yield chunk
    │   └─ 异步 sleep（1 / tokens_per_second 秒）
    └─ 推送结束包 + [DONE]
    ↓
StreamingResponse（text/event-stream）
    ↓
HTTP 客户端
```

## 使用场景

- **客户端开发**：在不依赖真实 LLM 服务的情况下开发和调试流式处理逻辑
- **性能压测**：精确控制 Token 速率，测试客户端在不同延迟下的表现
- **集成测试**：在 CI/CD 流水线中替代真实 LLM，测试流式数据管道
- **容量评估**：配合 [tpm_tester](../tpm_tester) 测量服务实际吞吐能力

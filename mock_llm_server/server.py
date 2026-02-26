"""
Mock LLM Server - 模拟大模型流式输出服务

通过 HTTP Header 控制行为：
  X-Token-Count      : 输出的 token 总数量（默认: 100，范围: 1-10000）
  X-Tokens-Per-Second: 每秒输出 token 的速度（默认: 10.0，范围: 0.1-1000）
  X-Token-Length     : 每个 token 的字符长度（默认: 4，范围: 1-32）

接口:
  POST /v1/chat/completions  - OpenAI 兼容的流式对话接口
  GET  /v1/models            - 列出可用模型
  GET  /health               - 健康检查
"""

import asyncio
import json
import random
import string
import time
import uuid
from typing import AsyncGenerator

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse

app = FastAPI(
    title="Mock LLM Server",
    description="模拟大模型流式输出服务，支持通过 Header 控制输出速度和数量",
    version="1.0.0",
)

# 用于生成随机 token 的字符集（字母 + 数字）
_CHARSET = string.ascii_letters + string.digits


def generate_token(length: int) -> str:
    """生成指定长度的随机字符 token。"""
    return "".join(random.choices(_CHARSET, k=length))


def parse_header_float(request: Request, key: str, default: float,
                       min_val: float, max_val: float) -> float:
    """从 Header 中解析 float 值，带范围限制。"""
    raw = request.headers.get(key, "")
    try:
        value = float(raw)
    except (ValueError, TypeError):
        value = default
    return max(min_val, min(max_val, value))


def parse_header_int(request: Request, key: str, default: int,
                     min_val: int, max_val: int) -> int:
    """从 Header 中解析 int 值，带范围限制。"""
    raw = request.headers.get(key, "")
    try:
        value = int(raw)
    except (ValueError, TypeError):
        value = default
    return max(min_val, min(max_val, value))


async def token_stream(
    token_count: int,
    tokens_per_second: float,
    token_length: int,
    model_id: str,
) -> AsyncGenerator[str, None]:
    """
    生成 OpenAI SSE 格式的流式 token 输出。

    每个 token 是等长的随机字符串，按指定速度逐个输出。
    """
    request_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    created = int(time.time())
    delay = 1.0 / tokens_per_second  # 每个 token 的间隔秒数

    def make_chunk(delta: dict, finish_reason=None) -> str:
        chunk = {
            "id": request_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model_id,
            "choices": [{"index": 0, "delta": delta, "finish_reason": finish_reason}],
        }
        return f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"

    # 第一个 chunk：发送 role
    yield make_chunk({"role": "assistant", "content": ""})

    # 流式输出 token
    for i in range(token_count):
        token = generate_token(token_length)
        # token 之间用空格分隔，首个 token 不加空格
        content = token if i == 0 else f" {token}"
        yield make_chunk({"content": content})

        # 使用精确的异步睡眠控制速度
        await asyncio.sleep(delay)

    # 结束 chunk
    yield make_chunk({}, finish_reason="stop")
    yield "data: [DONE]\n\n"


@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    """
    OpenAI 兼容的流式对话接口。

    通过 Header 控制输出参数：
    - X-Token-Count:       输出 token 总数（默认 100）
    - X-Tokens-Per-Second: 每秒输出速度（默认 10.0）
    - X-Token-Length:      每个 token 的字符数（默认 4）
    """
    token_count = parse_header_int(request, "X-Token-Count", 100, 1, 10000)
    tokens_per_second = parse_header_float(request, "X-Tokens-Per-Second", 10.0, 0.1, 1000.0)
    token_length = parse_header_int(request, "X-Token-Length", 4, 1, 32)
    model_id = request.headers.get("X-Model-Id", "mock-llm-model")

    # 记录请求参数到响应头，方便调试
    extra_headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "X-Actual-Token-Count": str(token_count),
        "X-Actual-Tokens-Per-Second": str(tokens_per_second),
        "X-Actual-Token-Length": str(token_length),
    }

    return StreamingResponse(
        token_stream(token_count, tokens_per_second, token_length, model_id),
        media_type="text/event-stream",
        headers=extra_headers,
    )


@app.get("/v1/models")
async def list_models():
    """列出可用模型。"""
    return JSONResponse({
        "object": "list",
        "data": [
            {
                "id": "mock-llm-model",
                "object": "model",
                "created": int(time.time()),
                "owned_by": "mock-server",
                "description": "Mock LLM model for testing",
            }
        ],
    })


@app.get("/health")
async def health():
    """健康检查接口。"""
    return {"status": "ok", "service": "mock-llm-server", "version": "1.0.0"}


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Mock LLM Server")
    parser.add_argument("--host", default="0.0.0.0", help="监听地址（默认: 0.0.0.0）")
    parser.add_argument("--port", type=int, default=8000, help="监听端口（默认: 8000）")
    parser.add_argument("--workers", type=int, default=1, help="工作进程数（默认: 1）")
    args = parser.parse_args()

    print(f"启动 Mock LLM Server: http://{args.host}:{args.port}")
    print(f"接口文档: http://127.0.0.1:{args.port}/docs")
    print()
    print("支持的 Header 参数：")
    print("  X-Token-Count:        输出 token 总数（默认: 100，范围: 1-10000）")
    print("  X-Tokens-Per-Second:  每秒输出速度（默认: 10.0，范围: 0.1-1000）")
    print("  X-Token-Length:       每个 token 字符数（默认: 4，范围: 1-32）")
    print()

    uvicorn.run(
        "server:app",
        host=args.host,
        port=args.port,
        workers=args.workers,
        log_level="info",
    )

#!/bin/bash

# 快速测试脚本 - 单次运行
# 运行3场游戏并验证，不循环

set -e

PROJECT_DIR="/Users/ken/my_project/leve_up"
LOG_DIR="$PROJECT_DIR/log"
TEST_DIR="$PROJECT_DIR/test"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================="
echo "   快速测试模式"
echo "========================================="

# 检查服务器
if ! curl -s http://localhost:8080 > /dev/null; then
    echo -e "${RED}❌ 错误: 游戏服务器未运行${NC}"
    echo "请先启动服务器: cd $PROJECT_DIR && go run main.go"
    exit 1
fi
echo -e "${GREEN}✅ 服务器运行正常${NC}"

# 创建日志目录
mkdir -p "$LOG_DIR"
VERSION=$(date +"v1.%Y%m%d_%H%M%S")
VERSION_DIR="$LOG_DIR/$VERSION"
mkdir -p "$VERSION_DIR"

echo ""
echo "版本: $VERSION"
echo "日志目录: $VERSION_DIR"
echo ""

# 运行测试
cd "$TEST_DIR"
echo "开始运行3场游戏..."

if go run automated_validator.go; then
    echo ""
    echo -e "${GREEN}✅ 游戏运行完成${NC}"

    # 验证日志
    echo ""
    echo "开始验证规则..."
    if go run rule_validator.go "$VERSION_DIR"; then
        echo ""
        echo -e "${GREEN}🎉 所有测试通过！${NC}"
        echo ""
        echo "日志位置: $VERSION_DIR"
        echo ""
        echo "查看详细日志:"
        echo "  cat $VERSION_DIR/combined_log.jsonl | jq ."
        echo ""
        echo "如果需要提交代码，运行:"
        echo "  cd $PROJECT_DIR"
        echo "  git add main.go models/ handlers/ templates/ static/ test/*.go"
        echo "  git commit -m '测试通过 - $VERSION'"
        exit 0
    else
        echo -e "${RED}❌ 规则验证失败${NC}"
        echo "请查看上面的错误信息并修复问题"
        exit 1
    fi
else
    echo -e "${RED}❌ 游戏运行失败${NC}"
    exit 1
fi

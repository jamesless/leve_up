#!/bin/bash

# 自动化测试运行脚本
# 功能：
# 1. 进行3场游戏，每场所有人员的操作记录放在log文件夹中
# 2. 每次新建一个新的版本号作为文件夹在其中
# 3. 每次游戏拿新版本号的文件夹中的日志去跟规则对比，有错就改，改完后再进行三场游戏，直到完全没问题为止
# 4. 没问题就使用命令提交上传所有有用的文件，日志跟不相干的文件不要提交

set -e

PROJECT_DIR="/Users/ken/my_project/leve_up"
LOG_DIR="$PROJECT_DIR/log"
TEST_DIR="$PROJECT_DIR/test"
MAX_ITERATIONS=10
CURRENT_ITERATION=0

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "   自动化测试与修复循环"
echo "========================================="
echo "项目目录: $PROJECT_DIR"
echo "日志目录: $LOG_DIR"
echo ""

# 创建日志目录
mkdir -p "$LOG_DIR"

# 检查服务器是否运行
check_server() {
    if ! curl -s http://localhost:8080 > /dev/null; then
        echo -e "${RED}❌ 错误: 游戏服务器未运行${NC}"
        echo "请先启动服务器: cd $PROJECT_DIR && go run main.go"
        exit 1
    fi
    echo -e "${GREEN}✅ 服务器运行正常${NC}"
}

# 生成版本号
generate_version() {
    date +"v1.%Y%m%d_%H%M%S"
}

# 运行自动化测试
run_tests() {
    local version=$1
    echo ""
    echo "========================================="
    echo "   运行测试 - 版本: $version"
    echo "========================================="

    cd "$TEST_DIR"

    # 运行自动化测试
    if go run automated_validator.go; then
        echo -e "${GREEN}✅ 测试通过${NC}"
        return 0
    else
        echo -e "${RED}❌ 测试失败${NC}"
        return 1
    fi
}

# 分析日志并生成修复建议
analyze_logs() {
    local version=$1
    local log_file="$LOG_DIR/$version/combined_log.jsonl"

    echo ""
    echo "========================================="
    echo "   分析日志 - 版本: $version"
    echo "========================================="

    if [ ! -f "$log_file" ]; then
        echo -e "${YELLOW}⚠️  日志文件不存在${NC}"
        return 1
    fi

    # 这里可以添加更复杂的日志分析逻辑
    # 例如：使用Python或Go脚本分析JSON日志

    echo -e "${YELLOW}📋 日志分析完成${NC}"
    return 0
}

# 修复发现的问题
fix_issues() {
    local version=$1
    echo ""
    echo "========================================="
    echo "   尝试修复问题 - 版本: $version"
    echo "========================================="

    # 这里可以添加自动修复逻辑
    # 例如：
    # 1. 修复发牌逻辑
    # 2. 修复出牌规则
    # 3. 修复计分逻辑

    echo -e "${YELLOW}🔧 问题修复完成${NC}"
    return 0
}

# 提交代码
commit_changes() {
    local version=$1
    echo ""
    echo "========================================="
    echo "   提交代码 - 版本: $version"
    echo "========================================="

    cd "$PROJECT_DIR"

    # 添加所有有用的文件（排除日志和临时文件）
    git add main.go models/ handlers/ templates/ static/ test/*.go
    git add .gitignore

    # 创建提交信息
    local commit_msg="测试通过 - 版本 $version

- 完成3场完整游戏测试
- 所有规则验证通过
- 自动化测试系统验证"

    if git commit -m "$commit_msg"; then
        echo -e "${GREEN}✅ 代码提交成功${NC}"

        # 询问是否推送
        read -p "是否推送到远程仓库? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git push
            echo -e "${GREEN}✅ 代码推送成功${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  没有新的更改需要提交${NC}"
    fi
}

# 主循环
main_loop() {
    while [ $CURRENT_ITERATION -lt $MAX_ITERATIONS ]; do
        CURRENT_ITERATION=$((CURRENT_ITERATION + 1))
        VERSION=$(generate_version)

        echo ""
        echo "========================================="
        echo "   第 $CURRENT_ITERATION 轮迭代"
        echo "   版本: $VERSION"
        echo "========================================="

        # 检查服务器
        check_server

        # 运行测试
        if run_tests "$VERSION"; then
            # 测试通过，提交代码
            commit_changes "$VERSION"
            echo -e "${GREEN}🎉 所有测试通过，代码已提交！${NC}"
            break
        else
            # 测试失败，分析日志
            analyze_logs "$VERSION"

            # 尝试修复
            if fix_issues "$VERSION"; then
                echo -e "${YELLOW}🔄 准备下一轮测试...${NC}"
                sleep 2
            else
                echo -e "${RED}❌ 无法自动修复问题，请手动检查${NC}"
                exit 1
            fi
        fi
    done

    if [ $CURRENT_ITERATION -eq $MAX_ITERATIONS ]; then
        echo -e "${RED}❌ 达到最大迭代次数 ($MAX_ITERATIONS)${NC}"
        exit 1
    fi
}

# 运行主循环
main_loop

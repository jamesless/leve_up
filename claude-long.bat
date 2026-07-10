@echo off
REM Claude Long-Running Agent - Windows 统一入口脚本
REM 根据配置文件选择使用 Go 或 Python 实现

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set CONFIG_FILE=%SCRIPT_DIR%config.yaml

REM 读取配置
set LANGUAGE=go
if exist "%CONFIG_FILE%" (
    for /f "tokens=2" %%a in ('findstr /b "language:" "%CONFIG_FILE%"') do set LANGUAGE=%%a
)

REM 根据语言选择执行
if "%LANGUAGE%"=="go" (
    REM 使用 Go 实现
    set GO_BINARY=%SCRIPT_DIR%claude-long.exe

    REM 如果二进制不存在，先编译
    if not exist "!GO_BINARY!" (
        echo Compiling Go binary...
        cd "%SCRIPT_DIR%core\go"
        go build -o "!GO_BINARY!" .
        cd "%SCRIPT_DIR%"
    )

    REM 执行 Go 程序
    "!GO_BINARY!" %*

) else if "%LANGUAGE%"=="python" (
    REM 使用 Python 实现
    set PYTHON_BIN=python
    where python3 >nul 2>&1
    if !errorlevel! equ 0 set PYTHON_BIN=python3

    REM 解析命令
    if "%~2"=="" (
        echo Usage: claude-long ^<command^> ^<subcommand^> [args]
        exit /b 1
    )

    set COMMAND=%1
    set SUBCOMMAND=%2
    shift
    shift

    REM 收集剩余参数
    set ARGS=
    :loop
    if not "%~1"=="" (
        set ARGS=!ARGS! %1
        shift
        goto loop
    )

    REM 路由到对应的 Python 模块
    if "%COMMAND%"=="progress" (
        !PYTHON_BIN! "%SCRIPT_DIR%core\python\progress_manager.py" %SUBCOMMAND% !ARGS!
    ) else if "%COMMAND%"=="feature" (
        !PYTHON_BIN! "%SCRIPT_DIR%core\python\feature_manager.py" %SUBCOMMAND% !ARGS!
    ) else if "%COMMAND%"=="session" (
        !PYTHON_BIN! "%SCRIPT_DIR%core\python\session_manager.py" %SUBCOMMAND% !ARGS!
    ) else (
        echo Unknown command: %COMMAND%
        exit /b 1
    )

) else (
    echo Error: Unknown language '%LANGUAGE%' in config.yaml
    echo Please set language to 'go' or 'python'
    exit /b 1
)

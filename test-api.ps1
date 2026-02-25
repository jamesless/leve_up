# API 测试脚本

## 启动 MySQL 服务
请先启动 MySQL 服务，然后运行：
```powershell
.\leve_up.exe
```

## API 测试 (使用 curl 或 Postman)

### 1. 注册用户
```bash
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=123456"
```

### 2. 登录
```bash
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=123456"
```

### 3. 获取当前用户 (需要 token)
```bash
curl -X GET http://localhost:8080/api/user \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. 创建游戏房间 (需要 token)
```bash
curl -X POST http://localhost:8080/api/game/create \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "name=测试房间"
```

### 5. 加入游戏 (需要 token)
```bash
curl -X POST http://localhost:8080/api/game/GAME_ID/join \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 6. 获取游戏信息
```bash
curl -X GET http://localhost:8080/api/game/GAME_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 使用 PowerShell 测试

### 注册
```powershell
$body = @{username="testuser"; password="123456"}
Invoke-RestMethod -Uri "http://localhost:8080/api/register" -Method Post -Body $body
```

### 登录
```powershell
$body = @{username="testuser"; password="123456"}
$response = Invoke-RestMethod -Uri "http://localhost:8080/api/login" -Method Post -Body $body
$token = $response.token
```

### 创建房间
```powershell
$headers = @{Authorization = "Bearer $token"}
$body = @{name="测试房间"}
Invoke-RestMethod -Uri "http://localhost:8080/api/game/create" -Method Post -Headers $headers -Body $body
```

### 获取用户信息
```powershell
$headers = @{Authorization = "Bearer $token"}
Invoke-RestMethod -Uri "http://localhost:8080/api/user" -Method Get -Headers $headers
```

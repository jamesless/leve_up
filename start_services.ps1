# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\workshop\leve_up\backend; go run ."

# Wait a bit
Start-Sleep -Seconds 3

# Start frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\workshop\leve_up\frontend; npm run dev"

Write-Host "Services starting... Please wait 15 seconds"
Start-Sleep -Seconds 15

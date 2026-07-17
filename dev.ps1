# Script to run all services in development mode
# Usage: ./dev.ps1

Write-Host "Starting all services..." -ForegroundColor Cyan

# 1. Identity Service (Port 8080)
Write-Host "Launching Identity Service..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "title identity_service; ./mvnw -pl identity_service quarkus:dev"

# 2. Movie Service (Port 8081)
Write-Host "Launching Movie Service..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "title movie_service; ./mvnw -pl movie_service quarkus:dev"

# 3. Ticket Service (Port 8082)
Write-Host "Launching Ticket Service..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "title ticket_service; ./mvnw -pl ticket_service quarkus:dev"

# 4. API Gateway (Port 8888)
Write-Host "Launching API Gateway..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "title api_gateway; ./mvnw -pl api_gateway quarkus:dev"

# 5. Frontend
Write-Host "Launching Frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "title frontend; cd film_management_frontend; npm run dev"

Write-Host "All services are launching in separate windows." -ForegroundColor Green
Write-Host "Backend API: http://localhost:8888"
Write-Host "Frontend: http://localhost:5173"

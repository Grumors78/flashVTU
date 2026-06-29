# QuickTopUp API Test Runner
# Run this from the QuickTopUpBackend folder

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "QuickTopUp API Test Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Set required environment variables
if (-not $env:JWT_SECRET) {
    Write-Host "Setting JWT_SECRET..." -ForegroundColor Yellow
    $env:JWT_SECRET = "test-secret-key-change-in-production"
}

if (-not $env:BACKEND_URL) {
    $env:BACKEND_URL = "http://localhost:4000"
}

Write-Host "Backend URL: $env:BACKEND_URL" -ForegroundColor Green
Write-Host "JWT_SECRET: Set" -ForegroundColor Green
Write-Host ""

# Run the test script
Write-Host "Starting API tests..." -ForegroundColor Green
Write-Host ""

node tests/api-test.js

Write-Host ""
Write-Host "Test run complete!" -ForegroundColor Cyan

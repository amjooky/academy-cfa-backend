# Full clean reset: drop and re-import schema.sql into XAMPP MySQL
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SchemaFile = Join-Path $ProjectRoot "schema.sql"
$MysqlExe = "C:\xampp\mysql\bin\mysql.exe"

if (-not (Test-Path $MysqlExe)) {
    Write-Host "XAMPP MySQL not found at $MysqlExe" -ForegroundColor Red
    exit 1
}

Write-Host "Resetting CFA databases (shared + tenant_demo)..." -ForegroundColor Cyan
Write-Host "Ensure MySQL is running in XAMPP Control Panel." -ForegroundColor Gray

$sql = Get-Content $SchemaFile -Raw -Encoding UTF8
$sql | & $MysqlExe -u root

Write-Host ""
Write-Host "Done. Clean database with dynamic seed data:" -ForegroundColor Green
& $MysqlExe -u root -e "USE tenant_demo; SELECT 'users' as tbl, COUNT(*) as n FROM users UNION SELECT 'players', COUNT(*) FROM players UNION SELECT 'events', COUNT(*) FROM events UNION SELECT 'invoices', COUNT(*) FROM invoices UNION SELECT 'player_subscriptions', COUNT(*) FROM player_subscriptions;"

Write-Host ""
Write-Host "Admin login (Personnel tab):" -ForegroundColor Yellow
Write-Host "  Email:    admin@cfa.tn"
Write-Host "  Password: admin"

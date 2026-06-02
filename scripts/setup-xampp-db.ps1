# Import schema.sql into XAMPP MySQL (phpMyAdmin-compatible databases)
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SchemaFile = Join-Path $ProjectRoot "schema.sql"
$MysqlExe = "C:\xampp\mysql\bin\mysql.exe"

if (-not (Test-Path $MysqlExe)) {
    Write-Host "XAMPP MySQL not found at $MysqlExe" -ForegroundColor Red
    Write-Host "Install XAMPP or set MYSQL_BIN to your mysql.exe path." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $SchemaFile)) {
    Write-Host "schema.sql not found at $SchemaFile" -ForegroundColor Red
    exit 1
}

Write-Host "Importing schema into XAMPP MySQL..." -ForegroundColor Cyan
Write-Host "  (Start MySQL in XAMPP Control Panel if this fails)" -ForegroundColor Gray

$sql = Get-Content $SchemaFile -Raw -Encoding UTF8
$sql | & $MysqlExe -u root 2>&1 | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "Done. Databases created:" -ForegroundColor Green
& $MysqlExe -u root -e "SHOW DATABASES LIKE 'shared'; SHOW DATABASES LIKE 'tenant_demo';"
Write-Host ""
Write-Host "phpMyAdmin: http://localhost/phpmyadmin" -ForegroundColor Cyan
Write-Host "  - shared      (subscriptions)" -ForegroundColor Gray
Write-Host "  - tenant_demo (users, players, teams, ...)" -ForegroundColor Gray
Write-Host ""
Write-Host "Demo login: admin@demo.com / password  (tenant: demo)" -ForegroundColor Yellow

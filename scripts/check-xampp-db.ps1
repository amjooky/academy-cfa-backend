# Verify XAMPP MySQL is running and project databases exist
$ErrorActionPreference = "Stop"
$MysqlExe = "C:\xampp\mysql\bin\mysql.exe"

if (-not (Test-Path $MysqlExe)) {
    Write-Host "FAIL: XAMPP MySQL not found at $MysqlExe" -ForegroundColor Red
    exit 1
}

try {
    $lines = & $MysqlExe -u root -N -e "SHOW DATABASES LIKE 'tenant_demo'; SHOW DATABASES LIKE 'shared';" 2>&1
    $dbs = ($lines | Out-String).Trim()
} catch {
    Write-Host "FAIL: Cannot connect to MySQL. Start MySQL in XAMPP Control Panel." -ForegroundColor Red
    exit 1
}

if ($dbs -notlike "*tenant_demo*" -or $dbs -notlike "*shared*") {
    Write-Host "FAIL: Databases missing. Run: npm run db:setup" -ForegroundColor Red
    exit 1
}

$users = & $MysqlExe -u root -N -e "SELECT COUNT(*) FROM tenant_demo.users;" 2>&1
Write-Host "OK: XAMPP MySQL connected. tenant_demo.users count = $users" -ForegroundColor Green
exit 0

# Prestige Interior Design - runs ALL automated test cases (6 project specifications + 12 user stories,
# SHA-256 password hashing and a smoke test of every page) and prints "Feature N: Good" per feature.
# Needs Node.js 22+. Usage:  powershell -ExecutionPolicy Bypass -File .\run-tests.ps1
Set-Location -Path $PSScriptRoot
if (-not (Test-Path "node_modules")) { npm ci }
npm test
exit $LASTEXITCODE

& "C:\Program Files\nodejs\npm.cmd" install -g pnpm
& "C:\Program Files\nodejs\npx.cmd" pnpm run db:setup
Write-Host "Database setup complete! You can close this window."
Start-Sleep -Seconds 5

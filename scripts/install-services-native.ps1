<#
.SYNOPSIS
    Native Service Installation Script for Windows
    Installs Redis, ClamAV, and PostgreSQL without Docker

.DESCRIPTION
    This script installs and configures Redis, ClamAV, and PostgreSQL
    natively on Windows systems. It supports Windows 10 and Windows Server.

.NOTES
    Requires Administrator privileges
    Requires Chocolatey package manager
#>

#Requires -RunAsAdministrator

# Colors for output
$script:ErrorColor = "Red"
$script:SuccessColor = "Green"
$script:WarningColor = "Yellow"
$script:InfoColor = "Cyan"

###############################################################################
# Helper Functions
###############################################################################

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "===================================================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "===================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor $script:SuccessColor
}

function Write-ErrorMessage {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor $script:ErrorColor
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor $script:WarningColor
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor $script:InfoColor
}

###############################################################################
# Chocolatey Installation
###############################################################################

function Test-Chocolatey {
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        return $true
    }
    return $false
}

function Install-Chocolatey {
    Write-Header "Installing Chocolatey Package Manager"

    if (Test-Chocolatey) {
        Write-Success "Chocolatey is already installed"
        return
    }

    Write-Info "Installing Chocolatey..."

    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072

    try {
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
        Write-Success "Chocolatey installed successfully"
    }
    catch {
        Write-ErrorMessage "Failed to install Chocolatey: $_"
        exit 1
    }

    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

###############################################################################
# Redis Installation
###############################################################################

function Install-Redis {
    Write-Header "Installing Redis for Windows"

    # Check if Redis is already installed
    if (Test-Path "C:\Program Files\Redis\redis-server.exe") {
        Write-Success "Redis is already installed"
        return
    }

    Write-Info "Installing Redis via Chocolatey..."

    try {
        choco install redis-64 -y
        Write-Success "Redis installed successfully"
    }
    catch {
        Write-ErrorMessage "Failed to install Redis: $_"
        return
    }

    # Start Redis service
    Write-Info "Starting Redis service..."

    try {
        Start-Service Redis
        Set-Service Redis -StartupType Automatic
        Write-Success "Redis service started and set to automatic"
    }
    catch {
        Write-Warning "Failed to start Redis service automatically"
        Write-Info "You may need to start it manually with: Start-Service Redis"
    }
}

function Verify-Redis {
    Write-Header "Verifying Redis Installation"

    if (-not (Test-Path "C:\Program Files\Redis\redis-cli.exe")) {
        Write-ErrorMessage "Redis CLI not found"
        return $false
    }

    try {
        $redisTest = & "C:\Program Files\Redis\redis-cli.exe" ping
        if ($redisTest -eq "PONG") {
            Write-Success "Redis is running and responding"
            & "C:\Program Files\Redis\redis-cli.exe" info server | Select-String "redis_version"
            return $true
        }
    }
    catch {
        Write-ErrorMessage "Redis is not responding"
        return $false
    }

    return $false
}

###############################################################################
# ClamAV Installation
###############################################################################

function Install-ClamAV {
    Write-Header "Installing ClamAV for Windows"

    Write-Info "Downloading ClamAV for Windows..."

    $clamavUrl = "https://www.clamav.net/downloads/production/ClamAV-1.2.1.exe"
    $installerPath = "$env:TEMP\ClamAV-installer.exe"

    try {
        # Download installer
        Write-Info "Downloading from $clamavUrl..."
        Invoke-WebRequest -Uri $clamavUrl -OutFile $installerPath -UseBasicParsing

        Write-Info "Running ClamAV installer..."
        Write-Warning "Please complete the installation wizard"

        Start-Process -FilePath $installerPath -Wait

        Write-Success "ClamAV installation completed"
    }
    catch {
        Write-ErrorMessage "Failed to install ClamAV: $_"
        Write-Info "Please download and install ClamAV manually from:"
        Write-Info "https://www.clamav.net/downloads"
        return
    }

    # Update virus definitions
    Write-Info "Updating virus definitions (this may take a while)..."

    $freshclamPath = "C:\Program Files\ClamAV\freshclam.exe"
    if (Test-Path $freshclamPath) {
        try {
            & $freshclamPath
            Write-Success "Virus definitions updated"
        }
        catch {
            Write-Warning "Failed to update virus definitions automatically"
            Write-Info "Run freshclam.exe manually to update"
        }
    }
}

function Verify-ClamAV {
    Write-Header "Verifying ClamAV Installation"

    $clamavPath = "C:\Program Files\ClamAV\clamd.exe"

    if (Test-Path $clamavPath) {
        Write-Success "ClamAV is installed"
        & "C:\Program Files\ClamAV\clamdscan.exe" --version
        return $true
    }
    else {
        Write-ErrorMessage "ClamAV is not installed properly"
        return $false
    }
}

###############################################################################
# PostgreSQL Installation
###############################################################################

function Install-PostgreSQL {
    Write-Header "Installing PostgreSQL for Windows"

    # Check if PostgreSQL is already installed
    if (Test-Path "C:\Program Files\PostgreSQL\*\bin\psql.exe") {
        Write-Success "PostgreSQL is already installed"
        return
    }

    Write-Info "Installing PostgreSQL via Chocolatey..."

    try {
        choco install postgresql15 -y
        Write-Success "PostgreSQL installed successfully"
    }
    catch {
        Write-ErrorMessage "Failed to install PostgreSQL: $_"
        Write-Info "Please install PostgreSQL manually from:"
        Write-Info "https://www.postgresql.org/download/windows/"
        return
    }

    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    Write-Success "PostgreSQL installed"
}

function Setup-Database {
    Write-Header "Setting up PostgreSQL Database"

    # Find PostgreSQL bin directory
    $pgBinPath = Get-ChildItem "C:\Program Files\PostgreSQL\" -Directory |
                 Sort-Object Name -Descending |
                 Select-Object -First 1 |
                 ForEach-Object { Join-Path $_.FullName "bin" }

    if (-not (Test-Path $pgBinPath)) {
        Write-ErrorMessage "PostgreSQL bin directory not found"
        return
    }

    # Add to PATH for this session
    $env:Path = "$pgBinPath;$env:Path"

    # Generate random password
    $dbPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 25 | ForEach-Object {[char]$_})

    Write-Info "Creating database user and database..."

    try {
        # Create user and database using psql
        $createUserSQL = "CREATE USER event_manager WITH PASSWORD '$dbPassword';"
        $createDbSQL = "CREATE DATABASE event_manager OWNER event_manager;"
        $grantSQL = "GRANT ALL PRIVILEGES ON DATABASE event_manager TO event_manager;"

        & "$pgBinPath\psql.exe" -U postgres -c $createUserSQL
        & "$pgBinPath\psql.exe" -U postgres -c $createDbSQL
        & "$pgBinPath\psql.exe" -U postgres -c $grantSQL

        Write-Success "Database created successfully"
        Write-Info "Database: event_manager"
        Write-Info "User: event_manager"
        Write-Info "Password: $dbPassword"
        Write-Warning "Please save this password securely!"

        # Update .env file
        Update-EnvFile -DbPassword $dbPassword
    }
    catch {
        Write-ErrorMessage "Failed to create database: $_"
        Write-Info "You may need to configure PostgreSQL manually"
    }
}

function Verify-PostgreSQL {
    Write-Header "Verifying PostgreSQL Installation"

    $pgPath = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

    if ($pgPath) {
        Write-Success "PostgreSQL is installed"
        & $pgPath.FullName --version

        # Check if service is running
        $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
        if ($pgService -and $pgService.Status -eq "Running") {
            Write-Success "PostgreSQL service is running"
            return $true
        }
        else {
            Write-Warning "PostgreSQL service is not running"
            return $false
        }
    }
    else {
        Write-ErrorMessage "PostgreSQL is not installed properly"
        return $false
    }
}

###############################################################################
# Environment Configuration
###############################################################################

function Update-EnvFile {
    param([string]$DbPassword)

    Write-Header "Updating .env Configuration"

    $projectRoot = Split-Path -Parent $PSScriptRoot
    $envFile = Join-Path $projectRoot ".env"

    if (-not (Test-Path $envFile)) {
        Write-ErrorMessage "Environment file not found: $envFile"
        return
    }

    # Read current .env content
    $envContent = Get-Content $envFile

    # Update Redis configuration
    $envContent = Update-EnvVariable -Content $envContent -Variable "REDIS_ENABLED" -Value "true"
    $envContent = Update-EnvVariable -Content $envContent -Variable "REDIS_HOST" -Value "localhost"
    $envContent = Update-EnvVariable -Content $envContent -Variable "REDIS_PORT" -Value "6379"

    # Update ClamAV configuration
    $envContent = Update-EnvVariable -Content $envContent -Variable "CLAMAV_ENABLED" -Value "true"
    $envContent = Update-EnvVariable -Content $envContent -Variable "CLAMAV_HOST" -Value "localhost"
    $envContent = Update-EnvVariable -Content $envContent -Variable "CLAMAV_PORT" -Value "3310"

    # Update PostgreSQL configuration
    if ($DbPassword) {
        $dbUrl = "postgresql://event_manager:$DbPassword@localhost:5432/event_manager?schema=public&connection_limit=10&pool_timeout=10&connect_timeout=5"
        $envContent = Update-EnvVariable -Content $envContent -Variable "DATABASE_URL" -Value "`"$dbUrl`""
    }

    # Save updated content
    $envContent | Set-Content $envFile -Encoding UTF8

    Write-Success "Environment file updated"
}

function Update-EnvVariable {
    param(
        [string[]]$Content,
        [string]$Variable,
        [string]$Value
    )

    $pattern = "^$Variable="
    $newLine = "$Variable=$Value"
    $found = $false

    for ($i = 0; $i -lt $Content.Length; $i++) {
        if ($Content[$i] -match $pattern) {
            $Content[$i] = $newLine
            $found = $true
            break
        }
    }

    if (-not $found) {
        $Content += $newLine
    }

    return $Content
}

###############################################################################
# Main Installation Flow
###############################################################################

function Main {
    Write-Header "Event Manager - Native Service Installation (Windows)"

    # Check for admin privileges
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-ErrorMessage "This script requires Administrator privileges"
        Write-Info "Please run PowerShell as Administrator and try again"
        exit 1
    }

    # Install Chocolatey if needed
    if (-not (Test-Chocolatey)) {
        Install-Chocolatey
    }

    # Ask which services to install
    Write-Host ""
    Write-Info "Which services would you like to install?"
    Write-Host "1) All services (Redis, ClamAV, PostgreSQL)"
    Write-Host "2) Redis only"
    Write-Host "3) ClamAV only"
    Write-Host "4) PostgreSQL only"
    Write-Host "5) Custom selection"

    $option = Read-Host "Select option (1-5)"

    $installRedis = $false
    $installClamAV = $false
    $installPostgreSQL = $false

    switch ($option) {
        "1" {
            $installRedis = $true
            $installClamAV = $true
            $installPostgreSQL = $true
        }
        "2" {
            $installRedis = $true
        }
        "3" {
            $installClamAV = $true
        }
        "4" {
            $installPostgreSQL = $true
        }
        "5" {
            $response = Read-Host "Install Redis? (y/N)"
            if ($response -eq "y" -or $response -eq "Y") { $installRedis = $true }

            $response = Read-Host "Install ClamAV? (y/N)"
            if ($response -eq "y" -or $response -eq "Y") { $installClamAV = $true }

            $response = Read-Host "Install PostgreSQL? (y/N)"
            if ($response -eq "y" -or $response -eq "Y") { $installPostgreSQL = $true }
        }
        default {
            Write-ErrorMessage "Invalid option"
            exit 1
        }
    }

    # Install selected services
    if ($installRedis) {
        Install-Redis
    }

    if ($installClamAV) {
        Install-ClamAV
    }

    if ($installPostgreSQL) {
        Install-PostgreSQL
        Setup-Database
    }

    # Verify installations
    Write-Host ""
    Write-Header "Verifying Installations"

    if ($installRedis) {
        Verify-Redis
    }

    if ($installClamAV) {
        Verify-ClamAV
    }

    if ($installPostgreSQL) {
        Verify-PostgreSQL
    }

    # Final summary
    Write-Header "Installation Complete!"

    if ($installRedis) {
        Write-Success "Redis: localhost:6379"
    }

    if ($installClamAV) {
        Write-Success "ClamAV: localhost:3310"
    }

    if ($installPostgreSQL) {
        Write-Success "PostgreSQL: localhost:5432"
    }

    Write-Host ""
    Write-Info "Next steps:"
    Write-Host "  1. Review and update the .env file if needed"
    Write-Host "  2. Run database migrations: npm run migrate"
    Write-Host "  3. Start the application: npm start"
    Write-Host ""
}

# Run main function
Main

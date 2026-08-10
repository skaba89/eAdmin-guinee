param(
    [switch]$NoStart
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $RepoRoot ".env.local"
$ComposeFile = Join-Path $RepoRoot "docker-compose.local.yml"
$LocalScript = Join-Path $PSScriptRoot "local.ps1"
$ReportFile = Join-Path $RepoRoot "local-selftest-report.txt"

Set-Location $RepoRoot

$script:Checks = New-Object System.Collections.Generic.List[object]
$script:Failed = $false

function Add-Check {
    param(
        [string]$Name,
        [bool]$Ok,
        [string]$Details = ""
    )

    $status = if ($Ok) { "PASS" } else { "FAIL" }
    $script:Checks.Add([PSCustomObject]@{
        Status = $status
        Check = $Name
        Details = $Details
    })
    if (-not $Ok) {
        $script:Failed = $true
    }

    $color = if ($Ok) { "Green" } else { "Red" }
    Write-Host ("[{0}] {1}{2}" -f $status, $Name, $(if ($Details) { " - $Details" } else { "" })) -ForegroundColor $color
}

function Read-DotEnv {
    $values = @{}
    if (-not (Test-Path $EnvFile)) {
        return $values
    }

    foreach ($line in Get-Content $EnvFile) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#") -or -not $trimmed.Contains("=")) {
            continue
        }
        $parts = $trimmed.Split("=", 2)
        $values[$parts[0].Trim()] = $parts[1]
    }
    return $values
}

function Invoke-Compose {
    param(
        [Parameter(Mandatory = $true)][string[]]$Args,
        [switch]$Capture,
        [switch]$AllowFailure
    )

    $dockerArgs = @("compose", "--env-file", $EnvFile, "-f", $ComposeFile) + $Args
    if ($Capture) {
        # Docker Compose writes normal progress/status messages to stderr. In
        # Windows PowerShell 5.1, redirecting stderr with ErrorActionPreference
        # set to Stop turns those harmless lines into terminating exceptions.
        # Temporarily use Continue, capture both streams, then rely exclusively
        # on Docker's real process exit code.
        $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $output = & docker @dockerArgs 2>&1 | ForEach-Object { [string]$_ }
            $exitCode = $LASTEXITCODE
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }

        if ($exitCode -ne 0 -and -not $AllowFailure) {
            throw "docker compose $($Args -join ' ') a échoué (code $exitCode): $($output -join [Environment]::NewLine)"
        }
        return @($exitCode, ($output -join [Environment]::NewLine))
    }

    & docker @dockerArgs
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "docker compose $($Args -join ' ') a échoué (code $exitCode)."
    }
    return $exitCode
}

function Get-DbScalar {
    param([Parameter(Mandatory = $true)][string]$Sql)

    $result = Invoke-Compose -Capture -Args @(
        "exec", "-T", "postgres",
        "psql", "-U", "eadmin", "-d", "eadmin", "-Atc", $Sql
    )
    return ([string]$result[1]).Trim()
}

function Wait-Http {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$TimeoutSeconds = 180
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        }
        catch {
            Start-Sleep -Seconds 2
        }
    } while ((Get-Date) -lt $deadline)

    return $false
}

function Test-Login {
    param(
        [Parameter(Mandatory = $true)][string]$Email,
        [Parameter(Mandatory = $true)][string]$Password,
        [Parameter(Mandatory = $true)][string]$BackendUrl
    )

    try {
        $response = Invoke-RestMethod -Method Post `
            -Uri "$BackendUrl/api/v1/auth/login" `
            -ContentType "application/x-www-form-urlencoded" `
            -Body @{ username = $Email; password = $Password } `
            -TimeoutSec 20
        if ([string]::IsNullOrWhiteSpace([string]$response.access_token)) {
            return $null
        }
        return $response
    }
    catch {
        return $null
    }
}

function Save-Report {
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("eAdmin Guinée - rapport de test local")
    $lines.Add("Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')")
    $lines.Add("Machine: $env:COMPUTERNAME")
    $lines.Add("")
    foreach ($check in $script:Checks) {
        $suffix = if ($check.Details) { " - $($check.Details)" } else { "" }
        $lines.Add("[$($check.Status)] $($check.Check)$suffix")
    }
    $lines.Add("")
    $lines.Add("Aucun secret ni mot de passe n'est écrit dans ce rapport.")
    [System.IO.File]::WriteAllLines($ReportFile, $lines, (New-Object System.Text.UTF8Encoding($false)))
}

Write-Host ""
Write-Host "=== eAdmin Guinée - Self-test local Docker ===" -ForegroundColor Cyan
Write-Host "Ce test ne supprime aucun volume et ne réinitialise aucune donnée." -ForegroundColor DarkGray
Write-Host ""

try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Docker n'est pas disponible dans le PATH."
    }
    & docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Desktop est installé mais le moteur Docker n'est pas démarré."
    }
    Add-Check -Name "Docker Desktop" -Ok $true -Details "moteur joignable"

    # Reuse the canonical local bootstrap logic. In particular, this migrates
    # stale LOCAL_MINIO_CONSOLE_PORT=9001 values without rebuilding or resetting data.
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $LocalScript status *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "scripts/local.ps1 status a échoué."
    }

    if (-not (Test-Path $EnvFile)) {
        throw ".env.local n'a pas été généré."
    }
    $envMap = Read-DotEnv
    Add-Check -Name "Configuration locale" -Ok $true -Details ".env.local présent"

    $backendPort = if ($envMap["LOCAL_BACKEND_PORT"]) { $envMap["LOCAL_BACKEND_PORT"] } else { "8000" }
    $frontendPort = if ($envMap["LOCAL_FRONTEND_PORT"]) { $envMap["LOCAL_FRONTEND_PORT"] } else { "3000" }
    $minioConsolePort = if ($envMap["LOCAL_MINIO_CONSOLE_PORT"]) { $envMap["LOCAL_MINIO_CONSOLE_PORT"] } else { "9101" }
    $backendUrl = "http://localhost:$backendPort"
    $frontendUrl = "http://localhost:$frontendPort"

    if ($minioConsolePort -eq "9001") {
        Add-Check -Name "Port console MinIO" -Ok $false -Details "ancienne valeur 9001 encore présente"
        throw "Le port MinIO 9001 n'a pas été migré."
    }
    Add-Check -Name "Port console MinIO" -Ok $true -Details "host=$minioConsolePort"

    if (-not $NoStart) {
        Write-Host "Démarrage/réutilisation des conteneurs existants (sans --build, sans reset)..." -ForegroundColor Cyan
        $start = Invoke-Compose -Capture -AllowFailure -Args @("up", "-d", "--remove-orphans")
        if ([int]$start[0] -ne 0) {
            Add-Check -Name "Docker Compose up" -Ok $false -Details "échec au démarrage"
            Write-Host ([string]$start[1]) -ForegroundColor Yellow
            throw "La stack locale n'a pas pu démarrer."
        }
        Add-Check -Name "Docker Compose up" -Ok $true -Details "conteneurs démarrés/réutilisés"
    }

    $backendReady = Wait-Http -Url "$backendUrl/health" -TimeoutSeconds 180
    Add-Check -Name "Backend /health" -Ok $backendReady -Details $backendUrl
    if (-not $backendReady) {
        throw "Le backend ne répond pas."
    }

    $frontendReady = Wait-Http -Url $frontendUrl -TimeoutSeconds 180
    Add-Check -Name "Frontend HTTP" -Ok $frontendReady -Details $frontendUrl

    $userCountRaw = Get-DbScalar -Sql "SELECT count(*) FROM users;"
    $userCount = 0
    [void][int]::TryParse($userCountRaw, [ref]$userCount)
    Add-Check -Name "Utilisateurs PostgreSQL" -Ok ($userCount -ge 9) -Details "$userCount ligne(s)"

    $requiredCountRaw = Get-DbScalar -Sql "SELECT count(*) FROM users WHERE lower(email) IN ('superadmin@eadmin.test','citoyen@eadmin.test','agent@eadmin.test','mairie@eadmin.test','agence@eadmin.test','admin@eadmin.test','chef-service@eadmin.test','directeur@eadmin.test','ministre@eadmin.test') AND is_active=TRUE;"
    $requiredCount = 0
    [void][int]::TryParse($requiredCountRaw, [ref]$requiredCount)
    Add-Check -Name "Comptes bootstrap actifs" -Ok ($requiredCount -eq 9) -Details "$requiredCount/9"

    $orphanOperationalRaw = Get-DbScalar -Sql "SELECT count(*) FROM users WHERE role::text IN ('AGENT','MAIRIE','AGENCE','ADMIN','CHEF_SERVICE','DIRECTEUR') AND is_active=TRUE AND institution_id IS NULL;"
    $orphanOperational = 0
    [void][int]::TryParse($orphanOperationalRaw, [ref]$orphanOperational)
    Add-Check -Name "Comptes opérationnels rattachés" -Ok ($orphanOperational -eq 0) -Details "$orphanOperational sans institution"

    $duplicateMairieAdminsRaw = Get-DbScalar -Sql "SELECT count(*) FROM (SELECT u.tenant_id, u.institution_id FROM users u JOIN institutions i ON i.id=u.institution_id AND i.tenant_id=u.tenant_id WHERE u.role::text='ADMIN' AND u.is_active=TRUE AND lower(i.type)='mairie' GROUP BY u.tenant_id,u.institution_id HAVING count(*)>1) d;"
    $duplicateMairieAdmins = 0
    [void][int]::TryParse($duplicateMairieAdminsRaw, [ref]$duplicateMairieAdmins)
    Add-Check -Name "Un seul ADMIN actif par mairie" -Ok ($duplicateMairieAdmins -eq 0) -Details "$duplicateMairieAdmins mairie(s) en doublon"

    $password = $envMap["LOCAL_TEST_PASSWORD"]
    $superadminEmail = if ($envMap["LOCAL_SUPERADMIN_EMAIL"]) { $envMap["LOCAL_SUPERADMIN_EMAIL"] } else { "superadmin@eadmin.test" }
    if ([string]::IsNullOrWhiteSpace($password)) {
        throw "LOCAL_TEST_PASSWORD est absent de .env.local."
    }

    $superadminLogin = Test-Login -Email $superadminEmail -Password $password -BackendUrl $backendUrl
    Add-Check -Name "Login SUPER_ADMIN" -Ok ($null -ne $superadminLogin) -Details $superadminEmail

    $citizenLogin = Test-Login -Email "citoyen@eadmin.test" -Password $password -BackendUrl $backendUrl
    Add-Check -Name "Login CITOYEN" -Ok ($null -ne $citizenLogin) -Details "citoyen@eadmin.test"

    if ($null -ne $superadminLogin) {
        try {
            $headers = @{ Authorization = "Bearer $($superadminLogin.access_token)" }
            $usersPayload = Invoke-RestMethod -Method Get -Uri "$backendUrl/api/v1/users?page=1&page_size=100" -Headers $headers -TimeoutSec 20
            $apiCount = if ($null -ne $usersPayload.total) { [int]$usersPayload.total } else { @($usersPayload.items).Count }
            Add-Check -Name "API utilisateurs" -Ok ($apiCount -ge 9) -Details "$apiCount utilisateur(s) visibles par SUPER_ADMIN"
        }
        catch {
            Add-Check -Name "API utilisateurs" -Ok $false -Details $_.Exception.Message
        }
    }
    else {
        Add-Check -Name "API utilisateurs" -Ok $false -Details "non testé car login SUPER_ADMIN en échec"
    }

    $scopeTests = Invoke-Compose -Capture -AllowFailure -Args @(
        "exec", "-T", "backend",
        "pytest", "-q", "tests/test_mairie_tenant_isolation.py"
    )
    $scopeTestsOk = ([int]$scopeTests[0] -eq 0)
    $scopeSummary = ([string]$scopeTests[1]).Trim()
    if ($scopeSummary.Length -gt 220) {
        $scopeSummary = $scopeSummary.Substring([Math]::Max(0, $scopeSummary.Length - 220))
    }
    Add-Check -Name "Tests isolation multi-mairie" -Ok $scopeTestsOk -Details $scopeSummary

    $psResult = Invoke-Compose -Capture -AllowFailure -Args @("ps")
    if ([int]$psResult[0] -eq 0) {
        Write-Host ""
        Write-Host "--- Etat Docker Compose ---" -ForegroundColor Cyan
        Write-Host ([string]$psResult[1])
    }
}
catch {
    if (-not $script:Failed) {
        Add-Check -Name "Exécution du self-test" -Ok $false -Details $_.Exception.Message
    }
    Write-Host ""
    Write-Host "Diagnostic backend récent:" -ForegroundColor Yellow
    try {
        $logs = Invoke-Compose -Capture -AllowFailure -Args @("logs", "--tail", "120", "backend")
        Write-Host ([string]$logs[1])
    }
    catch {
        Write-Host "Impossible de récupérer les logs backend." -ForegroundColor DarkYellow
    }
}
finally {
    Save-Report
    Write-Host ""
    Write-Host "=== Résultat ===" -ForegroundColor Cyan
    $script:Checks | Format-Table -AutoSize
    Write-Host "Rapport: $ReportFile" -ForegroundColor Cyan
}

if ($script:Failed) {
    exit 1
}

Write-Host "Self-test local terminé avec succès." -ForegroundColor Green
exit 0

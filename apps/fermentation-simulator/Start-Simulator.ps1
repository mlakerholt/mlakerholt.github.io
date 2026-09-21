$ErrorActionPreference = 'Stop'
try {
    $appUrl = 'http://127.0.0.1:8765'
    $expected = 'fermentation-simulator:' + $PSScriptRoot
    function Test-Simulator {
        try {
            $response = Invoke-WebRequest -Uri "$appUrl/__fermentation_health" -UseBasicParsing -TimeoutSec 2
            return $response.Content -eq $expected
        } catch { return $false }
    }
    if (-not (Test-Simulator)) {
        $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
        Start-Process -FilePath $nodePath -ArgumentList ('"' + (Join-Path $PSScriptRoot 'local-server.cjs') + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            if (Test-Simulator) { break }
            Start-Sleep -Milliseconds 200
        }
        if (-not (Test-Simulator)) { throw 'The simulator could not start. Port 8765 may be used by another application.' }
    }
    Start-Process $appUrl
} catch {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Fermentation Simulator') | Out-Null
    exit 1
}

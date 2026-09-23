# Load environment variables from .env file
Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    # Skip empty lines and comments
    if ($line -and !$line.StartsWith('#')) {
        $parts = $line.Split('=', 2)
        if ($parts.Count -eq 2) {
            $name = $parts[0].Trim()
            $value = $parts[1].Trim()
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
            Write-Host "Set: $name"
        }
    }
}
Write-Host "Environment variables loaded from .env"

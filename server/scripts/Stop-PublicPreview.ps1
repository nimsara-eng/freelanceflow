$ErrorActionPreference = 'Stop'
$toolsDirectory = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'FreelanceFlow\tools')) + [IO.Path]::DirectorySeparatorChar
$previewProcesses = @(Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'" | Where-Object {
  $_.ExecutablePath -and
  [IO.Path]::GetFullPath($_.ExecutablePath).StartsWith($toolsDirectory, [StringComparison]::OrdinalIgnoreCase) -and
  $_.CommandLine -match '--url\s+http://127\.0\.0\.1:\d+(\s|$)'
})
foreach ($previewProcess in $previewProcesses) {
  Stop-Process -Id $previewProcess.ProcessId -ErrorAction SilentlyContinue
}
if ($previewProcesses.Count) {
  Write-Host 'FreelanceFlow public tunnel stopped. Its launcher will stop the associated preview API.'
} else {
  Write-Host 'No FreelanceFlow public preview is running.'
}

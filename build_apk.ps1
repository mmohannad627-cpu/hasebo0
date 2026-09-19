$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;" + $env:PATH
Write-Host "============================================"
Write-Host "JAVA_HOME: $env:JAVA_HOME"
Write-Host "============================================"
Write-Host ""
Write-Host "Starting build..."
Write-Host ""
Set-Location "c:\Users\عبدالله العزكي\Desktop\pdf\مجلد جديد\hasebo\android"
& ".\gradlew.bat" clean assembleDebug
Write-Host ""
Write-Host "============================================"
if ($LASTEXITCODE -eq 0) {
    Write-Host "BUILD SUCCESSFUL! APK is ready."
    $apkPath = "c:\Users\عبدالله العزكي\Desktop\pdf\مجلد جديد\hasebo\android\app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $apkPath) {
        Write-Host "APK location: $apkPath"
        explorer "c:\Users\عبدالله العزكي\Desktop\pdf\مجلد جديد\hasebo\android\app\build\outputs\apk\debug\"
    }
} else {
    Write-Host "BUILD FAILED with exit code: $LASTEXITCODE"
}
Write-Host "============================================"
Read-Host "Press Enter to close..."

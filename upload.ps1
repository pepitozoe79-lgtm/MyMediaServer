# Comando automático para subir todos los cambios al repositorio GitHub
Write-Host "Iniciando guardado e interacción con GitHub..." -ForegroundColor Cyan

git add .
git commit -m "Añadidos scripts automáticos de instalación y desinstalación para Linux, y rediseño de UI."
git push origin main

Write-Host "¡Repositorio actualizado exitosamente!" -ForegroundColor Green
Pause

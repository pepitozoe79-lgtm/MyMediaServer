# Comando automático para subir todos los cambios al repositorio GitHub
Write-Host "Iniciando guardado e interacción con GitHub..." -ForegroundColor Cyan

git add .
git commit -m "Se añade comando encadenado para Reinstalación Limpia al estilo CasaOS en README"
git push origin main

Write-Host "¡Repositorio actualizado exitosamente!" -ForegroundColor Green
Pause

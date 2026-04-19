# Comando automático para subir todos los cambios al repositorio GitHub
Write-Host "Iniciando guardado e interacción con GitHub..." -ForegroundColor Cyan

git add .
git commit -m "Rediseño completo de la UI premium y comando de instalación curl estilo CasaOS"
git push origin main

Write-Host "¡Repositorio actualizado exitosamente!" -ForegroundColor Green
Pause

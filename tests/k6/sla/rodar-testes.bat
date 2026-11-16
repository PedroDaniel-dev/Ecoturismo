@echo off
rem Roda as medições de SLA dos três serviços e gera os gráficos e a página docs\SLA.md.
rem   rodar-testes.bat       medição 1
rem   rodar-testes.bat 2     medição 2 (compara com a 1)
rem O backend precisa estar rodando em http://localhost:8080 (npm run back).
rem Para um teste rápido: set DEGRAUS=5,10,20 e set PATAMAR=20 antes de rodar.

setlocal
chcp 65001 >nul
cd /d "%~dp0..\..\.."

set MEDICAO=%~1
if "%MEDICAO%"=="" set MEDICAO=1
if not "%MEDICAO%"=="1" if not "%MEDICAO%"=="2" (
  echo Use: rodar-testes.bat [1^|2]
  goto :fim
)

where k6 >nul 2>nul || (echo O k6 nao foi encontrado. Instale com: winget install k6 --source winget & goto :fim)
where python >nul 2>nul || (echo O Python nao foi encontrado. Instale com: winget install Python.Python.3.12 & goto :fim)
python -c "import matplotlib" 2>nul || (echo Falta o matplotlib. Instale com: pip install matplotlib & goto :fim)

curl -s -o nul -f http://localhost:8080/api/trilhas || (echo O backend nao respondeu em http://localhost:8080. Rode "npm run back" em outro terminal. & goto :fim)

if not exist sla-saida mkdir sla-saida
set K6_CSV_TIME_FORMAT=unix_milli

for %%S in (busca-trilhas visitas login) do (
  echo.
  echo ===== Medição %MEDICAO%: %%S =====
  k6 run --system-tags status,name,scenario,expected_response --out csv=sla-saida\%%S.csv.gz tests\k6\sla\%%S.js
)

echo.
echo ===== Gráficos e página =====
python tests\k6\sla\graficos.py %MEDICAO%

:fim
echo.
pause

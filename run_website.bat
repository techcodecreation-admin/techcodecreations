@echo off
title Tech Code Creations - Local Web Server
echo ========================================================
echo   TECH CODE CREATIONS - Web Development Studio
echo   Founder: KUBERAMOORTHY S (Phone: 8248688471)
echo   Address: 85/A Seenivasa nagar, Sakkottai Post, Kumbakonam
echo ========================================================
echo.
echo Starting local web server on port 8080...
start http://localhost:8080/index.html
python -m http.server 8080
pause

@echo off
title epkcompiler
echo compiling, please wait...
java -jar "lwjgl-rundir/CompileEPK.jar" "lwjgl-rundir/resources" "javascript/assets.epk"
echo finished compiling epk
pause

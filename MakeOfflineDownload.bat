@echo off
title MakeOfflineDownload
java -cp "lwjgl-rundir/MakeOfflineDownload.jar;lwjgl-rundir/CompileEPK.jar" net.lax1dude.eaglercraft.v1_8.buildtools.workspace.MakeOfflineDownload "javascript/OfflineDownloadTemplate.txt" "javascript/classes.js" "javascript/assets.epk" "javascript/Eaglercraft_1.7.10_Offline_en_US.html" "javascript/EaglercraftX_1.7.10_Offline_International.html" "javascript/lang"
pause
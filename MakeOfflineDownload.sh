#!/bin/sh
java -cp "lwjgl-rundir/MakeOfflineDownload.jar:lwjgl-rundir/CompileEPK.jar" net.lax1dude.eaglercraft.v1_8.buildtools.workspace.MakeOfflineDownload "javascript/OfflineDownloadTemplate.txt" "javascript/classes.js" "javascript/assets.epk" "javascript/Eaglercraft_Alpha_1.1.2_01.html"

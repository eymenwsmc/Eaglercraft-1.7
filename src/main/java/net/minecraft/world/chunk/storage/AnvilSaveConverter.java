package net.minecraft.world.chunk.storage;

import java.io.File;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import net.lax1dude.eaglercraft.internal.vfs2.VFile2;
import net.minecraft.util.IProgressUpdate;
import net.minecraft.util.MathHelper;
import net.minecraft.world.WorldType;
import net.minecraft.world.biome.BiomeGenBase;
import net.minecraft.world.biome.WorldChunkManager;
import net.minecraft.world.biome.WorldChunkManagerHell;
import net.minecraft.world.storage.ISaveHandler;
import net.minecraft.world.storage.SaveFormatComparator;
import net.minecraft.world.storage.SaveFormatOld;
import net.minecraft.world.storage.WorldInfo;

public class AnvilSaveConverter extends SaveFormatOld {
	public AnvilSaveConverter(VFile2 par1File) {
		super(par1File);
	}

	public List getSaveList() {
		ArrayList var1 = new ArrayList();
		List<String> files = this.savesDirectory.listFilenames(true);
		if (files == null) {
			return var1;
		}
		Set<String> worldNames = new HashSet<String>();
		for (String p : files) {
			String np = VFile2.normalizePath(p);
			if (np.endsWith("/level.dat")) {
				String parent = np.substring(0, np.length() - "/level.dat".length());
				String world = VFile2.getNameFromPath(parent);
				if (world != null && world.length() > 0) {
					worldNames.add(world);
				}
			}
		}
		for (String worldName : worldNames) {
			WorldInfo var8 = this.getWorldInfo(worldName);
			if (var8 != null) {
				String var10 = var8.getWorldName();
				if (var10 == null || MathHelper.stringNullOrLengthZero(var10)) {
					var10 = worldName;
				}
				long var11 = var8.getLastTimePlayed();
				if (var11 == 0L) {
					var11 = System.currentTimeMillis();				}
				var1.add(new SaveFormatComparator(worldName, var10, var11, 0L, var8.getGameType(), false,
						var8.isHardcoreModeEnabled(), var8.areCommandsAllowed(), null));
			}
		}
		return var1;
	}

	protected int getSaveVersion() {
		return 19133;
	}

	public void flushCache() {
		RegionFileCache.clearRegionFileReferences();
	}

	/**
	 * Returns back a loader for the specified save directory
	 */
	public ISaveHandler getSaveLoader(String par1Str, boolean par2) {
		return new AnvilSaveHandler(this.savesDirectory, par1Str, par2);
	}

	/**
	 * Checks if the save directory uses the old map format
	 */
	public boolean isOldMapFormat(String par1Str) {
		WorldInfo var2 = this.getWorldInfo(par1Str);
		return var2 != null && var2.getSaveVersion() != this.getSaveVersion();
	}

	/**
	 * Converts the specified map to the new map format. Args: worldName,
	 * loadingScreen
	 */
	public boolean convertMapFormat(String par1Str, IProgressUpdate par2IProgressUpdate) {
		par2IProgressUpdate.setLoadingProgress(0);
		ArrayList var3 = new ArrayList();
		ArrayList var4 = new ArrayList();
		ArrayList var5 = new ArrayList();
		VFile2 var6 = new VFile2(this.savesDirectory, par1Str);
		VFile2 var7 = new VFile2(var6, "DIM-1");
		VFile2 var8 = new VFile2(var6, "DIM1");
		System.out.println("Scanning folders...");
		this.addRegionFilesToCollection(var6, var3);

		if (var7.exists()) {
			this.addRegionFilesToCollection(var7, var4);
		}

		if (var8.exists()) {
			this.addRegionFilesToCollection(var8, var5);
		}

		int var9 = var3.size() + var4.size() + var5.size();
		System.out.println("Total conversion count is " + var9);
		WorldInfo var10 = this.getWorldInfo(par1Str);
		Object var11 = null;

		if (var10.getTerrainType() == WorldType.FLAT) {
			var11 = new WorldChunkManagerHell(BiomeGenBase.plains, 0.5F);
		} else {
			var11 = new WorldChunkManager(var10.getSeed(), var10.getTerrainType());
		}

		var10.setSaveVersion(19133);

		if (var10.getTerrainType() == WorldType.DEFAULT_1_1) {
			var10.setTerrainType(WorldType.DEFAULT);
		}

		this.createFile(par1Str);
		ISaveHandler var12 = this.getSaveLoader(par1Str, false);
		var12.saveWorldInfo(var10);
		return true;
	}

	/**
	 * par: filename for the level.dat_mcr backup
	 */
	private void createFile(String par1Str) {
		VFile2 var2 = new VFile2(this.savesDirectory, par1Str);

		if (!var2.exists()) {
			System.out.println("Warning: Unable to create level.dat_mcr backup");
		} else {
			VFile2 var3 = new VFile2(var2, "level.dat");

			if (!var3.exists()) {
				System.out.println("Warning: Unable to create level.dat_mcr backup");
			} else {
				VFile2 var4 = new VFile2(var2, "level.dat_mcr");

				if (!var3.renameTo(var4)) {
					System.out.println("Warning: Unable to create level.dat_mcr backup");
				}
			}
		}
	}

	private void convertFile(VFile2 par1File, Iterable par2Iterable, WorldChunkManager par3WorldChunkManager, int par4,
			int par5, IProgressUpdate par6IProgressUpdate) {

	}

	/**
	 * copies a 32x32 chunk set from par2File to par1File, via AnvilConverterData
	 */
	private void convertChunks(VFile2 par1File, File par2File, WorldChunkManager par3WorldChunkManager, int par4,
			int par5, IProgressUpdate par6IProgressUpdate) {

	}

	/**
	 * filters the files in the par1 directory, and adds them to the par2
	 * collections
	 */
	private void addRegionFilesToCollection(VFile2 par1File, Collection par2Collection) {
		VFile2 var3 = new VFile2(par1File, "region");
		List<VFile2> var4 = var3.listFiles(false);

		if (var4 != null) {
			Collections.addAll(par2Collection, var4);
		}
	}
}

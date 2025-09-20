package net.minecraft.world.chunk.storage;

import net.lax1dude.eaglercraft.internal.vfs2.VFile2;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.world.WorldProvider;
import net.minecraft.world.WorldProviderEnd;
import net.minecraft.world.WorldProviderHell;
import net.minecraft.world.storage.SaveHandler;
import net.minecraft.world.storage.WorldInfo;

public class AnvilSaveHandler extends SaveHandler {
	private static final String __OBFID = "CL_00000581";

	public AnvilSaveHandler(VFile2 p_i2142_1_, String p_i2142_2_, boolean p_i2142_3_) {
		super(p_i2142_1_, p_i2142_2_, p_i2142_3_);
	}

	/**
	 * Returns the chunk loader with the provided world provider
	 */
	public IChunkLoader getChunkLoader(WorldProvider p_75763_1_) {
		VFile2 var2 = this.getWorldDirectory();
		VFile2 var3;

		if (p_75763_1_ instanceof WorldProviderHell) {
			var3 = new VFile2(var2, "DIM-1");
			return new AnvilChunkLoader(var3);
		} else if (p_75763_1_ instanceof WorldProviderEnd) {
			var3 = new VFile2(var2, "DIM1");
			return new AnvilChunkLoader(var3);
		} else {
			return new AnvilChunkLoader(var2);
		}
	}

	/**
	 * Saves the given World Info with the given NBTTagCompound as the Player.
	 */
	public void saveWorldInfoWithPlayer(WorldInfo p_75755_1_, NBTTagCompound p_75755_2_) {
		p_75755_1_.setSaveVersion(19133);
		super.saveWorldInfoWithPlayer(p_75755_1_, p_75755_2_);
	}

	/**
	 * Called to flush all changes to disk, waiting for them to complete.
	 */
	public void flush() {
	

		RegionFileCache.clearRegionFileReferences();
	}
}

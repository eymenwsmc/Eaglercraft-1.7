package net.lax1dude.eaglercraft.sp.server;

import java.io.File;
import java.io.IOException;
import java.util.LinkedList;
import java.util.List;

import org.apache.logging.log4j.Logger;

import com.google.common.collect.Lists;

import net.lax1dude.eaglercraft.internal.vfs2.VFile2;
import net.minecraft.init.Bootstrap;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.EnumDifficulty;
import net.minecraft.world.WorldServer;
import net.minecraft.world.WorldSettings;

public class EaglerMinecraftServer extends MinecraftServer {

	public static final Logger logger = EaglerIntegratedServerWorker.logger;

	protected boolean isGamePaused = false;
	protected EnumDifficulty difficulty;
	protected WorldSettings.GameType gamemode;
	protected WorldSettings newWorldSettings;

	public static int counterTicksPerSecond = 0;
	public static int counterChunkRead = 0;
	public static int counterChunkGenerate = 0;
	public static int counterChunkWrite = 0;
	public static int counterTileUpdate = 0;
	public static int counterLightUpdate = 0;

	private final List<Runnable> scheduledTasks = new LinkedList();

	private long lastTPSUpdate = 0l;
	protected long currentTime = MinecraftServer.getCurrentTimeMillis();
	protected long timeOfLastWarning = 0L;

	public EaglerMinecraftServer(String world, String owner, int viewDistance, WorldSettings currentWorldSettings,
			boolean demo) {
		super(new VFile2(world), null);
		Bootstrap.func_151354_b();
		EaglerPlayerList playerList = new EaglerPlayerList(this, viewDistance);
		this.setServerOwner(owner);
		logger.info("server owner: " + owner);
		this.setDemo(demo);
		this.canCreateBonusChest(currentWorldSettings != null && currentWorldSettings.isBonusChestEnabled());
		this.setBuildLimit(256);
		this.serverConfigManager = (playerList);
		this.newWorldSettings = currentWorldSettings;
		// Set only the world name (not path) for folderName and worldName
		String worldNameOnly = new File(world).getName();
		this.setFolderName(worldNameOnly);
		this.setWorldName(worldNameOnly);
	}

	public void setBaseServerProperties(EnumDifficulty difficulty, WorldSettings.GameType gamemode) {
		this.difficulty = difficulty;
		this.gamemode = gamemode;
		this.setCanSpawnAnimals(true);
		this.setCanSpawnNPCs(true);
		this.setAllowPvp(true);
		this.setAllowFlight(true);
	}

	@Override
	public boolean startServer() throws IOException {
		logger.info("Starting integrated eaglercraft server version 1.12.2");
		this.setOnlineMode(false);
		this.setCanSpawnAnimals(true);
		this.setCanSpawnNPCs(true);
		this.setAllowPvp(true);
		this.setAllowFlight(true);
		this.loadAllWorlds(this.getFolderName(), this.getWorldName(), this.newWorldSettings.getSeed(),
				this.newWorldSettings.getTerrainType(), this.newWorldSettings.func_82749_j());
		this.setMOTD(this.getServerOwner() + " - " + this.worldServers[0].getWorldInfo().getWorldName());
		serverRunning = true;
		return true;
	}

	public void mainLoop(boolean singleThreadMode) {
		long k = MinecraftServer.getCurrentTimeMillis();
		this.sendTPSToClient(k);
		if (isGamePaused) {
			currentTime = k;
			return;
		}

		long j = k - this.currentTime;
		if ((j > (singleThreadMode ? 500L : 2000L)
				&& this.currentTime - this.timeOfLastWarning >= (singleThreadMode ? 5000L : 15000L))) {
			logger.warn(
					"Can\'t keep up! Did the system time change, or is the server overloaded? Running {}ms behind, skipping {} tick(s)",
					new Object[] { Long.valueOf(j), Long.valueOf(j / 50L) });
			j = 100L;
			this.currentTime = k - 100l;
			this.timeOfLastWarning = this.currentTime;
		}

		if (j < 0L) {
			logger.warn("Time ran backwards! Did the system time change?");
			j = 0L;
			this.currentTime = k;
		}

		if (this.worldServers[0].areAllPlayersAsleep()) {
			this.currentTime = k;
			this.tick();
			++counterTicksPerSecond;
		} else {
			if (j > 50L) {
				this.currentTime += 50l;
				this.tick();
				++counterTicksPerSecond;
			}
		}
	}

	public void updateTimeLightAndEntities() {
		super.updateTimeLightAndEntities();
	}

	protected void sendTPSToClient(long millis) {
		if (millis - lastTPSUpdate > 1000l) {
			lastTPSUpdate = millis;
			if (serverRunning && this.worldServers != null) {
				List<String> lst = Lists.newArrayList("TPS: " + counterTicksPerSecond + "/20",
						"Chunks: " + countChunksLoaded(this.worldServers) + "/" + countChunksTotal(this.worldServers),
						"Entities: " + countEntities(this.worldServers) + "+" + countTileEntities(this.worldServers),
						"R: " + counterChunkRead + ", G: " + counterChunkGenerate + ", W: " + counterChunkWrite,
						"TU: " + counterTileUpdate + ", LU: " + counterLightUpdate);
				int players = countPlayerEntities(this.worldServers);
				if (players > 1) {
					lst.add("Players: " + players);
				}
				counterTicksPerSecond = counterChunkRead = counterChunkGenerate = 0;
				counterChunkWrite = counterTileUpdate = counterLightUpdate = 0;
				EaglerIntegratedServerWorker.reportTPS(lst);
			}
		}
	}

	private static int countChunksLoaded(WorldServer[] worlds) {
		int i = 0;
		for (int j = 0; j < worlds.length; ++j) {
			if (worlds[j] != null) {
				i += worlds[j].getChunkProvider().getLoadedChunkCount();
			}
		}
		return i;
	}

	private static int countChunksTotal(WorldServer[] worlds) {
		int i = 0;
		for (int j = 0; j < worlds.length; ++j) {
			if (worlds[j] != null) {
				// List<EntityPlayer> players = worlds[j].playerEntities;
				// for(int l = 0, n = players.size(); l < n; ++l) {
				// i += ((EntityPlayerMP)players.get(l)).loadedChunks.size();
				// }
				i += worlds[j].getChunkProvider().getLoadedChunkCount();
			}
		}
		return i;
	}

	private static int countEntities(WorldServer[] worlds) {
		int i = 0;
		for (int j = 0; j < worlds.length; ++j) {
			if (worlds[j] != null) {
				i += worlds[j].loadedEntityList.size();
			}
		}
		return i;
	}

	private static int countTileEntities(WorldServer[] worlds) {
		int i = 0;
		for (int j = 0; j < worlds.length; ++j) {
			if (worlds[j] != null) {
				// i += worlds[j].loadedTileEntityList.size();
			}
		}
		return i;
	}

	private static int countPlayerEntities(WorldServer[] worlds) {
		int i = 0;
		for (int j = 0; j < worlds.length; ++j) {
			if (worlds[j] != null) {
				i += worlds[j].playerEntities.size();
			}
		}
		return i;
	}

	public void setPaused(boolean p) {
		isGamePaused = p;
		if (!p) {
			currentTime = System.currentTimeMillis();
		}
	}

	public boolean getPaused() {
		return isGamePaused;
	}

	@Override
	public boolean canStructuresSpawn() {
		return (worldServers != null && worldServers[0] != null) ? worldServers[0].getWorldInfo().isMapFeaturesEnabled()
				: newWorldSettings.isMapFeaturesEnabled();
	}

	@Override
	public WorldSettings.GameType getGameType() {
		return (worldServers != null && worldServers[0] != null) ? worldServers[0].getWorldInfo().getGameType()
				: newWorldSettings.getGameType();
	}

	@Override
	public EnumDifficulty func_147135_j() {
		return difficulty;
	}

	@Override
	public EnumDifficulty getDifficulty() {
		return difficulty;
	}

	@Override
	public boolean isHardcore() {
		return (worldServers != null && worldServers[0] != null)
				? worldServers[0].getWorldInfo().isHardcoreModeEnabled()
				: newWorldSettings.getHardcoreEnabled();
	}

	@Override
	public boolean isDedicatedServer() {
		return false;
	}

	@Override
	public boolean isCommandBlockEnabled() {
		return true;
	}

	@Override
	public String shareToLAN(WorldSettings.GameType gamemode, boolean cheats) {
		return null;
	}

	@Override
	public boolean func_152363_m() {
		return false;
	}

	@Override
	public int func_110455_j() {
		return 0;
	}

}

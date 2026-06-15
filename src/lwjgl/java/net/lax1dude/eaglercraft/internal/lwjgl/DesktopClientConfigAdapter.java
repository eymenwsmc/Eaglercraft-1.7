package net.lax1dude.eaglercraft.internal.lwjgl;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

import org.json.JSONObject;

import net.lax1dude.eaglercraft.EaglercraftVersion;
import net.lax1dude.eaglercraft.Random;
import net.lax1dude.eaglercraft.internal.IClientConfigAdapter;
import net.lax1dude.eaglercraft.internal.IClientConfigAdapterHooks;
import net.lax1dude.eaglercraft.sp.relay.RelayEntry;

/**
 * Copyright (c) 2022 lax1dude. All Rights Reserved.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 * 
 */
public class DesktopClientConfigAdapter implements IClientConfigAdapter {

	public static final IClientConfigAdapter instance = new DesktopClientConfigAdapter();

	private final DesktopClientConfigAdapterHooks hooks = new DesktopClientConfigAdapterHooks();

	@Override
	public String getWorldsDB() {
		return "worlds";
	}

	@Override
	public String getResourcePacksDB() {
		return "resourcePacks";
	}

	@Override
	public boolean isCheckGLErrors() {
		return false;
	}

	@Override
	public String getLocalStorageNamespace() {
		return EaglercraftVersion.localStorageNamespace;
	}

	@Override
	public boolean isEaglerNoDelay() {
		return false;
	}

	@Override
	public boolean isRamdiskMode() {
		return false;
	}

	@Override
	public boolean isEnforceVSync() {
		return false;
	}

	@Override
	public IClientConfigAdapterHooks getHooks() {
		return hooks;
	}

	@Override
	public boolean isEnableServerCookies() {
		return false;
	}

	private final List<RelayEntry> relays = new ArrayList<>();

	@Override
	public List<RelayEntry> getRelays() {
		if (relays.isEmpty()) {
			int relayId = (new Random()).nextInt(3);
			relays.add(new RelayEntry("wss://relay.deev.is/", "lax1dude relay #1", relayId == 0));
			relays.add(new RelayEntry("wss://relay.lax1dude.net/", "lax1dude relay #2", relayId == 1));
			relays.add(new RelayEntry("wss://relay.shhnowisnottheti.me/", "ayunami relay #1", relayId == 2));
		}
		return relays;
	}

	@Override
	public boolean isForceWebViewSupport() {
		return false;
	}

	@Override
	public boolean isEnableWebViewCSP() {
		return false;
	}

	private static class DesktopClientConfigAdapterHooks implements IClientConfigAdapterHooks {

		@Override
		public void callLocalStorageSavedHook(String key, String base64) {

		}

		@Override
		public String callLocalStorageLoadHook(String key) {
			return null;
		}

		@Override
		public void callCrashReportHook(String crashReport, Consumer<String> customMessageCB) {

		}

		@Override
		public void callScreenChangedHook(String screenName, int scaledWidth, int scaledHeight, int realWidth,
				int realHeight, int scaleFactor) {

		}

	}

	@Override
	public JSONObject getIntegratedServerOpts() {
		return null;
	}

}
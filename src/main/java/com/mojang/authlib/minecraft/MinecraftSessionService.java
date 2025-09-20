package com.mojang.authlib.minecraft;

import java.util.HashMap;
import java.util.Map;
import com.mojang.authlib.GameProfile;

public class MinecraftSessionService {
	public Map getTextures(Object profile, boolean requireSecure) {
		return new HashMap();
	}

	public GameProfile fillProfileProperties(GameProfile profile, boolean requireSecure) {
		return profile;
	}
}
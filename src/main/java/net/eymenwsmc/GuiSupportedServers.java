package net.eymenwsmc;

import java.util.ArrayList;
import java.util.List;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiButton;
import net.minecraft.client.gui.GuiScreen;
import net.minecraft.client.multiplayer.GuiConnecting;
import net.minecraft.client.multiplayer.ServerData;
import net.minecraft.client.multiplayer.ServerList;

public class GuiSupportedServers extends GuiScreen {
    private final GuiScreen parent;
    private final List<ServerData> supportedServers = new ArrayList<ServerData>();

    private static final int ROW_HEIGHT = 72;    private static final int START_Y = 58;
    private static final int MAX_CARD_WIDTH = 420;
    private static final int CARD_PADDING = 8;

    public GuiSupportedServers(GuiScreen parent) {
        this.parent = parent;
        supportedServers.add(new ServerData("Tuff Net", "wss://tuff.ws"));
        supportedServers.add(new ServerData("OPSPT", "wss://opspt.webmc.xyz"));
        supportedServers.add(new ServerData("Adderall MC", "wss://adderall.ir"));
    }

    @Override
    public void initGui() {
        this.buttonList.clear();

        this.buttonList.add(new GuiButton(0, this.width / 2 - 100, this.height - 28, 200, 20, "Back"));

        int y = START_Y;
        int cardWidth = Math.min(MAX_CARD_WIDTH, this.width - 40);
        for (int index = 0; index < supportedServers.size(); index++) {
            int buttonsY = y + ROW_HEIGHT - CARD_PADDING - 24; // bottom area of the card

            int btnWidth = 110;
            int btnSpacing = 12;
            int totalBtnWidth = btnWidth * 2 + btnSpacing;
            int btnStartX = this.width / 2 - (totalBtnWidth / 2);

            this.buttonList.add(new GuiButton(101 + index * 2, btnStartX, buttonsY, btnWidth, 20, "Add to List"));
            this.buttonList.add(new GuiButton(100 + index * 2, btnStartX + btnWidth + btnSpacing, buttonsY, btnWidth, 20, "Connect"));

            y += ROW_HEIGHT;
        }
    }

    @Override
    protected void actionPerformed(GuiButton button) {
        if (!button.enabled) return;

        if (button.id == 0) {
            this.mc.displayGuiScreen(parent);
            return;
        }

        if (button.id >= 100) {
            int idx = (button.id - 100) / 2;
            boolean isAdd = ((button.id - 100) % 2) == 1;
            if (idx >= 0 && idx < supportedServers.size()) {
                ServerData dat = supportedServers.get(idx);
                if (isAdd) {
                    ServerList list = new ServerList(this.mc);
                    list.loadServerList();
                    boolean exists = false;
                    for (int i = 0; i < list.countServers(); i++) {
                        ServerData e = list.getServerData(i);
                        if (e.serverIP.equalsIgnoreCase(dat.serverIP)) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        list.addServerData(new ServerData(dat.serverName, dat.serverIP));
                        list.saveServerList();
                    }
                } else {
                    this.mc.displayGuiScreen(new GuiConnecting(this.parent, Minecraft.getMinecraft(),
                            new ServerData(dat.serverName, dat.serverIP)));
                }
            }
        }
    }

    @Override
    public void drawScreen(int mouseX, int mouseY, float partialTicks) {
        this.drawDefaultBackground();
        this.drawCenteredString(this.fontRendererObj, "Supported Servers", this.width / 2, 18, 0xFFFFFF);
        this.drawCenteredString(this.fontRendererObj, "Join curated, 1.7-compatible servers.", this.width / 2, 32, 0xAAAAAA);

        int y = START_Y;
        int cardWidth = Math.min(MAX_CARD_WIDTH, this.width - 40);
        for (int i = 0; i < supportedServers.size(); i++) {
            ServerData data = supportedServers.get(i);
            int cardLeft = this.width / 2 - cardWidth / 2;
            int cardRight = this.width / 2 + cardWidth / 2;
            int cardTop = y;
            int cardBottom = y + ROW_HEIGHT - 8;

            drawRect(cardLeft, cardTop, cardRight, cardBottom, 0x88000000);
            drawRect(cardLeft, cardTop, cardRight, cardTop + 1, 0x33FFFFFF);
            drawRect(cardLeft, cardTop, cardLeft + 1, cardBottom, 0x33000000);
            drawRect(cardRight - 1, cardTop, cardRight, cardBottom, 0x33000000);
            drawRect(cardLeft, cardBottom - 1, cardRight, cardBottom, 0x33000000);

            int textX = cardLeft + CARD_PADDING;
            int nameY = cardTop + CARD_PADDING;
            int ipY = nameY + this.fontRendererObj.FONT_HEIGHT + 6;

            this.fontRendererObj.drawString(data.serverName, textX, nameY, 0xFFFFFF);
            this.fontRendererObj.drawString(data.serverIP, textX, ipY, 0xCCCCCC);

            y += ROW_HEIGHT;
        }

        super.drawScreen(mouseX, mouseY, partialTicks);
    }
}

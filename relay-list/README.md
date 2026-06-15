# 🎮 Eaglercraft Relay List

A modern, community-driven server directory for Eaglercraft multiplayer worlds. Find servers, share your world, and connect with other players!

## ✨ Features

### 🔍 **Server Discovery**
- Browse all active Eaglercraft servers
- Search by name, description, or join code
- Filter by relay server
- Sort by player count, newest, or name

### ➕ **Easy Server Submission**
- Add your server in seconds
- Automatic verification before listing
- Real-time status checking
- Player count tracking

### 🛡️ **Security & Reliability**
- Servers are verified before being added
- Automatic offline server removal (after 10 minutes)
- Auto-verification every 2 minutes
- Client-side database (IndexedDB) for fast loading
- No server required - runs entirely in browser

### 📊 **Live Statistics**
- Total active servers
- Total players online
- Real-time server status
- Last verified timestamp

### 🎨 **Modern UI**
- Beautiful gradient design
- Responsive layout (mobile-friendly)
- Dark theme optimized for gaming
- Smooth animations and transitions

## 🚀 How to Use

### For Players:

1. **Browse Servers**: Scroll through the list of active servers
2. **Search**: Use the search bar to find specific servers
3. **View Details**: Click on any server card to see full details
4. **Copy Join Code**: Click the copy button to get the join code
5. **Join**: Open Eaglercraft → Multiplayer → Direct Connect → Paste code

### For Server Owners:

1. **Click "Add Your Server"**
2. **Fill in the form**:
   - Server Name (max 50 characters)
   - Description (max 200 characters)
   - Join Code (exactly 5 characters)
   - Select your relay server
3. **Verify**: System will automatically verify your server is online
4. **Done!**: Your server appears in the list immediately

## 🔧 Technical Details

### Architecture:
- **Frontend**: Pure HTML, CSS, JavaScript (no frameworks)
- **Database**: IndexedDB (client-side, no backend needed)
- **Verification**: WebSocket connections to relay servers
- **Protocol**: Eaglercraft relay protocol (handshake packets)

### Verification System:
1. Connects to the specified relay server
2. Sends client handshake packet (0x00) with join code
3. Waits for response:
   - Success (0x00/0x01) → Server is online ✅
   - Error (0xFF) → Server offline/doesn't exist ❌
4. Updates server status in database

### Auto-Cleanup:
- Servers are re-verified every 2 minutes
- Offline servers are removed after 10 minutes
- Prevents stale/dead servers in the list

### Supported Relays:
- `wss://relay.deev.is/` (lax1dude relay #1)
- `wss://relay.lax1dude.net/` (lax1dude relay #2)
- `wss://relay.shhnowisnottheti.me/` (ayunami relay #1)

## 📱 Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera
- ⚠️ Requires IndexedDB support

## 🔒 Security Features

1. **Input Validation**:
   - Join codes: 5 chars, alphanumeric only
   - Name/description: Length limits enforced
   - XSS protection via HTML escaping

2. **Verification**:
   - All servers verified before listing
   - Duplicate prevention
   - Automatic offline detection

3. **No Backend**:
   - All data stored locally
   - No server to hack
   - Privacy-friendly

## 🎯 Future Enhancements

- [ ] Player count parsing (requires protocol analysis)
- [ ] Server categories/tags
- [ ] Favorite servers
- [ ] Server uptime tracking
- [ ] Admin contact info
- [ ] Server screenshots
- [ ] Vote/rating system
- [ ] Export/import server lists

## 📝 Notes

- **Join codes are case-insensitive** (automatically converted to lowercase)
- **Servers must be online** to be added to the list
- **Offline servers are auto-removed** after 10 minutes
- **No account required** - fully anonymous

## 🤝 Contributing

This is a community project! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Share with friends

## 📄 License

Open source - feel free to use, modify, and distribute!

---

**Made with ❤️ for the Eaglercraft community**

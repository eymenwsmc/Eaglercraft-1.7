class RelaySniffer {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.startTime = null;
        this.autoRefresh = false;
        this.refreshInterval = null;
        this.currentUrl = '';
        this.scanMode = false;
        this.scanning = false;
        this.foundWorlds = new Set();
        this.testedCodes = 0;
        this.scanStartTime = 0;
        this.stats = {
            totalPackets: 0,
            handshake: 0,
            ice: 0,
            description: 0,
            client: 0,
            error: 0,
            clients: new Set()
        };
        this.initializeUI();
    }

    initializeUI() {
        // Buttons
        this.connectBtn = document.getElementById('connectBtn');
        this.disconnectBtn = document.getElementById('disconnectBtn');
        this.clearBtn = document.getElementById('clearBtn');

        // Inputs
        this.relayUrl = document.getElementById('relayUrl');
        this.relaySelect = document.getElementById('relaySelect');
        this.joinCode = document.getElementById('joinCode');
        
        // Handle relay selection
        if (this.relaySelect) {
            this.relaySelect.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    this.relayUrl.style.display = 'block';
                    this.relayUrl.value = '';
                } else {
                    this.relayUrl.style.display = 'none';
                    this.relayUrl.value = e.target.value;
                }
            });
            // Set initial value
            this.relayUrl.value = this.relaySelect.value;
        }

        // Status
        this.statusText = document.getElementById('statusText');

        // Logs
        this.packetLog = document.getElementById('packetLog');
        this.rawLog = document.getElementById('rawLog');

        // Auto refresh checkbox
        this.autoRefreshCheckbox = document.getElementById('autoRefresh');
        this.refreshIntervalInput = document.getElementById('refreshInterval');
        
        // Scan mode
        this.scanModeCheckbox = document.getElementById('scanMode');
        this.scanStats = document.getElementById('scanStats');

        // Event listeners
        this.connectBtn.addEventListener('click', () => {
            if (this.scanModeCheckbox?.checked) {
                this.startScan();
            } else {
                this.connect();
            }
        });
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.clearBtn.addEventListener('click', () => this.clearLogs());
        
        if (this.scanModeCheckbox) {
            this.scanModeCheckbox.addEventListener('change', (e) => {
                this.scanMode = e.target.checked;
                if (this.scanStats) {
                    this.scanStats.style.display = e.target.checked ? 'block' : 'none';
                }
                this.connectBtn.textContent = e.target.checked ? 'Start Scanning' : 'Connect to Relay';
            });
        }
        
        if (this.autoRefreshCheckbox) {
            this.autoRefreshCheckbox.addEventListener('change', (e) => {
                this.autoRefresh = e.target.checked;
                if (this.autoRefresh && this.currentUrl) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Start connection time updater
        setInterval(() => this.updateConnectionTime(), 1000);
    }

    connect() {
        const url = this.relayUrl.value.trim();
        if (!url) {
            this.log('Error: Please enter a relay URL', 'error');
            return;
        }

        this.currentUrl = url;
        this.setStatus('connecting', 'Connecting...');
        this.connectBtn.disabled = true;

        try {
            this.ws = new WebSocket(url);
            this.ws.binaryType = 'arraybuffer';

            this.ws.onopen = () => {
                this.connected = true;
                this.startTime = Date.now();
                this.setStatus('connected', 'Connected');
                this.disconnectBtn.disabled = false;
                this.log(`Connected to ${url}`, 'handshake');

                // Send handshake in SNIFFER mode (0x69 - Ping/Query mode)
                this.sendSnifferHandshake();
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            this.ws.onerror = (error) => {
                this.log(`WebSocket Error: ${error.message || 'Unknown error'}`, 'error');
                this.stats.error++;
            };

            this.ws.onclose = (event) => {
                this.connected = false;
                this.connectBtn.disabled = false;
                this.disconnectBtn.disabled = true;
                
                if (event.code === 1000) {
                    // Normal closure - query completed
                    this.setStatus('disconnected', 'Query completed');
                    this.log(`Query completed successfully`, 'handshake');
                    
                    // Start auto-refresh if enabled
                    if (this.autoRefresh) {
                        this.startAutoRefresh();
                    }
                } else {
                    this.setStatus('disconnected', 'Disconnected');
                    this.log(`Connection closed: code=${event.code}, reason=${event.reason || 'None'}`, 'error');
                }
            };

        } catch (error) {
            this.log(`Connection failed: ${error.message}`, 'error');
            this.setStatus('disconnected', 'Disconnected');
            this.connectBtn.disabled = false;
        }
    }

    disconnect() {
        this.stopAutoRefresh();
        this.scanning = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.currentUrl = '';
    }

    generateRandomCode() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    startScan() {
        const url = this.relayUrl.value.trim();
        if (!url) {
            this.log('Error: Please enter a relay URL', 'error');
            return;
        }

        this.scanning = true;
        this.foundWorlds.clear();
        this.testedCodes = 0;
        this.scanStartTime = Date.now();
        this.currentUrl = url;
        this.connectBtn.disabled = true;
        this.disconnectBtn.disabled = false;
        
        this.log('🔍 Starting world scanner...', 'handshake');
        this.log('⚠️ This will test random join codes to find active worlds', 'handshake');
        
        this.scanNext();
    }

    scanNext() {
        if (!this.scanning) return;

        const code = this.generateRandomCode();
        this.testedCodes++;
        
        // Update stats
        const elapsed = (Date.now() - this.scanStartTime) / 1000;
        const speed = (this.testedCodes / elapsed).toFixed(1);
        
        if (document.getElementById('testedCount')) {
            document.getElementById('testedCount').textContent = this.testedCodes;
            document.getElementById('foundCount').textContent = this.foundWorlds.size;
            document.getElementById('scanSpeed').textContent = speed;
        }

        this.testCode(code);
    }

    testCode(code) {
        try {
            const ws = new WebSocket(this.currentUrl);
            ws.binaryType = 'arraybuffer';

            const timeout = setTimeout(() => {
                ws.close();
                if (this.scanning) {
                    setTimeout(() => this.scanNext(), 10);
                }
            }, 2000);

            ws.onopen = () => {
                // Send client handshake with test code
                const codeBytes = new TextEncoder().encode(code);
                const packet = new Uint8Array(4 + codeBytes.length);
                packet[0] = 0x00; // Handshake
                packet[1] = 0x02; // Client mode
                packet[2] = 0x01; // Version
                packet[3] = codeBytes.length;
                packet.set(codeBytes, 4);
                ws.send(packet.buffer);
            };

            ws.onmessage = (event) => {
                clearTimeout(timeout);
                const bytes = new Uint8Array(event.data);
                
                if (bytes[0] === 0xFF) {
                    // Error packet - world doesn't exist
                    ws.close();
                    if (this.scanning) {
                        setTimeout(() => this.scanNext(), 10);
                    }
                } else if (bytes[0] === 0x00 || bytes[0] === 0x01) {
                    // Success! World exists!
                    this.foundWorlds.add(code);
                    this.log(`✅ FOUND WORLD: ${code}`, 'client');
                    ws.close();
                    if (this.scanning) {
                        setTimeout(() => this.scanNext(), 10);
                    }
                }
            };

            ws.onerror = () => {
                clearTimeout(timeout);
                if (this.scanning) {
                    setTimeout(() => this.scanNext(), 10);
                }
            };

            ws.onclose = () => {
                clearTimeout(timeout);
            };

        } catch (error) {
            this.log(`Scan error: ${error.message}`, 'error');
            if (this.scanning) {
                setTimeout(() => this.scanNext(), 100);
            }
        }
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        const interval = parseInt(this.refreshIntervalInput?.value || 5) * 1000;
        
        this.refreshInterval = setInterval(() => {
            if (!this.connected && this.currentUrl) {
                this.log(`🔄 Auto-refreshing...`, 'handshake');
                this.connect();
            }
        }, interval);
        
        this.log(`✅ Auto-refresh enabled (every ${interval/1000}s)`, 'handshake');
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    sendSnifferHandshake() {
        // Send handshake in WORLDS LIST mode (type 0x04) to get all open worlds
        // Packet format: [0x00][type=0x04][version=0x01][code_length=0]
        const packet = new Uint8Array([
            0x00,  // Packet ID: Handshake
            0x04,  // Connection Type: Worlds List Query
            0x01,  // Protocol Version
            0x00   // Code length: 0 (empty string)
        ]);
        this.ws.send(packet.buffer);
        this.log(`Sent worlds list query (type=0x04) to relay server`, 'handshake');
        this.logRaw(`[${new Date().toISOString()}] Sent:\n${this.formatBytes(packet)}\n`);
    }

    sendHandshake(code) {
        // Packet format: [0x00][type][version][code_length][code_bytes]
        const connectionType = 0x02; // Client connection
        const version = 0x01;
        const codeBytes = new TextEncoder().encode(code);
        
        const packet = new Uint8Array(3 + 1 + codeBytes.length);
        packet[0] = 0x00; // Packet ID
        packet[1] = connectionType;
        packet[2] = version;
        packet[3] = codeBytes.length;
        packet.set(codeBytes, 4);
        
        this.ws.send(packet.buffer);
        this.log(`Sent handshake: type=${connectionType}, version=${version}, code="${code}"`, 'handshake');
        this.logRaw(`[${new Date().toISOString()}] Sent:\n${this.formatBytes(packet)}\n`);
    }

    handleMessage(data) {
        this.stats.totalPackets++;

        // Convert to Uint8Array
        const bytes = new Uint8Array(data);
        
        // Log raw data
        this.logRaw(`[${new Date().toISOString()}] Received:\n${this.formatBytes(bytes)}\n`);

        // Parse packet
        this.parsePacket(bytes);
        this.updateStats();
    }

    parsePacket(bytes) {
        if (bytes.length === 0) return;

        const packetId = bytes[0];
        let type = 'unknown';
        let details = '';

        switch (packetId) {
            case 0x00: // Handshake
                type = 'handshake';
                this.stats.handshake++;
                details = this.parseHandshake(bytes);
                break;
            case 0x01: // ICE Servers
                type = 'ice';
                this.stats.ice++;
                details = this.parseICEServers(bytes);
                break;
            case 0x02: // New Client
                type = 'client';
                this.stats.client++;
                details = this.parseNewClient(bytes);
                break;
            case 0x03: // ICE Candidate
                type = 'ice';
                this.stats.ice++;
                details = 'ICE Candidate received';
                break;
            case 0x04: // Description
                type = 'description';
                this.stats.description++;
                details = 'SDP Description received';
                break;
            case 0x05: // Client Success
                type = 'client';
                this.stats.client++;
                details = 'Client connection successful';
                break;
            case 0x06: // Client Failure
                type = 'client';
                this.stats.client++;
                details = 'Client connection failed';
                break;
            case 0x07: // Local Worlds List
                type = 'client';
                this.stats.client++;
                details = this.parseLocalWorlds(bytes);
                break;
            case 0x69: // Pong (Relay Info)
                type = 'handshake';
                this.stats.handshake++;
                details = this.parsePong(bytes);
                break;
            case 0xFE: // Disconnect Client
                type = 'error';
                this.stats.error++;
                details = this.parseDisconnect(bytes);
                break;
            case 0xFF: // Error Code
                type = 'error';
                this.stats.error++;
                details = this.parseError(bytes);
                break;
            default:
                details = `Unknown packet ID: 0x${packetId.toString(16).toUpperCase()}`;
        }

        this.log(`Packet 0x${packetId.toString(16).toUpperCase()}: ${details}`, type);
    }

    parseHandshake(bytes) {
        try {
            // Skip packet ID
            let offset = 1;
            const connectionType = bytes[offset++];
            const version = bytes[offset++];
            
            // Read connection code (ASCII-8)
            const codeLength = bytes[offset++];
            const code = String.fromCharCode(...bytes.slice(offset, offset + codeLength));
            
            return `Type: ${connectionType}, Version: ${version}, Code: ${code}`;
        } catch (e) {
            return 'Failed to parse handshake';
        }
    }

    parseICEServers(bytes) {
        try {
            let offset = 1;
            const count = bytes[offset++];
            return `Received ${count} ICE servers`;
        } catch (e) {
            return 'Failed to parse ICE servers';
        }
    }

    parseNewClient(bytes) {
        try {
            let offset = 1;
            const idLength = bytes[offset++];
            const clientId = String.fromCharCode(...bytes.slice(offset, offset + idLength));
            this.stats.clients.add(clientId);
            return `New client connected: ${clientId}`;
        } catch (e) {
            return 'Failed to parse new client';
        }
    }

    parseDisconnect(bytes) {
        try {
            let offset = 1;
            const idLength = bytes[offset++];
            const clientId = String.fromCharCode(...bytes.slice(offset, offset + idLength));
            offset += idLength;
            const code = bytes[offset++];
            return `Client ${clientId} disconnected with code ${code}`;
        } catch (e) {
            return 'Client disconnected';
        }
    }

    parseError(bytes) {
        try {
            let offset = 1;
            const errorCode = bytes[offset++];
            const descLength = (bytes[offset] << 8) | bytes[offset + 1];
            offset += 2;
            const description = String.fromCharCode(...bytes.slice(offset, offset + descLength));
            return `Error ${errorCode}: ${description}`;
        } catch (e) {
            return 'Error packet received';
        }
    }

    parsePong(bytes) {
        try {
            let offset = 1;
            const version = bytes[offset++];
            const commentLength = (bytes[offset] << 8) | bytes[offset + 1];
            offset += 2;
            const comment = String.fromCharCode(...bytes.slice(offset, offset + commentLength));
            offset += commentLength;
            const brand = String.fromCharCode(...bytes.slice(offset, offset + 4));
            offset += 4;
            const versionNum = (bytes[offset] << 8) | bytes[offset + 1];
            return `Relay Info - Version: ${version}, Comment: "${comment}", Brand: ${brand}, Ver: ${versionNum}`;
        } catch (e) {
            return 'Relay pong received';
        }
    }

    parseLocalWorlds(bytes) {
        try {
            let offset = 1;
            const count = bytes[offset++];
            
            this.log(`📊 Parsing ${count} worlds from relay...`, 'client');
            
            let worlds = [];
            for (let i = 0; i < count; i++) {
                // Read world name (ASCII-8: length byte + string)
                const nameLength = bytes[offset++];
                const name = new TextDecoder().decode(bytes.slice(offset, offset + nameLength));
                offset += nameLength;
                
                // Read world code (ASCII-8: length byte + string)
                const codeLength = bytes[offset++];
                const code = new TextDecoder().decode(bytes.slice(offset, offset + codeLength));
                offset += codeLength;
                
                worlds.push(`🌍 [${code}] "${name}"`);
                this.log(`  → Found: ${code} - "${name}"`, 'client');
            }
            
            if (count === 0) {
                return `📡 No worlds currently open on this relay`;
            }
            return `📡 FOUND ${count} WORLD${count > 1 ? 'S' : ''} ON RELAY:\n${worlds.join('\n')}`;
        } catch (e) {
            this.log(`Parse error: ${e.message}`, 'error');
            return `Local worlds list received (parse error: ${e.message})`;
        }
    }

    formatBytes(data) {
        if (data instanceof Blob) {
            return `Blob (${data.size} bytes)`;
        }
        if (typeof data === 'string') {
            return data;
        }
        let bytes;
        if (data instanceof Uint8Array) {
            bytes = data;
        } else if (data instanceof ArrayBuffer) {
            bytes = new Uint8Array(data);
        } else {
            return String(data);
        }
        
        // Format as hex with ASCII on the side
        let result = '';
        for (let i = 0; i < bytes.length; i += 16) {
            const chunk = bytes.slice(i, i + 16);
            const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
            const ascii = Array.from(chunk).map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
            result += `${i.toString(16).padStart(4, '0')}: ${hex.padEnd(48, ' ')} | ${ascii}\n`;
        }
        return result;
    }

    log(message, type = 'info') {
        const filters = {
            handshake: document.getElementById('filterHandshake').checked,
            ice: document.getElementById('filterICE').checked,
            description: document.getElementById('filterDescription').checked,
            client: document.getElementById('filterClient').checked,
            error: document.getElementById('filterError').checked
        };

        if (!filters[type] && type !== 'info') return;

        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        entry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-type">${type.toUpperCase()}</span>
            <div class="log-details">${message}</div>
        `;

        this.packetLog.appendChild(entry);
        this.packetLog.scrollTop = this.packetLog.scrollHeight;
    }

    logRaw(message) {
        this.rawLog.textContent += message + '\n';
        this.rawLog.scrollTop = this.rawLog.scrollHeight;
    }

    clearLogs() {
        this.packetLog.innerHTML = '';
        this.rawLog.textContent = '';
        this.stats = {
            totalPackets: 0,
            handshake: 0,
            ice: 0,
            description: 0,
            client: 0,
            error: 0,
            clients: new Set()
        };
        this.updateStats();
    }

    setStatus(state, text) {
        this.statusText.textContent = text;
        this.statusText.className = `status-${state}`;
    }

    updateStats() {
        document.getElementById('totalPackets').textContent = this.stats.totalPackets;
        document.getElementById('clientCount').textContent = this.stats.clients.size;
        document.getElementById('iceCount').textContent = this.stats.ice;
    }

    updateConnectionTime() {
        if (this.connected && this.startTime) {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('connectionTime').textContent = 
                `${minutes}m ${seconds}s`;
        } else {
            document.getElementById('connectionTime').textContent = '0s';
        }
    }

    switchTab(tabName) {
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }
}

// Initialize on page load
const sniffer = new RelaySniffer();

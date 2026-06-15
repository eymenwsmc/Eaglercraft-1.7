// Eaglercraft Relay List - Main Application
class RelayList {
    constructor() {
        this.servers = [];
        this.filteredServers = [];
        this.db = null;
        this.verificationQueue = [];
        this.isVerifying = false;
        
        this.initDB();
        this.initUI();
        this.loadServers();
        this.startAutoVerification();
    }

    // Initialize IndexedDB
    initDB() {
        const request = indexedDB.open('EaglercraftRelayList', 1);
        
        request.onerror = () => {
            console.error('Database failed to open');
            this.showError('Failed to initialize database');
        };
        
        request.onsuccess = () => {
            this.db = request.result;
            console.log('Database initialized successfully');
        };
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            
            if (!db.objectStoreNames.contains('servers')) {
                const objectStore = db.createObjectStore('servers', { keyPath: 'id', autoIncrement: true });
                objectStore.createIndex('joinCode', 'joinCode', { unique: true });
                objectStore.createIndex('relay', 'relay', { unique: false });
                objectStore.createIndex('status', 'status', { unique: false });
                objectStore.createIndex('addedAt', 'addedAt', { unique: false });
            }
        };
    }

    // Initialize UI
    initUI() {
        // Modal controls
        document.getElementById('addServerBtn').addEventListener('click', () => this.openModal());
        document.getElementById('addServerForm').addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Search and filters
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('relayFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('sortFilter').addEventListener('change', () => this.applyFilters());
        
        // Join code input - force lowercase
        document.getElementById('joinCode').addEventListener('input', (e) => {
            e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
        });
    }

    // Load servers from database
    async loadServers() {
        if (!this.db) {
            setTimeout(() => this.loadServers(), 100);
            return;
        }

        const transaction = this.db.transaction(['servers'], 'readonly');
        const objectStore = transaction.objectStore('servers');
        const request = objectStore.getAll();

        request.onsuccess = () => {
            this.servers = request.result;
            this.applyFilters();
            this.updateStats();
            document.getElementById('loadingState').style.display = 'none';
        };

        request.onerror = () => {
            console.error('Failed to load servers');
            document.getElementById('loadingState').style.display = 'none';
            this.showEmptyState();
        };
    }

    // Add server to database
    async addServer(serverData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['servers'], 'readwrite');
            const objectStore = transaction.objectStore('servers');
            
            const server = {
                name: serverData.name,
                description: serverData.description,
                joinCode: serverData.joinCode,
                relay: serverData.relay,
                addedAt: Date.now(),
                lastVerified: Date.now(),
                status: serverData.status || 'verifying',
                players: serverData.players || 0
            };

            const request = objectStore.add(server);

            request.onsuccess = () => {
                server.id = request.result;
                this.servers.push(server);
                this.applyFilters();
                this.updateStats();
                resolve(server);
            };

            request.onerror = () => {
                reject(new Error('Failed to add server to database'));
            };
        });
    }

    // Update server in database
    async updateServer(id, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['servers'], 'readwrite');
            const objectStore = transaction.objectStore('servers');
            const request = objectStore.get(id);

            request.onsuccess = () => {
                const server = request.result;
                if (!server) {
                    reject(new Error('Server not found'));
                    return;
                }

                Object.assign(server, updates);
                const updateRequest = objectStore.put(server);

                updateRequest.onsuccess = () => {
                    const index = this.servers.findIndex(s => s.id === id);
                    if (index !== -1) {
                        this.servers[index] = server;
                    }
                    this.applyFilters();
                    this.updateStats();
                    resolve(server);
                };

                updateRequest.onerror = () => {
                    reject(new Error('Failed to update server'));
                };
            };
        });
    }

    // Delete server from database
    async deleteServer(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['servers'], 'readwrite');
            const objectStore = transaction.objectStore('servers');
            const request = objectStore.delete(id);

            request.onsuccess = () => {
                this.servers = this.servers.filter(s => s.id !== id);
                this.applyFilters();
                this.updateStats();
                resolve();
            };

            request.onerror = () => {
                reject(new Error('Failed to delete server'));
            };
        });
    }

    // Verify server by connecting to relay
    async verifyServer(server) {
        return new Promise((resolve) => {
            try {
                const ws = new WebSocket(server.relay);
                ws.binaryType = 'arraybuffer';
                let verified = false;
                let playerCount = 0;

                const timeout = setTimeout(() => {
                    ws.close();
                    resolve({ online: false, players: 0 });
                }, 5000);

                ws.onopen = () => {
                    // Send client handshake to verify server exists
                    const codeBytes = new TextEncoder().encode(server.joinCode);
                    const packet = new Uint8Array(4 + codeBytes.length);
                    packet[0] = 0x00; // Handshake
                    packet[1] = 0x02; // Client mode
                    packet[2] = 0x01; // Version
                    packet[3] = codeBytes.length;
                    packet.set(codeBytes, 4);
                    ws.send(packet.buffer);
                };

                ws.onmessage = (event) => {
                    const bytes = new Uint8Array(event.data);
                    
                    // Check packet type
                    if (bytes[0] === 0xFF) {
                        // Error packet - server offline or doesn't exist
                        clearTimeout(timeout);
                        ws.close();
                        resolve({ online: false, players: 0 });
                    } else if (bytes[0] === 0x00 || bytes[0] === 0x01) {
                        // Success - server exists (0x00 = handshake, 0x01 = ICE servers)
                        verified = true;
                        
                        // Note: Relay protocol doesn't provide player count
                        // We keep the existing count or default to 1
                        playerCount = server.players || 1;
                        
                        clearTimeout(timeout);
                        ws.close();
                        resolve({ online: true, players: playerCount });
                    } else if (bytes[0] === 0x02) {
                        // New client packet - someone is connecting
                        playerCount++;
                    }
                };

                ws.onerror = () => {
                    clearTimeout(timeout);
                    resolve({ online: false, players: 0 });
                };

                ws.onclose = () => {
                    clearTimeout(timeout);
                    if (!verified) {
                        resolve({ online: false, players: 0 });
                    }
                };

            } catch (error) {
                console.error('Verification error:', error);
                resolve({ online: false, players: 0 });
            }
        });
    }

    // Start automatic verification loop
    startAutoVerification() {
        // Verify all servers every 30 seconds (more frequent updates)
        setInterval(() => {
            this.verifyAllServers();
        }, 30000);

        // Initial verification after 2 seconds
        setTimeout(() => this.verifyAllServers(), 2000);
        
        console.log('Auto-verification started (every 30 seconds)');
    }

    // Verify all servers
    async verifyAllServers() {
        if (this.isVerifying) {
            console.log('Verification already in progress, skipping...');
            return;
        }
        this.isVerifying = true;

        console.log(`🔄 Starting verification for ${this.servers.length} servers...`);

        let verified = 0;
        let failed = 0;

        for (const server of this.servers) {
            const result = await this.verifyServer(server);
            
            const updates = {
                status: result.online ? 'online' : 'offline',
                players: result.players,
                lastVerified: Date.now()
            };

            await this.updateServer(server.id, updates);

            if (result.online) {
                verified++;
                console.log(`✅ ${server.name} - Online (${result.players} players)`);
            } else {
                failed++;
                console.log(`❌ ${server.name} - Offline`);
                
                // Delete if offline for more than 10 minutes
                if (Date.now() - server.addedAt > 600000) {
                    console.log(`🗑️ Removing offline server: ${server.name}`);
                    await this.deleteServer(server.id);
                }
            }

            // Small delay between verifications to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.isVerifying = false;
        console.log(`✅ Verification complete: ${verified} online, ${failed} offline`);
    }

    // Handle form submission
    async handleSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const submitSpinner = document.getElementById('submitSpinner');
        const formError = document.getElementById('formError');
        const formSuccess = document.getElementById('formSuccess');

        // Hide previous messages
        formError.style.display = 'none';
        formSuccess.style.display = 'none';

        // Get form data
        const serverData = {
            name: document.getElementById('serverName').value.trim(),
            description: document.getElementById('serverDescription').value.trim(),
            joinCode: document.getElementById('joinCode').value.trim().toLowerCase(),
            relay: document.getElementById('relayServer').value,
            manualPlayerCount: 1 // Default to 1 player
        };

        // Validate
        if (!serverData.name || !serverData.description || !serverData.joinCode || !serverData.relay) {
            this.showFormError('Please fill in all required fields');
            return;
        }

        if (serverData.joinCode.length !== 5) {
            this.showFormError('Join code must be exactly 5 characters');
            return;
        }

        // Check for duplicate
        const duplicate = this.servers.find(s => s.joinCode === serverData.joinCode && s.relay === serverData.relay);
        if (duplicate) {
            this.showFormError('This server is already in the list');
            return;
        }

        // Disable submit button
        submitBtn.disabled = true;
        submitText.textContent = 'Verifying server...';
        submitSpinner.style.display = 'inline-block';

        try {
            // Verify server exists
            const verification = await this.verifyServer(serverData);
            
            if (!verification.online) {
                this.showFormError('Server verification failed. Make sure the server is online and the join code is correct.');
                submitBtn.disabled = false;
                submitText.textContent = 'Verify & Add Server';
                submitSpinner.style.display = 'none';
                return;
            }

            // Add to database with verified status
            const newServer = await this.addServer({
                ...serverData,
                status: 'online',
                players: serverData.manualPlayerCount || verification.players
            });

            // Show success
            formSuccess.textContent = '✅ Server added successfully!';
            formSuccess.style.display = 'block';

            // Reset form
            document.getElementById('addServerForm').reset();

            // Close modal after 2 seconds
            setTimeout(() => {
                this.closeModal();
            }, 2000);

        } catch (error) {
            console.error('Error adding server:', error);
            this.showFormError(error.message || 'Failed to add server. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitText.textContent = 'Verify & Add Server';
            submitSpinner.style.display = 'none';
        }
    }

    // Show form error
    showFormError(message) {
        const formError = document.getElementById('formError');
        formError.textContent = '❌ ' + message;
        formError.style.display = 'block';
    }

    // Apply search and filters
    handleSearch(query) {
        this.searchQuery = query.toLowerCase();
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.servers];

        // Search filter
        if (this.searchQuery) {
            filtered = filtered.filter(server => 
                server.name.toLowerCase().includes(this.searchQuery) ||
                server.description.toLowerCase().includes(this.searchQuery) ||
                server.joinCode.toLowerCase().includes(this.searchQuery)
            );
        }

        // Relay filter
        const relayFilter = document.getElementById('relayFilter').value;
        if (relayFilter !== 'all') {
            filtered = filtered.filter(server => server.relay === relayFilter);
        }

        // Sort
        const sortFilter = document.getElementById('sortFilter').value;
        switch (sortFilter) {
            case 'players':
                filtered.sort((a, b) => b.players - a.players);
                break;
            case 'newest':
                filtered.sort((a, b) => b.addedAt - a.addedAt);
                break;
            case 'name':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
        }

        this.filteredServers = filtered;
        this.renderServers();
    }

    // Render server cards
    renderServers() {
        const grid = document.getElementById('serverGrid');
        const emptyState = document.getElementById('emptyState');

        if (this.filteredServers.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        emptyState.style.display = 'none';

        grid.innerHTML = this.filteredServers.map(server => `
            <div class="server-card" onclick="app.showServerDetails(${server.id})">
                <div class="server-header">
                    <div>
                        <h3 class="server-name">${this.escapeHtml(server.name)}</h3>
                        <span class="server-status status-${server.status}">
                            <span class="status-dot"></span>
                            ${server.status === 'online' ? 'Online' : server.status === 'offline' ? 'Offline' : 'Verifying...'}
                        </span>
                    </div>
                </div>
                
                <p class="server-description">${this.escapeHtml(server.description)}</p>
                
                <div class="server-info">
                    <div class="info-item">
                        <span class="info-icon">👥</span>
                        <span>${server.players || 0} players</span>
                    </div>
                    <div class="info-item">
                        <span class="info-icon">📡</span>
                        <span>${this.getRelayName(server.relay)}</span>
                    </div>
                </div>
                
                <div class="server-footer">
                    <span class="join-code">${server.joinCode}</span>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">
                        ${this.getTimeAgo(server.addedAt)}
                    </span>
                </div>
            </div>
        `).join('');
    }

    // Show server details modal
    showServerDetails(id) {
        const server = this.servers.find(s => s.id === id);
        if (!server) return;

        document.getElementById('detailsServerName').textContent = server.name;
        document.getElementById('detailsDescription').textContent = server.description;
        document.getElementById('detailsJoinCode').textContent = server.joinCode;
        document.getElementById('detailsJoinCodeStep').textContent = server.joinCode;
        document.getElementById('detailsRelay').textContent = server.relay;
        document.getElementById('detailsPlayers').textContent = server.players || 0;
        document.getElementById('detailsAdded').textContent = this.getTimeAgo(server.addedAt);
        document.getElementById('detailsStatus').textContent = server.status === 'online' ? '✅ Online' : '❌ Offline';

        // Store current server for copy function
        window.currentServerCode = server.joinCode;

        document.getElementById('serverDetailsModal').classList.add('active');
    }

    // Update statistics
    updateStats() {
        const onlineServers = this.servers.filter(s => s.status === 'online');
        const totalPlayers = this.servers.reduce((sum, s) => sum + (s.players || 0), 0);

        document.getElementById('totalServers').textContent = onlineServers.length;
        document.getElementById('totalPlayers').textContent = totalPlayers;
    }

    // Utility functions
    getRelayName(url) {
        if (url.includes('deev.is')) return 'deev.is';
        if (url.includes('lax1dude.net')) return 'lax1dude.net';
        if (url.includes('shhnowisnottheti.me')) return 'ayunami';
        return 'Custom';
    }

    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showEmptyState() {
        document.getElementById('serverGrid').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
    }

    // Modal controls
    openModal() {
        document.getElementById('addServerModal').classList.add('active');
    }

    closeModal() {
        document.getElementById('addServerModal').classList.remove('active');
        document.getElementById('addServerForm').reset();
        document.getElementById('formError').style.display = 'none';
        document.getElementById('formSuccess').style.display = 'none';
    }
}

// Global functions for modal controls
function closeModal() {
    app.closeModal();
}

function closeDetailsModal() {
    document.getElementById('serverDetailsModal').classList.remove('active');
}

function copyJoinCode() {
    const code = window.currentServerCode;
    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
        const btn = event.target.closest('.btn-copy');
        const originalText = btn.textContent;
        btn.textContent = '✅';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new RelayList();
});

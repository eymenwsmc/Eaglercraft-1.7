// Eaglercraft Relay List - Supabase Version
// Replace these with your Supabase credentials
const SUPABASE_URL = 'https://comfaedujnmjfcbwzbbe.supabase.co'; // e.g., https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvbWZhZWR1am5tamZjYnd6YmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjQ2NzMsImV4cCI6MjA3NjM0MDY3M30.WKb3aWFWEkxxwjC3jGkZPvBlDOZtsbr1H3OYnsiH17Q';

class RelayList {
    constructor() {
        this.servers = [];
        this.filteredServers = [];
        this.supabase = null;
        this.verificationQueue = [];
        this.isVerifying = false;
        this.realtimeSubscription = null;
        
        this.initSupabase();
        this.initUI();
        this.loadServers();
        this.startAutoVerification();
        this.setupRealtimeUpdates();
    }

    // Initialize Supabase client
    initSupabase() {
        if (!window.supabase) {
            console.error('Supabase client not loaded. Please include the Supabase JS library.');
            this.showError('Failed to initialize database connection');
            return;
        }

        this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized');
    }

    // Setup realtime updates
    setupRealtimeUpdates() {
        if (!this.supabase) return;

        // Subscribe to changes in servers table
        this.realtimeSubscription = this.supabase
            .channel('servers-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'servers' },
                (payload) => {
                    console.log('🔄 Database change detected:', payload);
                    this.handleRealtimeUpdate(payload);
                }
            )
            .subscribe();

        console.log('✅ Realtime updates enabled');
    }

    // Handle realtime database updates
    handleRealtimeUpdate(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        switch (eventType) {
            case 'INSERT':
                // New server added
                this.servers.push(newRecord);
                console.log('➕ New server added:', newRecord.name);
                break;
            
            case 'UPDATE':
                // Server updated
                const updateIndex = this.servers.findIndex(s => s.id === newRecord.id);
                if (updateIndex !== -1) {
                    this.servers[updateIndex] = newRecord;
                    console.log('🔄 Server updated:', newRecord.name);
                }
                break;
            
            case 'DELETE':
                // Server deleted
                this.servers = this.servers.filter(s => s.id !== oldRecord.id);
                console.log('🗑️ Server removed:', oldRecord.name);
                break;
        }

        this.applyFilters();
        this.updateStats();
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

    // Load servers from Supabase
    async loadServers() {
        if (!this.supabase) {
            setTimeout(() => this.loadServers(), 100);
            return;
        }

        try {
            const { data, error } = await this.supabase
                .from('servers')
                .select('*')
                .order('players', { ascending: false });

            if (error) throw error;

            this.servers = data || [];
            this.applyFilters();
            this.updateStats();
            document.getElementById('loadingState').style.display = 'none';
            
            console.log(`✅ Loaded ${this.servers.length} servers from database`);
        } catch (error) {
            console.error('Failed to load servers:', error);
            document.getElementById('loadingState').style.display = 'none';
            this.showEmptyState();
        }
    }

    // Add server to Supabase
    async addServer(serverData) {
        try {
            const { data, error } = await this.supabase
                .from('servers')
                .insert([{
                    name: serverData.name,
                    description: serverData.description,
                    join_code: serverData.joinCode,
                    relay: serverData.relay,
                    players: serverData.players || 1,
                    status: serverData.status || 'online',
                    last_verified: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                // Check for duplicate
                if (error.code === '23505') {
                    throw new Error('This server is already in the list');
                }
                throw error;
            }

            console.log('✅ Server added to database:', data.name);
            return data;
        } catch (error) {
            console.error('Failed to add server:', error);
            throw error;
        }
    }

    // Update server in Supabase
    async updateServer(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('servers')
                .update({
                    ...updates,
                    last_verified: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Failed to update server:', error);
            throw error;
        }
    }

    // Delete server from Supabase
    async deleteServer(id) {
        try {
            const { error } = await this.supabase
                .from('servers')
                .delete()
                .eq('id', id);

            if (error) throw error;

            console.log('🗑️ Server deleted from database');
        } catch (error) {
            console.error('Failed to delete server:', error);
            throw error;
        }
    }

    // Verify server by connecting to relay
    async verifyServer(server) {
        return new Promise((resolve) => {
            try {
                const ws = new WebSocket(server.relay);
                ws.binaryType = 'arraybuffer';
                let verified = false;
                let playerCount = server.players || 1;

                const timeout = setTimeout(() => {
                    ws.close();
                    resolve({ online: false, players: 0 });
                }, 5000);

                ws.onopen = () => {
                    // Send client handshake to verify server exists
                    const codeBytes = new TextEncoder().encode(server.join_code || server.joinCode);
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
                    
                    if (bytes[0] === 0xFF) {
                        // Error packet - server offline
                        clearTimeout(timeout);
                        ws.close();
                        resolve({ online: false, players: 0 });
                    } else if (bytes[0] === 0x00 || bytes[0] === 0x01) {
                        // Success - server exists
                        verified = true;
                        clearTimeout(timeout);
                        ws.close();
                        resolve({ online: true, players: playerCount });
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
        // Verify all servers every 30 seconds
        setInterval(() => {
            this.verifyAllServers();
        }, 30000);

        // Initial verification after 5 seconds
        setTimeout(() => this.verifyAllServers(), 5000);
        
        console.log('✅ Auto-verification started (every 30 seconds)');
    }

    // Verify all servers
    async verifyAllServers() {
        if (this.isVerifying) {
            console.log('⏭️ Verification already in progress, skipping...');
            return;
        }
        this.isVerifying = true;

        console.log(`🔄 Starting verification for ${this.servers.length} servers...`);

        let verified = 0;
        let failed = 0;

        for (const server of this.servers) {
            const result = await this.verifyServer(server);
            
            try {
                if (result.online) {
                    // Server is online - update status and reset offline timestamp
                    await this.updateServer(server.id, {
                        status: 'online',
                        players: result.players
                    });
                    verified++;
                    console.log(`✅ ${server.name} - Online (${result.players} players)`);
                } else {
                    // Server is offline
                    failed++;
                    
                    // If server was previously online, mark it as offline now
                    if (server.status === 'online') {
                        await this.updateServer(server.id, {
                            status: 'offline',
                            players: 0
                        });
                        console.log(`❌ ${server.name} - Just went offline, will be removed in 10 minutes`);
                    } else {
                        // Server was already offline, check how long
                        const lastVerified = new Date(server.last_verified).getTime();
                        const offlineTime = Date.now() - lastVerified;
                        
                        if (offlineTime > 600000) { // 10 minutes = 600000ms
                            console.log(`🗑️ Removing offline server (offline for ${Math.floor(offlineTime/60000)} minutes): ${server.name}`);
                            await this.deleteServer(server.id);
                        } else {
                            // Update last_verified but keep offline status
                            await this.updateServer(server.id, {
                                status: 'offline',
                                players: 0
                            });
                            console.log(`⏳ ${server.name} - Offline for ${Math.floor(offlineTime/60000)} minutes (will delete after 10 min)`);
                        }
                    }
                }
            } catch (error) {
                console.error(`Failed to update server ${server.name}:`, error);
            }

            // Small delay between verifications
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

        formError.style.display = 'none';
        formSuccess.style.display = 'none';

        // Get form data
        const serverData = {
            name: document.getElementById('serverName').value.trim(),
            description: document.getElementById('serverDescription').value.trim(),
            joinCode: document.getElementById('joinCode').value.trim().toLowerCase(),
            relay: document.getElementById('relayServer').value,
            players: 1 // Default to 1 player
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

            // Add to database
            await this.addServer({
                ...serverData,
                status: 'online',
                players: serverData.players
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
                (server.join_code || server.joinCode).toLowerCase().includes(this.searchQuery)
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
                filtered.sort((a, b) => new Date(b.added_at) - new Date(a.added_at));
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
            <div class="server-card" onclick="app.showServerDetails('${server.id}')">
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
                    <span class="join-code">${server.join_code || server.joinCode}</span>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">
                        ${this.getTimeAgo(new Date(server.added_at).getTime())}
                    </span>
                </div>
            </div>
        `).join('');
    }

    // Show server details modal
    showServerDetails(id) {
        const server = this.servers.find(s => s.id === id);
        if (!server) return;

        const joinCode = server.join_code || server.joinCode;

        document.getElementById('detailsServerName').textContent = server.name;
        document.getElementById('detailsDescription').textContent = server.description;
        document.getElementById('detailsJoinCode').textContent = joinCode;
        document.getElementById('detailsJoinCodeStep').textContent = joinCode;
        document.getElementById('detailsRelay').textContent = server.relay;
        document.getElementById('detailsPlayers').textContent = server.players || 0;
        document.getElementById('detailsAdded').textContent = this.getTimeAgo(new Date(server.added_at).getTime());
        document.getElementById('detailsStatus').textContent = server.status === 'online' ? '✅ Online' : '❌ Offline';

        window.currentServerCode = joinCode;

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

// Global functions
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

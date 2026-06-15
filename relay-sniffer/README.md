# Eaglercraft Relay Sniffer

A web-based tool for monitoring and analyzing Eaglercraft relay server connections.

## Features

- **Real-time packet monitoring** - See all packets sent/received from relay servers
- **Packet filtering** - Filter by packet type (Handshake, ICE, Description, Client events, Errors)
- **Statistics dashboard** - Track connection time, packet counts, and client connections
- **Raw data view** - View raw binary data in hexadecimal format
- **Modern UI** - Clean, responsive design with dark theme logs

## Usage

1. Open `index.html` in a web browser
2. Enter the relay server URL (e.g., `wss://relay.deev.is`)
3. Optionally enter a join code
4. Click "Connect to Relay"
5. Monitor packets in real-time

## Packet Types

The sniffer recognizes the following Eaglercraft relay packet types:

- **0x00** - Handshake
- **0x01** - ICE Servers
- **0x02** - New Client
- **0x03** - ICE Candidate
- **0x04** - Description (SDP)
- **0x05** - Client Success
- **0x06** - Client Failure
- **0xFE** - Disconnect Client
- **0xFF** - Error Code

## Tabs

- **Packets** - Filtered packet log with timestamps and details
- **Statistics** - Connection metrics and packet breakdown
- **Raw Data** - Hexadecimal dump of all received data

## Browser Compatibility

Works in all modern browsers that support WebSockets:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## Notes

- This tool is for debugging and analysis purposes only
- Some relay servers may have rate limiting or security measures
- CORS policies may prevent connections to certain relay servers

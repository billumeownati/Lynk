# Lynk

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Try_It_Now-brightgreen.svg)](https://lynk.debz.in)

Lynk is an open-source, ephemeral communication platform. It features end-to-end encrypted text chat, peer-to-peer voice channels, and screen sharing. It requires no database, stores no chat logs, and is designed to run efficiently on a single Node.js instance.

## Features

* **End-to-End Encrypted Chat:** Text messages are encrypted client-side using AES (`crypto-js`). The encryption key is either the room code or a custom password. Keys never touch the server.
* **Peer-to-Peer Voice & Video Chat:** WebRTC mesh networking for direct, low-latency audio and video communication. Includes dynamic tiled video grids, pinning to focus on specific users, and local mute/deafen controls.
* **Live Screen Sharing:** Native display capture integrated directly into the WebRTC stream. Includes resolution quality selection, a floating mini-player UI, and full-screen support.
* **Hardware Management:** Built-in settings modal to hot-swap cameras, microphones, and speaker outputs on the fly. 
* **Ephemeral & Anonymous:** No user accounts, no database, and no persistent state. Once a room is empty, it ceases to exist.
* **Progressive Web App (PWA):** Fully installable on mobile and desktop with offline caching and a custom animated boot screen.
* **Glassmorphism UI:** Built with Tailwind CSS, featuring fully responsive light and dark modes.

## Tech Stack

* **Backend:** Node.js, Express, Socket.io
* **Frontend:** Vanilla JS, HTML5, Tailwind CSS
* **Protocols:** WebRTC (Voice/Video), WebSocket (Signaling/Text)
* **Security:** Crypto.js (AES-256)

## Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v16 or higher recommended)
* A modern web browser

### Local Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/billumeownati/Lynk.git
   cd Lynk
   ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Start the server (runs on port 3000 by default):
   ```bash
   npm start
    ```
4. Open your browser and navigate to:
    ```plaintext
    http://localhost:3000
    ```

> **Note on WebRTC:** Browser security policies require WebRTC (microphone and screen sharing APIs) to run in a secure context. This means it will only work on `localhost` or over a valid `https://` connection.

## Deployment

Lynk is configured to run out-of-the-box on platforms like Render, Heroku, or Railway.

1. Connect your repository to your hosting provider.
2. Set the build command to `npm install`.
3. Set the start command to `npm start` (or `node server.js`).
4. Ensure the platform is routing web traffic to the port exposed by `process.env.PORT`.

*Note: If using free-tier hosting that spins down during inactivity, the included `index.html` loading screen will automatically poll the `/health` endpoint and route users to the app once the server wakes up.*

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0). See the [LICENSE](LICENSE) file for details.

---
*Maintained by BiLLuMiNaTi*

# JuroBot - Mineflayer Minecraft Bot

JuroBot is a feature-rich Minecraft bot built with Node.js and Mineflayer. It features deep integration between Minecraft, Discord, and a MariaDB/MySQL database, including a live web-based dashboard.

## 🚀 Features

- **Minecraft Integration:** Connects via `mineflayer` (tested on 1.21.1).
- **Discord Bridge:** Bi-directional chat mirroring and remote command execution.
- **Database Tracking:** Logs player activity, deaths, chat messages, and manages a persistent rank system.
- **Web Dashboard:**
    - Live Minimap (128-block radius).
    - Detailed Player Info (health, equipment, durability).
    - Bot Status (ping, health, uptime, inventory).
    - Remote Command Console.
- **Automation:** 
    - **Drop Cycles:** Automatically clears inventory while protecting "keeplist" items.
    - **Inventory Monitor:** Alerts Discord when high-value items are acquired.
- **In-Game Games:** Includes a functional 5-letter Wordle game.

## 🛠️ Requirements

- **Node.js:** v16 or higher.
- **Database:** MariaDB or MySQL (required for persistence).

## 📦 Installation

1.  **Clone or Download** this release folder.
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Database Setup:**
    Create a database (default: `jurobot`) and user. The bot will automatically create the required tables on its first run.
4.  **Configuration:**
    Rename or edit `config.json` with your credentials:
    - Minecraft host, account (Microsoft auth supported), and version.
    - Database connection details.
    - Discord Bot Token, Guild ID, and Channel IDs for the bridge.
    - `web_port` for the dashboard (default: 3000).

## 🚦 Running the Bot

Use the provided shell script for stable execution. It handles auto-restarts and suppresses common network noise:

```bash
chmod +x run-bot.sh
./run-bot.sh
```

## 📜 Management

- **Rank System:** Permissions: `owner` > `admin` > `trusted` > `player`.
- **Item Protection:** Add items to `items.json` to prevent them from being dropped during cleaning cycles.
- **Web Interface:** Access the dashboard at `http://your-server-ip:3000`.

---
*Created for the community by Juro.*
# jurobot

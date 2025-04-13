# Aveum Network Mining Bot

A CLI-based monitoring and automation tool for the Aveum Network blockchain airdrop campaign. This bot automatically manages your Aveum Network mining session, ensuring you receive maximum rewards with minimal intervention.

## Features

- **Automatic Mining**: Starts and maintains the mining process without manual intervention
- **Real-time Monitoring**: Displays current mining status, rewards, and user information
- **Auto-reconnect**: Handles authentication issues and automatically reconnects
- **Ban Status Checking**: Monitors your account's ban status
- **Device Rotation**: Uses random device information for each login to prevent flagging

## Prerequisites

- Node.js v14+ installed
- npm or yarn package manager
- An active Aveum Network account

## Installation

1. Clone the repository:
```bash
git clone https://github.com/airdropinsiders/Aveum-Network-Bot.git
```

2. Navigate to the project directory:
```bash
cd Aveum-Network-Bot
```

3. Install dependencies:
```bash
npm install
```

4. Set up your credentials:
```bash
# Edit the .env file with your Aveum Network account details
nano .env
```

## Configuration

Create a `.env` file in the project root directory with the following content:

```
AVEUM_EMAIL=youremail@gmail.com
AVEUM_PASSWORD=yourpassword
```

Replace the placeholder values with your actual Aveum Network credentials.

## Usage

Run the bot with the following command:

```bash
node index.js
```

### Controls

- **q**: Quit the application
- **r**: Refresh authentication token

## User Interface

The terminal UI consists of four main areas:

1. **User Information**: Displays your username, email, total reward, and ban status
2. **Mining Status**: Shows current mining activity, rewards, and time information
3. **Logs**: Real-time logging of bot activities and events
4. **Controls**: Information about available keyboard shortcuts

## Security Notes

- Your credentials are stored locally in the `.env` file and are only used to authenticate with the Aveum Network API
- The bot uses random device profiles on each login to reduce the risk of account flagging
- This tool is intended for educational purposes and personal use only

## Troubleshooting

### Common Issues

- **Authentication Failed**: Verify your email and password in the `.env` file
- **Mining Not Starting**: Check your account status on the official Aveum Network platform
- **Connection Errors**: Verify your internet connection and try again

## Disclaimer

This tool is not affiliated with, authorized by, or endorsed by Aveum Network. Use at your own risk. The developers are not responsible for any account restrictions or bans that may result from using this software.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Credits

Developed by Airdrop Insiders
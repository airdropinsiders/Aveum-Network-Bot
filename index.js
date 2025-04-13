const fs = require('fs');
const axios = require('axios');
const blessed = require('blessed');
const colors = require('colors');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

const API_BASE_URL = 'https://api.aveum.io';
const API_ENDPOINTS = {
  login: '/users/login',
  startHub: '/users/start-hub',
  stopHub: '/users/stop-hub',
  hubStatus: '/users/hub-status',
  profile: '/users/profile',
  checkBan: '/users/check-ban'
};

const ANDROID_DEVICE_MODELS = [
  'SM-G9750', 'SM-G988B', 'SM-G973F', 'SM-G975F', 'SM-N975F',
  'SM-A515F', 'SM-A715F', 'SM-A516B', 'SM-A526B', 'SM-A536E',
  'Pixel 6', 'Pixel 6 Pro', 'Pixel 7', 'Pixel 7 Pro', 'Pixel 8',
  'OnePlus 9', 'OnePlus 10 Pro', 'OnePlus 11', 'OnePlus Nord 3',
  'Redmi Note 12', 'Redmi Note 11', 'POCO F5', 'POCO X5 Pro',
  'Vivo X90', 'Vivo V25', 'Vivo Y35', 'Oppo Reno 8', 'Oppo Find X5'
];

const ANDROID_VERSIONS = ['31', '32', '33', '34'];

function generateRandomDeviceId() {
  return crypto.randomBytes(8).toString('hex');
}

function getRandomDeviceModel() {
  return ANDROID_DEVICE_MODELS[Math.floor(Math.random() * ANDROID_DEVICE_MODELS.length)];
}

function getRandomAndroidVersion() {
  return ANDROID_VERSIONS[Math.floor(Math.random() * ANDROID_VERSIONS.length)];
}

const getHeaders = (token = null) => {
  const headers = {
    'User-Agent': 'okhttp/4.9.2',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip',
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

const getLoginPayload = () => {
  const deviceId = generateRandomDeviceId();
  const deviceModel = getRandomDeviceModel();
  const platformVersion = getRandomAndroidVersion();
  
  logMessage(`Using random device: ${deviceModel} (ID: ${deviceId}, Android ${platformVersion})`, 'info');
  
  return {
    email: process.env.AVEUM_EMAIL,
    password: process.env.AVEUM_PASSWORD,
    language: "en",
    device_id: deviceId,
    device_model: deviceModel,
    platform: "android",
    platform_version: platformVersion,
    version: "1.0.25",
    ip_address: "180.249.164.195"
  };
};

function formatTimeRemaining(hours) {
  const totalSeconds = Math.floor(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const auth = {
  token: null,
  
  async login() {
    try {
      logMessage('Logging in to Aveum...', 'info');
      
      if (!process.env.AVEUM_EMAIL || !process.env.AVEUM_PASSWORD) {
        logMessage('Error: Missing email or password in .env file!', 'error');
        process.exit(1);
      }
      
      const response = await axios.post(
        `${API_BASE_URL}${API_ENDPOINTS.login}`, 
        getLoginPayload(), 
        { headers: getHeaders() }
      );
      
      this.token = response.data.token;
      logMessage('Login successful! Token received.', 'success');
      return true;
    } catch (error) {
      logMessage(`Login failed: ${error.message}`, 'error');
      if (error.response) {
        logMessage(`Response data: ${JSON.stringify(error.response.data)}`, 'error');
      }
      return false;
    }
  },
  
  getToken() {
    return this.token;
  },
  
  isAuthenticated() {
    return !!this.token;
  }
};

async function getUserProfile() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}${API_ENDPOINTS.profile}`, 
      { headers: getHeaders(auth.getToken()) }
    );
    return response.data;
  } catch (error) {
    logMessage('Error fetching user profile: ' + error.message, 'error');
    return null;
  }
}

async function checkUserBan() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}${API_ENDPOINTS.checkBan}`, 
      { headers: getHeaders(auth.getToken()) }
    );
    return response.data;
  } catch (error) {
    logMessage('Error checking ban status: ' + error.message, 'error');
    return { banned: false };
  }
}

async function startHubMining() {
  try {
    const response = await axios.post(
      `${API_BASE_URL}${API_ENDPOINTS.startHub}`, 
      {}, 
      { headers: getHeaders(auth.getToken()) }
    );
    logMessage('✅ Hub mining started successfully!', 'success');
    logMessage(`Start time: ${response.data.startTime}`, 'info');
    return response.data;
  } catch (error) {
    logMessage('❌ Error starting hub mining: ' + error.message, 'error');
    if (error.response) {
      logMessage('Response data: ' + JSON.stringify(error.response.data), 'error');
    }
    return null;
  }
}

async function getHubStatus() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}${API_ENDPOINTS.hubStatus}`, 
      { headers: getHeaders(auth.getToken()) }
    );
    return response.data;
  } catch (error) {
    logMessage('Error fetching hub status: ' + error.message, 'error');
    return null;
  }
}

const screen = blessed.screen({
  smartCSR: true,
  title: 'Aveum Mining Bot'
});

const headerBox = blessed.box({
  top: 0,
  left: 0,
  width: '100%',
  height: 3,
  content: '{center}AVEUM MINING BOT - AIRDROP INSIDERS{/center}',
  tags: true,
  style: {
    fg: 'cyan',
    bg: 'black',
  }
});

const userInfoBox = blessed.box({
  top: 3,
  left: 0,
  width: '100%',
  height: 7,
  content: 'Loading user info...',
  tags: true,
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: 'white'
    }
  },
  border: {
    type: 'line'
  }
});

const miningStatusBox = blessed.box({
  top: 10,
  left: 0,
  width: '100%',
  height: 8,
  content: 'Loading mining status...',
  tags: true,
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: 'white'
    }
  },
  border: {
    type: 'line'
  }
});

const logBox = blessed.log({
  top: 18,
  left: 0,
  width: '100%',
  height: 8,
  content: '',
  tags: true,
  scrollable: true,
  mouse: true,
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: 'white'
    }
  },
  border: {
    type: 'line'
  },
  scrollbar: {
    ch: ' ',
    style: {
      bg: 'blue'
    }
  }
});

const statusBox = blessed.box({
  bottom: 0,
  left: 0,
  width: '100%',
  height: 3,
  content: '{center}Press [q] to Quit | [r] to Refresh Token{/center}',
  tags: true,
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: 'white'
    }
  },
  border: {
    type: 'line'
  }
});

screen.append(headerBox);
screen.append(userInfoBox);
screen.append(miningStatusBox);
screen.append(logBox);
screen.append(statusBox);

function logMessage(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  let coloredMessage;
  
  switch(type) {
    case 'error':
      coloredMessage = `{red-fg}[${timestamp}] ${message}{/red-fg}`;
      break;
    case 'success':
      coloredMessage = `{green-fg}[${timestamp}] ${message}{/green-fg}`;
      break;
    case 'warning':
      coloredMessage = `{yellow-fg}[${timestamp}] ${message}{/yellow-fg}`;
      break;
    default:
      coloredMessage = `{white-fg}[${timestamp}] ${message}{/white-fg}`;
  }
  
  logBox.log(coloredMessage);
  screen.render();
}

async function updateUserInfo() {
  try {
    if (!auth.isAuthenticated()) {
      userInfoBox.setContent('{red-fg}Not logged in. Please check credentials.{/red-fg}');
      return;
    }
    
    const [profileData, banStatus] = await Promise.all([
      getUserProfile(),
      checkUserBan()
    ]);
    
    if (!profileData) {
      userInfoBox.setContent('{red-fg}Failed to fetch user data{/red-fg}');
      return;
    }
    
    const banStatusText = profileData.ban ? '{red-fg}BANNED{/red-fg}' : '{green-fg}NOT BANNED{/green-fg}';
    
    userInfoBox.setContent(
      `{yellow-fg}Username:{/yellow-fg} {green-fg}${profileData.username}{/green-fg}\n` +
      `{yellow-fg}Email:{/yellow-fg} {green-fg}${profileData.email}{/green-fg}\n` +
      `{yellow-fg}Total Reward:{/yellow-fg} {green-fg}${profileData.all_reward} AVEUM{/green-fg}\n` +
      `{yellow-fg}Ban Status:{/yellow-fg} ${banStatusText}`
    );
    
    screen.render();
  } catch (error) {
    logMessage('Error updating user info: ' + error.message, 'error');
  }
}

async function updateMiningStatus() {
  try {
    if (!auth.isAuthenticated()) {
      miningStatusBox.setContent('{red-fg}Not logged in. Please check credentials.{/red-fg}');
      return;
    }
    
    const hubStatus = await getHubStatus();
    
    if (!hubStatus) {
      miningStatusBox.setContent('{red-fg}Failed to fetch mining status{/red-fg}');
      return;
    }
    
    if (hubStatus.isHub) {
      miningStatusBox.setContent(
        `{yellow-fg}Mining Status:{/yellow-fg} {green-fg}ACTIVE{/green-fg}\n` +
        `{yellow-fg}Start Time:{/yellow-fg} {green-fg}${hubStatus.startTime}{/green-fg}\n` +
        `{yellow-fg}Daily Reward:{/yellow-fg} {green-fg}${hubStatus.dailyReward} AVEUM{/green-fg}\n` +
        `{yellow-fg}Current Earning:{/yellow-fg} {green-fg}${hubStatus.currentEarning} AVEUM{/green-fg}\n` +
        `{yellow-fg}Hourly Rate:{/yellow-fg} {green-fg}${hubStatus.hourlyRate} AVEUM/hour{/green-fg}\n` +
        `{yellow-fg}Remaining Time:{/yellow-fg} {green-fg}${formatTimeRemaining(hubStatus.remainingTime)}{/green-fg}`
      );
    } else {
      miningStatusBox.setContent(`{yellow-fg}Mining Status:{/yellow-fg} {red-fg}INACTIVE{/red-fg}\n{yellow-fg}Starting mining...{/yellow-fg}`);
      
      logMessage('Mining is not active. Starting automatically...', 'warning');
      await startHubMining();
      
      setTimeout(updateMiningStatus, 2000);
    }
    
    screen.render();
  } catch (error) {
    logMessage('Error updating mining status: ' + error.message, 'error');
    
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      logMessage('Authentication error. Trying to login again...', 'warning');
      await auth.login();
      
      if (auth.isAuthenticated()) {
        setTimeout(updateMiningStatus, 1000);
      }
    }
  }
}

async function ensureMining() {
  try {
    if (!auth.isAuthenticated()) {
      return;
    }
    
    const hubStatus = await getHubStatus();
    
    if (hubStatus && !hubStatus.isHub) {
      logMessage('Mining check: Mining is not active. Starting...', 'warning');
      await startHubMining();
    }
  } catch (error) {
    logMessage('Error checking mining status: ' + error.message, 'error');
  }
}

async function runBot() {
  logMessage('Starting Aveum Mining Bot...', 'info');
  
  const loginSuccess = await auth.login();
  if (!loginSuccess) {
    logMessage('Failed to login. Please check your credentials in .env file.', 'error');
    return;
  }
  
  await updateUserInfo();
  await updateMiningStatus();
  
  const refreshInterval = setInterval(async () => {
    await updateUserInfo();
    await updateMiningStatus();
  }, 10000); 
  
  const miningCheckInterval = setInterval(async () => {
    await ensureMining();
  }, 30000); 
  
  screen.key(['q', 'C-c'], () => {
    clearInterval(refreshInterval);
    clearInterval(miningCheckInterval);
    logMessage('Shutting down bot...', 'warning');
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });
  
  screen.key('r', async () => {
    logMessage('Manually refreshing authentication token...', 'info');
    await auth.login();
    if (auth.isAuthenticated()) {
      logMessage('Token refreshed successfully!', 'success');
      await updateUserInfo();
      await updateMiningStatus();
    }
  });
  
  screen.on('resize', () => {
    screen.render();
  });
  
  screen.render();
}

if (!fs.existsSync('.env')) {
  fs.writeFileSync('.env', 'AVEUM_EMAIL=youremail@gmail.com\nAVEUM_PASSWORD=\n');
  logMessage('Created .env file with template. Please fill in your credentials.', 'info');
}

runBot();
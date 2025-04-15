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
  checkBan: '/users/check-ban',
  claimReward: '/users/claim-reward',
  discoverFeed: '/users/discover-feed',
  discoverOnlineUsers: '/users/discover-online-users',
  toggleLike: '/users/toggle-like/'
};

const ANDROID_DEVICE_MODELS = [
  'SM-G9750', 'SM-G988B', 'SM-G973F', 'SM-G975F', 'SM-N975F',
  'SM-A515F', 'SM-A715F', 'SM-A516B', 'SM-A526B', 'SM-A536E',
  'Pixel 6', 'Pixel 6 Pro', 'Pixel 7', 'Pixel 7 Pro', 'Pixel 8',
  'OnePlus 9', 'OnePlus 10 Pro', 'OnePlus 11', 'OnePlus Nord 3',
  'Redmi Note 12', 'Redmi Note 11', 'POCO F5', 'POCO X5 Pro',
  'Vivo X90', 'Vivo V25', 'Vivo Y35', 'Oppo Reno 8', 'Oppo Find X5'
];

const ANDROID_VERSIONS = ['10', '11', '12', '13'];

const BOT_MODE = {
  MINING: 'mining',
  AUTO_LIKE: 'auto_like'
};

let currentBotMode = BOT_MODE.MINING;
let autoLikeRunning = false;
let processedPostIds = new Set();
let processedUserIds = new Set();

function generateRandomDeviceId() {
  return crypto.randomBytes(8).toString('hex');
}

function getRandomDeviceModel() {
  return ANDROID_DEVICE_MODELS[Math.floor(Math.random() * ANDROID_DEVICE_MODELS.length)];
}

function getRandomAndroidVersion() {
  return ANDROID_VERSIONS[Math.floor(Math.random() * ANDROID_VERSIONS.length)];
}

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
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

async function claimReward() {
  try {
    const response = await axios.post(
      `${API_BASE_URL}${API_ENDPOINTS.claimReward}`, 
      {}, 
      { headers: getHeaders(auth.getToken()) }
    );
    logMessage('✅ Reward claimed successfully!', 'success');
    if (response.data && response.data.reward) {
      logMessage(`Claimed ${response.data.reward} AVEUM!`, 'success');
    }
    return response.data;
  } catch (error) {
    logMessage('❌ Error claiming reward: ' + error.message, 'error');
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

async function getDiscoverFeed(page = 1, limit = 20) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}${API_ENDPOINTS.discoverFeed}?page=${page}&limit=${limit}`, 
      { headers: getHeaders(auth.getToken()) }
    );
    
    // Log the structure for debugging
    logMessage(`Received discover feed data. Response structure: ${Object.keys(response.data).join(', ')}`, 'info');
    
    return response.data;
  } catch (error) {
    logMessage('Error fetching discover feed: ' + error.message, 'error');
    return null;
  }
}

async function getDiscoverOnlineUsers(page = 1, limit = 20) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}${API_ENDPOINTS.discoverOnlineUsers}?page=${page}&limit=${limit}`, 
      { headers: getHeaders(auth.getToken()) }
    );
    
    return response.data;
  } catch (error) {
    logMessage('Error fetching online users: ' + error.message, 'error');
    return null;
  }
}

async function toggleLike(userId) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}${API_ENDPOINTS.toggleLike}${userId}`, 
      {}, 
      { headers: getHeaders(auth.getToken()) }
    );
    logMessage(`✅ Successfully liked user ID: ${userId}`, 'success');
    return response.data;
  } catch (error) {
    logMessage(`❌ Error liking user ID ${userId}: ${error.message}`, 'error');
    if (error.response) {
      logMessage(`Response data: ${JSON.stringify(error.response.data)}`, 'error');
    }
    return null;
  }
}

// Create UI
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

const modeBox = blessed.box({
  top: 3,
  left: 0,
  width: '100%',
  height: 3,
  content: '{center}CURRENT MODE: MINING{/center}',
  tags: true,
  style: {
    fg: 'yellow',
    bg: 'black',
    border: {
      fg: 'white'
    }
  },
  border: {
    type: 'line'
  }
});

const userInfoBox = blessed.box({
  top: 6,
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
  top: 13,
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

const autoLikeStatusBox = blessed.box({
  top: 13,
  left: 0,
  width: '100%',
  height: 8,
  content: 'Auto Like status will appear here when active',
  tags: true,
  visible: false,
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
  top: 21,
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
  content: '{center}Press [q] to Quit | [r] to Refresh Token | [m] Toggle Mining/Auto-Like{/center}',
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
screen.append(modeBox);
screen.append(userInfoBox);
screen.append(miningStatusBox);
screen.append(autoLikeStatusBox);
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
    if (!auth.isAuthenticated() || currentBotMode !== BOT_MODE.MINING) {
      return;
    }
    
    const hubStatus = await getHubStatus();
    
    if (!hubStatus) {
      miningStatusBox.setContent('{red-fg}Failed to fetch mining status{/red-fg}');
      return;
    }
    
    if (hubStatus.isHub) {
      if (hubStatus.remainingTime <= 0.001) {
        logMessage('Mining complete! Claiming reward...', 'success');
        await claimReward();
        logMessage('Starting new mining session...', 'info');
        await startHubMining();
        setTimeout(updateMiningStatus, 2000);
        return;
      }
      
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
    if (!auth.isAuthenticated() || currentBotMode !== BOT_MODE.MINING) {
      return;
    }
    
    const hubStatus = await getHubStatus();
    
    if (hubStatus && !hubStatus.isHub) {
      logMessage('Mining check: Mining is not active. Starting...', 'warning');
      await startHubMining();
    } else if (hubStatus && hubStatus.isHub && hubStatus.remainingTime <= 0.001) {
      logMessage('Mining complete! Claiming reward...', 'success');
      await claimReward();
      logMessage('Starting new mining session...', 'info');
      await startHubMining();
    }
  } catch (error) {
    logMessage('Error checking mining status: ' + error.message, 'error');
  }
}

async function runAutoLike() {
  if (!auth.isAuthenticated() || currentBotMode !== BOT_MODE.AUTO_LIKE || autoLikeRunning) {
    return;
  }
  
  autoLikeRunning = true;
  let totalLiked = 0;
  
  try {
    async function processUsers(page, source) {
      logMessage(`Fetching ${source} page ${page}...`, 'info');
      
      let data;
      if (source === 'discover feed') {
        data = await getDiscoverFeed(page, 20);
      } else {
        data = await getDiscoverOnlineUsers(page, 20);
      }
      
      if (!data) {
        logMessage(`Could not fetch ${source}`, 'warning');
        return 0;
      }
      
      let users = [];
      if (data.users && Array.isArray(data.users)) {
        users = data.users;
        logMessage(`Found ${users.length} users in ${source}`, 'info');
      } else if (data.posts && Array.isArray(data.posts)) {
        users = data.posts.map(post => ({
          id: post.user_id || post.id,
          username: post.username,
          is_liked: post.liked
        }));
        logMessage(`Found ${users.length} posts in ${source}`, 'info');
      } else {
        logMessage(`Unexpected data structure in ${source}. Available keys: ${Object.keys(data).join(', ')}`, 'warning');
        return 0;
      }
      
      let likedCount = 0;
      
      for (const user of users) {
        if (currentBotMode !== BOT_MODE.AUTO_LIKE) break;
        
        if (processedUserIds.has(user.id)) {
          continue;
        }
        
        if (user.is_liked) {
          processedUserIds.add(user.id);
          continue;
        }
        
        logMessage(`Liking user ID: ${user.id}${user.username ? ` (${user.username})` : ''}...`, 'info');
        await toggleLike(user.id);
        processedUserIds.add(user.id);
        totalLiked++;
        likedCount++;
        
        updateAutoLikeStatus(totalLiked);
        
        const delay = getRandomDelay(2000, 5000);
        logMessage(`Waiting ${delay/1000} seconds before next like...`, 'info');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      return likedCount;
    }
    
    let currentPage = 1;
    const maxPages = 5; 
    
    while (currentPage <= maxPages && currentBotMode === BOT_MODE.AUTO_LIKE) {
      let totalProcessed = 0;
      
      totalProcessed += await processUsers(currentPage, 'discover feed');
      
      if (totalProcessed < 5 && currentBotMode === BOT_MODE.AUTO_LIKE) {
        await processUsers(currentPage, 'online users');
      }
      
      currentPage++;
      
      if (currentPage <= maxPages && currentBotMode === BOT_MODE.AUTO_LIKE) {
        const pageDelay = getRandomDelay(5000, 10000);
        logMessage(`Waiting ${pageDelay/1000} seconds before fetching next page...`, 'info');
        await new Promise(resolve => setTimeout(resolve, pageDelay));
      }
    }
    
    logMessage(`Auto-like session completed. Liked ${totalLiked} users.`, 'success');
    
    if (currentBotMode === BOT_MODE.AUTO_LIKE) {
      const resetDelay = getRandomDelay(60000, 120000);
      logMessage(`Taking a break. Will restart auto-like in ${resetDelay/1000} seconds...`, 'info');
      setTimeout(() => {
        autoLikeRunning = false;
        if (currentBotMode === BOT_MODE.AUTO_LIKE) {
          runAutoLike();
        }
      }, resetDelay);
    } else {
      autoLikeRunning = false;
    }
    
  } catch (error) {
    logMessage(`Error in auto-like: ${error.message}`, 'error');
    autoLikeRunning = false;
    
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      logMessage('Authentication error. Trying to login again...', 'warning');
      await auth.login();
    }
    
    setTimeout(() => {
      if (currentBotMode === BOT_MODE.AUTO_LIKE) {
        autoLikeRunning = false;
        runAutoLike();
      }
    }, 10000);
  }
}

function updateAutoLikeStatus(totalLiked) {
  autoLikeStatusBox.setContent(
    `{yellow-fg}Auto Like Status:{/yellow-fg} {green-fg}ACTIVE{/green-fg}\n` +
    `{yellow-fg}Total Users Liked:{/yellow-fg} {green-fg}${totalLiked}{/green-fg}\n` +
    `{yellow-fg}Processed Users:{/yellow-fg} {green-fg}${processedUserIds.size}{/green-fg}\n` +
    `{yellow-fg}Started At:{/yellow-fg} {green-fg}${new Date().toLocaleTimeString()}{/green-fg}`
  );
  screen.render();
}

function updateModeDisplay() {
  modeBox.setContent(`{center}CURRENT MODE: ${currentBotMode === BOT_MODE.MINING ? '{green-fg}MINING{/green-fg}' : '{cyan-fg}AUTO LIKE{/cyan-fg}'}{/center}`);
  
  if (currentBotMode === BOT_MODE.MINING) {
    miningStatusBox.show();
    autoLikeStatusBox.hide();
  } else {
    miningStatusBox.hide();
    autoLikeStatusBox.show();
  }
  
  screen.render();
}

function toggleBotMode() {
  if (currentBotMode === BOT_MODE.MINING) {
    currentBotMode = BOT_MODE.AUTO_LIKE;
    logMessage('Switching to AUTO LIKE mode', 'info');
    if (!autoLikeRunning) {
      runAutoLike();
    }
  } else {
    currentBotMode = BOT_MODE.MINING;
    logMessage('Switching to MINING mode', 'info');
    setTimeout(updateMiningStatus, 1000);
  }
  
  updateModeDisplay();
}

async function runBot() {
  logMessage('Starting Aveum Mining Bot...', 'info');
  
  const loginSuccess = await auth.login();
  if (!loginSuccess) {
    logMessage('Failed to login. Please check your credentials in .env file.', 'error');
    return;
  }
  
  await updateUserInfo();
  updateModeDisplay();
  await updateMiningStatus();
  
  const refreshInterval = setInterval(async () => {
    await updateUserInfo();
    if (currentBotMode === BOT_MODE.MINING) {
      await updateMiningStatus();
    }
  }, 10000); 
  
  const miningCheckInterval = setInterval(async () => {
    if (currentBotMode === BOT_MODE.MINING) {
      await ensureMining();
    } else if (currentBotMode === BOT_MODE.AUTO_LIKE && !autoLikeRunning) {
      runAutoLike();
    }
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
      if (currentBotMode === BOT_MODE.MINING) {
        await updateMiningStatus();
      }
    }
  });
  
  screen.key('m', () => {
    toggleBotMode();
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

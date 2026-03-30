const mineflayer = require('mineflayer')
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))
const fs = require('fs')
const pathModule = require('path')
const readline = require('readline')
const http = require('http')
const mysql = require('mysql2/promise')
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js')

const startTime = Date.now()

const ENCHANTMENT_NAMES = {
  0: 'Protection', 1: 'Fire Protection', 2: 'Feather Falling', 3: 'Blast Protection', 4: 'Projectile Protection',
  5: 'Respiration', 6: 'Aqua Affinity', 7: 'Thorns', 8: 'Depth Strider', 9: 'Frost Walker', 10: 'Sharpness',
  11: 'Smite', 12: 'Bane of Arthropods', 13: 'Knockback', 14: 'Fire Aspect', 15: 'Looting', 16: 'Sweeping Edge',
  17: 'Efficiency', 18: 'Looting', 19: 'Silk Touch', 20: 'Unbreaking', 21: 'Fortune', 22: 'Power',
  23: 'Unbreaking', 24: 'Punch', 25: 'Flame', 26: 'Infinity', 27: 'Luck of the Sea', 28: 'Respiration',
  29: 'Lure', 30: 'Loyalty', 31: 'Aqua Affinity', 32: 'Riptide', 33: 'Channeling', 34: 'Multishot',
  35: 'Piercing', 36: 'Quick Charge', 37: 'Mending', 38: 'Vanishing Curse', 39: 'Mending', 40: 'Curse of Vanishing',
  41: 'Wind Burst', 42: 'Density', 43: 'Breach'
};

const EFFECT_NAMES = {
  1: 'Speed', 2: 'Slowness', 3: 'Haste', 4: 'Mining Fatigue', 5: 'Strength', 6: 'Instant Health', 7: 'Instant Damage',
  8: 'Jump Boost', 9: 'Nausea', 10: 'Regeneration', 11: 'Resistance', 12: 'Fire Resistance', 13: 'Water Breathing',
  14: 'Invisibility', 15: 'Blindness', 16: 'Night Vision', 17: 'Hunger', 18: 'Weakness', 19: 'Poison', 20: 'Wither',
  21: 'Health Boost', 22: 'Absorption', 23: 'Saturation', 24: 'Glowing', 25: 'Levitation', 26: 'Luck', 27: 'Bad Luck',
  28: 'Slow Falling', 29: 'Conduit Power', 30: 'Dolphins Grace', 31: 'Bad Omen', 32: 'Hero of the Village',
  33: 'Darkness', 34: 'Trial Omen', 35: 'Raid Omen'
};

function getEnchantmentName(id) {
  if (typeof id === 'string') {
    const numericId = id.split(':').pop();
    if (ENCHANTMENT_NAMES[numericId]) return ENCHANTMENT_NAMES[numericId];
    return id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ');
  }
  return ENCHANTMENT_NAMES[id] || `Enchant ${id}`;
}

// -----------------------------
// Load configuration files
// -----------------------------
let CONFIG = {}
let SPECIAL_ITEMS = []

function loadConfig() {
  try {
    const configPath = pathModule.join(__dirname, 'config.json')
    if (fs.existsSync(configPath)) {
      CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      console.log('[CONFIG] Loaded config.json')
      
      // Check for Discord config and auto-add if missing
      if (!CONFIG.discord) {
        CONFIG.discord = {
          token: 'YOUR_DISCORD_BOT_TOKEN_HERE',
          clientId: 'YOUR_DISCORD_CLIENT_ID_HERE',
          guildId: 'YOUR_DISCORD_SERVER_ID_HERE',
          channelId: 'YOUR_DISCORD_CHANNEL_ID_HERE',
          roles: {
            owner: 'ROLE_NAME_FOR_OWNER',
            admin: 'ROLE_NAME_FOR_ADMIN',
            trusted: 'ROLE_NAME_FOR_TRUSTED'
          }
        }
        
        // Add default toggles if missing
        if (CONFIG.collect_spawn_eggs === undefined) CONFIG.collect_spawn_eggs = true
        if (CONFIG.collect_shulkers === undefined) CONFIG.collect_shulkers = true
        
        fs.writeFileSync(configPath, JSON.stringify(CONFIG, null, 2))
        console.log('[CONFIG] Added Discord configuration section to config.json')
      } else {
        // Just ensure toggles exist in current session
        if (CONFIG.collect_spawn_eggs === undefined) CONFIG.collect_spawn_eggs = true
        if (CONFIG.collect_shulkers === undefined) CONFIG.collect_shulkers = true
      }
    } else {
      // Create default config with Discord support
      CONFIG = {
        host: 'your_minecraft_server_ip',
        auth: 'microsoft',
        username: 'your_email_or_username',
        version: '1.21.11',
        collect_spawn_eggs: true,
        collect_shulkers: true,
        database: {
          host: 'localhost',
          user: 'jurobot',
          password: 'your_password_here',
          database: 'jurobot'
        },
        discord_webhook: 'YOUR_WEBHOOK_URL_HERE',
        web_port: 3000,
        discord: {
          token: 'YOUR_DISCORD_BOT_TOKEN_HERE',
          clientId: 'YOUR_DISCORD_CLIENT_ID_HERE',
          guildId: 'YOUR_DISCORD_SERVER_ID_HERE',
          channelId: 'YOUR_DISCORD_CHANNEL_ID_HERE',
          roles: {
            owner: 'ROLE_NAME_FOR_OWNER',
            admin: 'ROLE_NAME_FOR_ADMIN',
            trusted: 'ROLE_NAME_FOR_TRUSTED'
          }
        }
      }
      fs.writeFileSync(configPath, JSON.stringify(CONFIG, null, 2))
      console.log('[CONFIG] Created default config.json with Discord support')
      console.log('[CONFIG] Please fill in your Discord bot token, server ID, and channel ID in config.json')
    }
  } catch (err) {
    console.error('[CONFIG] Error loading config:', err)
    process.exit(1)
  }
}

function loadItems() {
  try {
    const itemsPath = pathModule.join(__dirname, 'assets', 'items.json')
    if (fs.existsSync(itemsPath)) {
      const data = JSON.parse(fs.readFileSync(itemsPath, 'utf8'))
      SPECIAL_ITEMS = data.items || []
      console.log(`[ITEMS] Loaded ${SPECIAL_ITEMS.length} items from items.json`)
    } else {
      // Create default items file
      SPECIAL_ITEMS = [
        'elytra','netherite_sword','netherite_axe','netherite_pickaxe','netherite_helmet','netherite_chestplate',
        'netherite_leggings','netherite_boots','minecraft:spawner','netherite_ingot','netherite_block','diamond',
        'diamond_block','enchanted_golden_apple','netherite_upgrade_smithing_template','bedrock','barrier','spawner',
        'vindicator_spawn_egg','end_crystal','trial_spawner','dirt','grass_block','mace','structure_void',
        'skeleton_spawn_egg','stray_spawn_egg','bogged_spawn_egg','netherite_spear'
      ]
      saveItems()
      console.log('[ITEMS] Created default items.json')
    }
  } catch (err) {
    console.error('[ITEMS] Error loading items:', err)
    process.exit(1)
  }
}

function saveItems() {
  try {
    const itemsPath = pathModule.join(__dirname, 'assets', 'items.json')
    fs.writeFileSync(itemsPath, JSON.stringify({ items: SPECIAL_ITEMS }, null, 2))
    logToConsole('[ITEMS] Saved keeplist to items.json')
    return true
  } catch (err) {
    console.error('[ITEMS] Error saving items:', err)
    return false
  }
}

// -----------------------------
// Quote system
// -----------------------------
let QUOTES = []

function loadQuotes() {
  try {
    const quotesPath = pathModule.join(__dirname, 'quotes.json')
    if (fs.existsSync(quotesPath)) {
      QUOTES = JSON.parse(fs.readFileSync(quotesPath, 'utf8'))
      console.log(`[QUOTES] Loaded ${QUOTES.length} quotes from quotes.json`)
    } else {
      QUOTES = []
      saveQuotes()
      console.log('[QUOTES] Created default quotes.json')
    }
  } catch (err) {
    console.error('[QUOTES] Error loading quotes:', err)
    QUOTES = []
  }
}

function saveQuotes() {
  try {
    const quotesPath = pathModule.join(__dirname, 'quotes.json')
    fs.writeFileSync(quotesPath, JSON.stringify(QUOTES, null, 2))
    return true
  } catch (err) {
    console.error('[QUOTES] Error saving quotes:', err)
    return false
  }
}

// -----------------------------
// Pull logging and interaction
// -----------------------------
function logPull(playerName, reason) {
  try {
    const pullsPath = pathModule.join(__dirname, 'pulls.json')
    let pulls = []
    if (fs.existsSync(pullsPath)) {
      pulls = JSON.parse(fs.readFileSync(pullsPath, 'utf8'))
    }
    pulls.push({
      time: new Date().toISOString(),
      player: playerName,
      reason: reason || 'No reason provided'
    })
    fs.writeFileSync(pullsPath, JSON.stringify(pulls, null, 2))
    logToConsole(`[PULL] Logged pull by ${playerName}: ${reason}`)
  } catch (err) {
    console.error('[PULL] Error logging pull:', err)
  }
}

async function pressNearestLever(playerName, reason) {
  if (!bot || !botOnline) return false
  
  const lever = bot.findBlock({
    matching: (block) => block.name === 'lever',
    maxDistance: 4
  })
  
  if (lever) {
    await bot.activateBlock(lever)
    logPull(playerName, reason)
    return true
  }
  return false
}

function isKeeplistItem(itemName) {
  if (!itemName) return false
  // 1. Check if it's in the special items list
  if (SPECIAL_ITEMS.includes(itemName)) return true
  // 2. Regex-like check: keep all items ending in _spawn_egg if enabled
  if (CONFIG.collect_spawn_eggs && itemName.endsWith('_spawn_egg')) return true
  // 3. Keep all items containing "shulker" if enabled
  if (CONFIG.collect_shulkers && itemName.includes('shulker')) return true
  return false
}

// -----------------------------
// Stock Management
// -----------------------------
function updateStock(itemName, count) {
  const stockPath = pathModule.join(__dirname, 'stockbot', 'stock.json');
  if (!fs.existsSync(stockPath)) return;
  
  const stockMapping = {
    'netherite_sword': 'swords',
    'netherite_axe': 'axes',
    'netherite_pickaxe': 'pickaxes',
    'netherite_spear': 'spears',
    'mace': 'maces',
    'netherite_helmet': 'helmets',
    'netherite_chestplate': 'chestplates',
    'netherite_leggings': 'leggings',
    'netherite_boots': 'boots',
    'elytra': 'elytras',
    'beacon': 'beacons',
    'grass_block': 'grass blocks',
    'reinforced_deepslate': 'reinforced deepslate',
    'diamond_ore': 'diamond ore',
    'vault': 'vault',
    'trial_spawner': 'trial spawner',
    'vindicator_spawn_egg': 'vindicator spawn egg',
    'stray_spawn_egg': 'stray spawn egg',
    'villager_spawn_egg': 'villager spawn egg',
    'strider_spawn_egg': 'strider spawn egg',
    'breeze_spawn_egg': 'breeze spawn egg',
    'skeleton_spawn_egg': 'skeleton spawn egg',
    'netherite_ingot': 'netherite ingots',
    'diamond': 'diamonds',
    'end_crystal': 'end crystals',
    'ominous_trial_key': 'ominous trial key',
    'trial_key': 'trial key',
    'structure_void': 'structure void',
    'netherite_upgrade_smithing_template': 'smithing template',
    'silence_armor_trim_smithing_template': 'silence armor trim',
    'spawner': 'spawners',
    'minecraft:spawner': 'spawners',
    'experience_bottle': 'experience bottle'
  };

  const targetName = stockMapping[itemName];
  if (!targetName) return;
  if (!isKeeplistItem(itemName)) return; // Only keeplist items as per request

  try {
    let stockData = JSON.parse(fs.readFileSync(stockPath, 'utf8'));
    let updated = false;
    for (let entry of stockData) {
      if (entry.name === targetName) {
        entry.stock += count;
        updated = true;
        break;
      }
    }
    if (updated) {
      fs.writeFileSync(stockPath, JSON.stringify(stockData, null, 2));
      logToConsole(`[STOCK] Updated ${targetName}: +${count} (Dropped ${itemName})`);
    }
  } catch (err) {
    console.error('[STOCK] Error updating stock.json:', err);
  }
}

// -----------------------------
// Console logging
// -----------------------------
function logToConsole(message) {
  console.log(message)
  consoleLogs.push({ time: new Date().toISOString(), message })
  if (consoleLogs.length > 100) consoleLogs.shift()
}

// -----------------------------
// Enhanced error suppression for PartialReadError, ECONNRESET, and ERR_OUT_OF_RANGE
// -----------------------------
process.on('uncaughtException', (err) => {
  if (err.name === 'PartialReadError') {
    console.log('[ERROR] Suppressed PartialReadError')
    return
  }
  if (err.code === 'ECONNRESET') {
    console.log('[ERROR] Suppressed ECONNRESET')
    return
  }
  // Suppress ERR_OUT_OF_RANGE from packet parsing (version mismatch or malformed packets)
  if (err.code === 'ERR_OUT_OF_RANGE') {
    console.log('[ERROR] Suppressed ERR_OUT_OF_RANGE in packet parsing - continuing...')
    return
  }
  console.error('[UNCAUGHT EXCEPTION]', err)
})

process.on('unhandledRejection', (reason) => {
  if (reason && reason.name === 'PartialReadError') {
    console.log('[ERROR] Suppressed PartialReadError (unhandled rejection)')
    return
  }
  if (reason && reason.code === 'ECONNRESET') {
    console.log('[ERROR] Suppressed ECONNRESET (unhandled rejection)')
    return
  }
  // Suppress ERR_OUT_OF_RANGE from packet parsing
  if (reason && reason.code === 'ERR_OUT_OF_RANGE') {
    console.log('[ERROR] Suppressed ERR_OUT_OF_RANGE (unhandled rejection) - continuing...')
    return
  }
  console.error('[UNHANDLED REJECTION]', reason)
})

let db = null
let discordClient = null
let discordChannel = null
let discordPrivateChannel = null
let discordAlertChannel = null
let discordBasesChannel = null

// -----------------------------
// Initialize Discord client
// -----------------------------
async function initDiscord() {
  try {
    if (!CONFIG.discord || !CONFIG.discord.token || CONFIG.discord.token === 'YOUR_DISCORD_BOT_TOKEN_HERE') {
      console.log('[DISCORD] Discord token not configured. Discord support disabled.')
      return
    }

    discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
      ]
    })

    discordClient.once('ready', async () => {
      console.log(`[DISCORD] Logged in as ${discordClient.user.tag}`)
      
      const guild = discordClient.guilds.cache.get(CONFIG.discord.guildId)
      if (!guild) {
        console.log(`[DISCORD] Could not find guild with ID: ${CONFIG.discord.guildId}`)
        return
      }
      console.log(`[DISCORD] Connected to guild: ${guild.name}`)

      // Setup main channel
      discordChannel = guild.channels.cache.get(CONFIG.discord.channelId)
      if (discordChannel) {
        console.log(`[DISCORD] Using main channel: ${discordChannel.name}`)
        discordChannel.send('```ansi\n\u001b[32m🔗 JuroBot connected! Minecraft bot is now linked to Discord.\u001b[0m\n```')
      } else {
        console.log(`[DISCORD] Main channel not found.`)
      }

      // Setup/Create Private Messages channel
      discordPrivateChannel = guild.channels.cache.find(c => c.name === 'bot-private-messages')
      if (!discordPrivateChannel) {
        try {
          discordPrivateChannel = await guild.channels.create({
            name: 'bot-private-messages',
            topic: 'All private messages received by the Minecraft bot'
          })
          console.log(`[DISCORD] Created channel: ${discordPrivateChannel.name}`)
        } catch (e) { console.error('[DISCORD] Error creating private channel:', e) }
      } else {
        console.log(`[DISCORD] Using private channel: ${discordPrivateChannel.name}`)
      }

      // Setup/Create Player Alerts channel
      discordAlertChannel = guild.channels.cache.find(c => c.name === 'player-alerts')
      if (!discordAlertChannel) {
        try {
          discordAlertChannel = await guild.channels.create({
            name: 'player-alerts',
            topic: 'Alerts when players enter the bot\'s render distance'
          })
          console.log(`[DISCORD] Created channel: ${discordAlertChannel.name}`)
        } catch (e) { console.error('[DISCORD] Error creating alert channel:', e) }
      } else {
        console.log(`[DISCORD] Using alert channel: ${discordAlertChannel.name}`)
      }

      // Setup/Create Base Coordinates channel
      discordBasesChannel = guild.channels.cache.find(c => c.name === 'base-coordinates')
      if (!discordBasesChannel) {
        try {
          discordBasesChannel = await guild.channels.create({
            name: 'base-coordinates',
            topic: 'Logs messages that appear to contain base coordinates'
          })
          console.log(`[DISCORD] Created channel: ${discordBasesChannel.name}`)
        } catch (e) { console.error('[DISCORD] Error creating bases channel:', e) }
      } else {
        console.log(`[DISCORD] Using bases channel: ${discordBasesChannel.name}`)
      }
    })

    discordClient.on('messageCreate', async (message) => {
      // Ignore messages from bots
      if (message.author.bot) return
      
      // Only listen to configured channel
      if (message.channel.id !== CONFIG.discord.channelId) return
      
      // Process commands
      if (message.content.startsWith('!')) {
        await handleDiscordCommand(message)
      } else {
        // Forward regular messages to Minecraft
        if (bot && botOnline) {
          queueMessage(`[Discord] <${message.author.username}> ${message.content}`)
        }
      }
    })

    await discordClient.login(CONFIG.discord.token)
  } catch (err) {
    console.error('[DISCORD] Failed to initialize Discord client:', err)
  }
}

// -----------------------------
// Discord permission helper functions
// -----------------------------
async function hasDiscordRole(member, roleName) {
  if (!member) return false
  
  const role = member.roles.cache.find(r => 
    r.name.toLowerCase() === roleName.toLowerCase()
  )
  return !!role
}

async function getDiscordUserByName(username) {
  if (!discordClient || !username) return null
  
  const guild = discordClient.guilds.cache.get(CONFIG.discord.guildId)
  if (!guild) return null
  
  // Only find by exact Discord username (case-insensitive)
  // Nicknames and display names can be changed by users to impersonate others
  const member = guild.members.cache.find(m => 
    m.user.username.toLowerCase() === username.toLowerCase()
  )
  
  return member
}

async function isDiscordOwner(member) {
  if (!member) return false
  
  // 1. Check if user is server owner
  if (member.id === member.guild.ownerId) return true
  
  // 2. Check for configured owner role (Name or ID)
  const ownerRole = CONFIG.discord.roles.owner
  if (ownerRole && ownerRole !== 'ROLE_NAME_FOR_OWNER') {
    if (member.roles.cache.some(r => r.name.toLowerCase() === ownerRole.toLowerCase() || r.id === ownerRole)) {
      return true
    }
  }
  
  return false
}

async function isDiscordAdmin(member) {
  if (!member) return false
  
  // 1. If user is owner, they're also admin
  if (await isDiscordOwner(member)) return true
  
  // 2. Check for administrator permission
  if (member.permissions.has('Administrator')) return true
  
  // 3. Check for configured admin role (Name or ID)
  const adminRole = CONFIG.discord.roles.admin
  if (adminRole && adminRole !== 'ROLE_NAME_FOR_ADMIN') {
    if (member.roles.cache.some(r => r.name.toLowerCase() === adminRole.toLowerCase() || r.id === adminRole)) {
      return true
    }
  }
  
  return false
}

async function isDiscordTrusted(member) {
  if (!member) return false
  
  // 1. If user is admin or owner, they're also trusted
  if (await isDiscordAdmin(member)) return true
  
  // 2. Check for configured trusted role (Name or ID)
  const trustedRole = CONFIG.discord.roles.trusted
  if (trustedRole && trustedRole !== 'ROLE_NAME_FOR_TRUSTED') {
    if (member.roles.cache.some(r => r.name.toLowerCase() === trustedRole.toLowerCase() || r.id === trustedRole)) {
      return true
    }
  }
  
  return false
}

// -----------------------------
// Handle Discord commands
// -----------------------------
async function handleDiscordCommand(message) {
  const args = message.content.slice(1).trim().split(/ +/)
  const command = args.shift().toLowerCase()
  const member = message.member
  
  try {
    switch (command) {
      case 'help':
        await sendDiscordHelp(message)
        break
        
      case 'inv':
      case 'inventory':
        await discordInventoryCommand(message)
        break
        
      case 'info':
        await discordInfoCommand(message)
        break
        
      case 'shop':
        await discordShopCommand(message)
        break
        
      case 'wordle':
        await discordWordleCommand(message)
        break
        
      case 'seen':
        await discordSeenCommand(message, args)
        break
        
      case 'firstseen':
        await discordFirstSeenCommand(message, args)
        break
        
      case 'playerinfo':
        await discordPlayerInfoCommand(message, args)
        break
        
      case 'serverinfo':
        await discordServerInfoCommand(message)
        break
        
      case 'rank':
        await discordRankCommand(message, args)
        break
        
      case 'list':
        await discordListCommand(message)
        break
        
      case 'keeplist':
        await discordKeeplistCommand(message, args)
        break
        
      case 'drop':
        if (await isDiscordAdmin(member)) {
          await discordDropCommand(message, args)
        } else {
          message.reply('❌ Only admins can use this command.')
        }
        break
        
      case 'say':
        if (await isDiscordAdmin(member)) {
          await discordSayCommand(message, args)
        } else {
          message.reply('❌ Only admins can use this command.')
        }
        break
        
      case 'spam':
        if (await isDiscordAdmin(member)) {
          await discordSpamCommand(message, args)
        } else {
          message.reply('❌ Only admins can use this command.')
        }
        break
        
      case 'end':
        if (await isDiscordAdmin(member)) {
          await discordEndCommand(message)
        } else {
          message.reply('❌ Only admins can use this command.')
        }
        break
        
      case 'stop':
        if (await isDiscordOwner(member)) {
          await discordStopCommand(message)
        } else {
          message.reply('❌ Only the owner can use this command.')
        }
        break
        
      case 'ban':
        if (await isDiscordAdmin(member)) {
          await discordBanCommand(message, args)
        } else {
          message.reply('❌ Only admins can use this command.')
        }
        break
        
      case 'rotate':
        if (await isDiscordAdmin(member)) {
          await discordRotateCommand(message, args)
        } else {
          message.reply('❌ Only admins can use this command.')
        }
        break
        
      case 'players':
        await discordPlayersCommand(message)
        break
        
      case 'render':
        await discordRenderCommand(message)
        break
        
      case 'status':
        await discordStatusCommand(message)
        break
        
      case 'syncroles':
        if (await isDiscordOwner(member)) {
          await discordSyncRolesCommand(message)
        } else {
          message.reply('❌ Only the owner can use this command.')
        }
        break
        
      default:
        message.reply(`❌ Unknown command. Use \`!help\` for command list.`)
    }
  } catch (error) {
    console.error('[DISCORD] Command error:', error)
    message.reply('❌ An error occurred while processing your command.')
  }
}

// -----------------------------
// Discord command implementations
// -----------------------------
async function sendDiscordHelp(message) {
  const discordUsername = message.author.username
  const isOwnerUser = await isDiscordOwner(discordUsername)
  const isAdminUser = await isDiscordAdmin(discordUsername)
  const isTrustedUser = await isDiscordTrusted(discordUsername)
  
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('🤖 JuroBot Discord Commands')
    .setDescription('All commands start with `!`')
    .addFields(
      { name: '📋 Default Commands', value: '`help`, `inv`, `info`, `shop`, `wordle`, `seen <player>`, `firstseen <player>`, `playerinfo <player>`, `serverinfo`, `rank [player]`, `rank list`, `list`, `keeplist list`, `players`, `render`, `status`' }
    )
  
  if (isTrustedUser) {
    embed.addFields({ name: '👥 Trusted Commands', value: '*(No additional trusted commands)*' })
  }
  
  if (isAdminUser) {
    embed.addFields(
      { name: ' Admin Commands', value: '`drop <item> <amount>`, `drop all`, `say <message>`, `spam <msg1> <msg2> <delay>`, `spam stop`, `keeplist add <item>`, `keeplist remove <item>`, `ban <player> [reason]`, `ban unban <player>`, `ban list`, `rotate <degrees>`, `rotate player <name>`, `end`, `rotate north|south|east|west|left|right|up|down`' }
    )
  }
  
  if (isOwnerUser) {
    embed.addFields(
      { name: '👑 Owner Commands', value: '`rank add <player> <role>`, `rank remove <player>`, `stop`, `syncroles`' }
    )
  }
  
  embed.setFooter({ text: 'Prefixes in Minecraft: juro: or *' })
  
  message.reply({ embeds: [embed] })
}

async function discordInventoryCommand(message) {
  if (!bot || !botOnline) {
    message.reply('❌ Bot is offline.')
    return
  }
  
  // Set bot busy to prevent idle look North from overriding this for 5 seconds
  isBotBusy = true
  setTimeout(() => { isBotBusy = false }, 5000)
  
  const inventorySummary = {}
  for (const item of bot.inventory.items()) {
    inventorySummary[item.name] = (inventorySummary[item.name] || 0) + item.count
  }
  
  if (Object.keys(inventorySummary).length === 0) {
    message.reply('📦 **Empty**')
    return
  }
  
  const inventoryText = Object.entries(inventorySummary)
    .map(([name, count]) => `• ${name}: **${count}x**`)
    .join('\n')
  
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('📦 Bot Inventory')
    .setDescription(inventoryText)
    .setTimestamp()
  
  message.reply({ embeds: [embed] })
}

async function discordInfoCommand(message) {
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('🤖 JuroBot Information')
    .setDescription('JuroBot was created by JuroBot5000. This bot is made for fun.')
    .addFields(
      { name: '🖥️ Minecraft Server', value: CONFIG.host, inline: true },
      { name: '👤 Bot Username', value: CONFIG.username, inline: true },
      { name: '📊 Status', value: botOnline ? '🟢 Online' : '🔴 Offline', inline: true }
    )
    .setFooter({ text: 'Use !help for commands' })
  
  message.reply({ embeds: [embed] })
}

async function discordShopCommand(message) {
  message.reply('join the shop discord at https://discord.gg/M2JUtYBqrt')
}

async function discordWordleCommand(message) {
  startWordle()
  message.reply(' Wordle game started in Minecraft! Guess the 5-letter word in Minecraft chat.')
}

async function discordSeenCommand(message, args) {
  if (!args[0]) {
    message.reply('❌ Usage: `!seen <player>`')
    return
  }
  
  const targetName = args[0]
  if (bot.players[targetName]) {
    await updateLastSeen(targetName)
    message.reply(`✅ **${targetName}**!`)
  } else {
    const player = await getPlayer(targetName)
    if (player) {
      const last = new Date(player.last_seen)
      message.reply(`⏰ **${targetName}** was last seen online at ${last.toLocaleString()}`)
    } else {
      message.reply(`❌ No record of player **${targetName}**.`)
    }
  }
}

async function discordFirstSeenCommand(message, args) {
  if (!args[0]) {
    message.reply('❌ Usage: `!firstseen <player>`')
    return
  }
  
  const targetName = args[0]
  const player = await getPlayer(targetName)
  if (player) {
    const first = new Date(player.first_seen)
    message.reply(`📅 **${targetName}** first joined on ${first.toLocaleString()}`)
  } else {
    message.reply(`❌ No record of player **${targetName}**.`)
  }
}

async function discordPlayerInfoCommand(message, args) {
  if (!args[0]) {
    message.reply('❌ Usage: `!playerinfo <player>`')
    return
  }
  
  const targetName = args[0]
  const player = await getPlayer(targetName)
  if (player) {
    const first = new Date(player.first_seen).toLocaleString()
    const last = new Date(player.last_seen).toLocaleString()
    const role = player.role.charAt(0).toUpperCase() + player.role.slice(1)
    
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(`👤 Player Info: ${targetName}`)
      .addFields(
        { name: '🎭 Role', value: role, inline: true },
        { name: '💀 Deaths', value: player.deaths.toString(), inline: true },
        { name: ' Chat Messages', value: player.chat_messages.toString(), inline: true },
        { name: '📅 First Seen', value: first, inline: false },
        { name: '⏰ Last Seen', value: last, inline: false }
      )
    
    if (player.first_chat) {
      embed.addFields({ name: '💭 First Chat', value: `"${player.first_chat}"`, inline: false })
    }
    
    message.reply({ embeds: [embed] })
  } else {
    message.reply(`❌ No record of player **${targetName}**.`)
  }
}

async function discordServerInfoCommand(message) {
  const stats = await getServerStats()
  
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('📊 Server Statistics')
    .addFields(
      { name: '👥 Total Players', value: (stats.total_players || 0).toString(), inline: true },
      { name: '💀 Total Deaths', value: (stats.total_deaths || 0).toString(), inline: true },
      { name: ' Total Chat Messages', value: (stats.total_chat_messages || 0).toString(), inline: true }
    )
    .setTimestamp()
  
  message.reply({ embeds: [embed] })
}

async function discordRankCommand(message, args) {
  const discordUsername = message.author.username
  
  if (args[0]?.toLowerCase() === 'list') {
    try {
      const [rows] = await db.execute(
        `SELECT username, role FROM players WHERE role != 'player' ORDER BY 
         CASE role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'trusted' THEN 3 ELSE 4 END, username`
      )
      
      if (rows.length === 0) {
        message.reply('📋 No players with special ranks')
        return
      }
      
      const owners = rows.filter(r => r.role === 'owner')
      const admins = rows.filter(r => r.role === 'admin')
      const trusted = rows.filter(r => r.role === 'trusted')
      
      let description = ''
      if (owners.length > 0) {
        description += `**👑 Owners:** ${owners.map(r => r.username).join(', ')}\n`
      }
      if (admins.length > 0) {
        description += `** Admins:** ${admins.map(r => r.username).join(', ')}\n`
      }
      if (trusted.length > 0) {
        description += `**👥 Trusted:** ${trusted.map(r => r.username).join(', ')}\n`
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📋 Ranked Players')
        .setDescription(description)
      
      message.reply({ embeds: [embed] })
    } catch (err) {
      console.error('[DB] Error listing ranks:', err)
      message.reply('❌ Failed to list ranks')
    }
    return
  }
  
  if (args[0]?.toLowerCase() === 'remove') {
    if (!(await isDiscordOwner(discordUsername))) {
      message.reply('❌ Only the owner can remove ranks')
      return
    }
    
    const targetPlayer = args[1]
    if (!targetPlayer) {
      message.reply('❌ Usage: `!rank remove <player>`')
      return
    }
    
    if (targetPlayer === 'JuroBot5000') {
      message.reply('❌ Cannot remove rank from hardcoded owner')
      return
    }
    
    await setPlayerRole(targetPlayer, 'player')
    message.reply(`✅ Removed rank from **${targetPlayer}**`)
    return
  }
  
  if (!args[0] || args[0].toLowerCase() !== 'add') {
    const target = args[0] || discordUsername
    const player = await getPlayer(target)
    
    if (!player) {
      message.reply(`❌ **${target}** has no rank data`)
      return
    }
    
    const roleDisplay = player.role.charAt(0).toUpperCase() + player.role.slice(1)
    message.reply(`🎭 **${target}** has rank: **${roleDisplay}**`)
    return
  }
  
  if (!(await isDiscordOwner(discordUsername))) {
    message.reply('❌ Only the owner can assign ranks')
    return
  }
  
  const targetPlayer = args[1]
  const newRole = args[2]?.toLowerCase()
  
  if (!targetPlayer || !newRole) {
    message.reply('❌ Usage: `!rank add <player> <owner|admin|trusted|player>`')
    return
  }
  
  if (!['owner', 'admin', 'trusted', 'player'].includes(newRole)) {
    message.reply('❌ Valid roles: owner, admin, trusted, player')
    return
  }
  
  await setPlayerRole(targetPlayer, newRole)
  const roleDisplay = newRole.charAt(0).toUpperCase() + newRole.slice(1)
  message.reply(`✅ Set **${targetPlayer}** to **${roleDisplay}**`)
}

async function discordListCommand(message) {
  if (!bot || !botOnline) {
    message.reply('❌ Bot is offline.')
    return
  }
  
  const players = Object.keys(bot.players).filter(p => p !== bot.username)
  if (players.length === 0) {
    message.reply('👤 Nobody online')
  } else {
    message.reply(`👤 **Players online (${players.length}):** ${players.join(', ')}`)
  }
}

async function discordKeeplistCommand(message, args) {
  const discordUsername = message.author.username
  
  if (args[0]?.toLowerCase() === 'list') {
    const total = SPECIAL_ITEMS.length
    
    let description = `**Total manually added:** ${total}\n\n`
    description += SPECIAL_ITEMS.join(', ') + '\n\n'
    description += `*Note: All items ending in \`_spawn_egg\` (Enabled: ${CONFIG.collect_spawn_eggs}) or containing \`shulker\` (Enabled: ${CONFIG.collect_shulkers}) are automatically kept.*`
    
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('📋 Keeplist Items')
      .setDescription(description)
    
    message.reply({ embeds: [embed] })
    return
  }
  
  if (!(await isDiscordAdmin(discordUsername))) {
    message.reply('❌ Only admins can modify the keeplist')
    return
  }
  
  const targetItem = args[1]
  if (!targetItem) {
    message.reply('❌ Usage: `!keeplist <add|remove|list> [item]`')
    return
  }
  
  if (args[0]?.toLowerCase() === 'add') {
    if (isKeeplistItem(targetItem)) {
      message.reply(`❌ **${targetItem}** is already in the keeplist or automatically kept`)
      return
    }
    
    SPECIAL_ITEMS.push(targetItem)
    if (saveItems()) {
      message.reply(`✅ Added **${targetItem}** to keeplist`)
    } else {
      SPECIAL_ITEMS.pop()
      message.reply('❌ Failed to add to keeplist (file error)')
    }
  } else if (args[0]?.toLowerCase() === 'remove') {
    const index = SPECIAL_ITEMS.indexOf(targetItem)
    if (index === -1) {
      message.reply(`❌ **${targetItem}** is not in the keeplist`)
      return
    }
    
    SPECIAL_ITEMS.splice(index, 1)
    if (saveItems()) {
      message.reply(`✅ Removed **${targetItem}** from keeplist`)
    } else {
      SPECIAL_ITEMS.splice(index, 0, targetItem)
      message.reply('❌ Failed to remove from keeplist (file error)')
    }
  } else {
    message.reply('❌ Usage: `!keeplist <add|remove|list> [item]`')
  }
}

async function discordDropCommand(message, args) {
  if (!bot || !botOnline) {
    message.reply('❌ Bot is offline.')
    return
  }
  
  const itemName = args[0]
  const amount = args[1]
  
  if (itemName?.toLowerCase() === 'all') {
    const items = bot.inventory.items()
    if (items.length === 0) {
      message.reply('📦 Empty')
      return
    }
    
    queueMessage(`[DROP] Dropping all ${items.length} item stacks...`)
    for (const item of items) {
      try {
        const itemCount = item.count
        const itemNameInInv = item.name
        await bot.tossStack(item)
        updateStock(itemNameInInv, itemCount)
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (err) {
        console.error('Drop error:', err)
      }
    }
    message.reply(`✅ Dropped all **${items.length}** item stacks`)
    return
  }
  
  if (!itemName || !amount) {
    message.reply('❌ Usage: `!drop <item> <amount>` OR `!drop all`')
    return
  }
  
  const amountNum = parseInt(amount)
  if (isNaN(amountNum) || amountNum <= 0) {
    message.reply('❌ Amount must be a positive number')
    return
  }
  
  const item = bot.inventory.items().find(i => i.name === itemName)
  if (!item) {
    message.reply(`❌ Item **"${itemName}"** not found in inventory`)
    return
  }
  
  const dropAmount = Math.min(amountNum, item.count)
  
  try {
    const itemNameInInv = item.name
    await bot.toss(item.type, null, dropAmount)
    updateStock(itemNameInInv, dropAmount)
    message.reply(`✅ Dropped **${dropAmount}x ${itemName}**`)
  } catch (err) {
    message.reply(`❌ Failed to drop **${itemName}**`)
  }
}

async function discordSayCommand(message, args) {
  if (!bot || !botOnline) {
    message.reply('❌ Bot is offline.')
    return
  }
  
  const text = args.join(' ')
  if (!text) {
    message.reply('❌ Usage: `!say <message>`')
    return
  }
  
  queueMessage(text)
  message.reply(`✅ Sent message to Minecraft: "${text}"`)
}

async function discordSpamCommand(message, args) {
  const discordUsername = message.author.username
  
  if (args[0]?.toLowerCase() === 'stop') {
    if (spamState.active) {
      spamState.active = false
      if (spamInterval) {
        clearInterval(spamInterval)
        spamInterval = null
      }
      message.reply('🛑 Spam stopped')
    } else {
      message.reply('️ No active spam to stop')
    }
    return
  }
  
  const message1 = args[0]
  const message2 = args[1]
  const delay = parseFloat(args[2])
  
  if (!message1 || !message2 || isNaN(delay) || delay <= 0) {
    message.reply('❌ Usage: `!spam <message1> <message2> <delay_seconds>` OR `!spam stop`')
    message.reply('️ Delay supports decimals (e.g., 0.1 for 100ms)')
    return
  }
  
  if (spamState.active) {
    message.reply('❌ Spam already running. Use `!spam stop` first')
    return
  }
  
  const msg1 = message1.replace(/_/g, ' ')
  const msg2 = message2.replace(/_/g, ' ')
  
  spamState.active = true
  spamState.messages = [msg1, msg2]
  spamState.delay = delay * 1000
  spamState.currentIndex = 0
  
  message.reply(`✅ Started spam: "${msg1}" / "${msg2}" every ${delay}s`)
  queueMessage(spamState.messages[0])
  spamState.currentIndex = 1
  
  spamInterval = setInterval(() => {
    if (!spamState.active) {
      clearInterval(spamInterval)
      spamInterval = null
      return
    }
    queueMessage(spamState.messages[spamState.currentIndex])
    spamState.currentIndex = (spamState.currentIndex + 1) % spamState.messages.length
  }, spamState.delay)
}

async function discordEndCommand(message) {
  queueMessage(' Bot is reconnecting...')
  message.reply('🔄 Bot is reconnecting...')
  if (bot) {
    bot.end()
  }
  reconnect()
}

async function discordStopCommand(message) {
  message.reply('🛑 Bot is shutting down...')
  setTimeout(() => {
    process.exit(0)
  }, 1000)
}

async function discordBanCommand(message, args) {
  if (!args || args.length === 0) {
    message.reply('❌ Usage: `!ban <player> [reason]` OR `!ban unban <player>` OR `!ban list`')
    return
  }
  
  const subcommand = args[0]?.toLowerCase()
  
  if (subcommand === 'list') {
    const bannedList = await getBannedPlayers()
    if (bannedList.length === 0) {
      message.reply('📋 No banned players')
      return
    }
    
    let description = `**Banned players (${bannedList.length}):**\n\n`
    for (const ban of bannedList) {
      const reason = ban.reason ? ` - ${ban.reason}` : ''
      description += `• **${ban.username}** (by ${ban.banned_by})${reason}\n`
    }
    
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🚫 Banned Players')
      .setDescription(description)
    
    message.reply({ embeds: [embed] })
    return
  }
  
  if (subcommand === 'unban') {
    const targetPlayer = args[1]
    if (!targetPlayer) {
      message.reply('❌ Usage: `!ban unban <player>`')
      return
    }
    
    const success = await unbanPlayer(targetPlayer)
    if (success) {
      message.reply(`✅ Unbanned **${targetPlayer}**`)
    } else {
      message.reply('❌ Failed to unban player')
    }
    return
  }
  
  const targetPlayer = args[0]
  const reason = args.slice(1).join(' ') || 'No reason provided'
  
  if (targetPlayer === 'JuroBot5000') {
    message.reply('❌ Cannot ban the owner')
    return
  }
  
  const success = await banPlayer(targetPlayer, message.author.username, reason)
  if (success) {
    message.reply(`✅ Banned **${targetPlayer}**: ${reason}`)
  } else {
    message.reply('❌ Failed to ban player')
  }
}

async function discordRotateCommand(message, args) {
  if (!bot || !botOnline) {
    message.reply('❌ Bot is offline.')
    return
  }
  
  if (!args || args.length === 0) {
    message.reply('❌ Usage: `!rotate <degrees>` OR `!rotate player <playername>` OR `!rotate <north|south|east|west|left|right|up|down>`')
    return
  }
  
  // Set bot busy to prevent idle look North from overriding this rotation for 5 seconds
  isBotBusy = true
  setTimeout(() => { isBotBusy = false }, 5000)
  
  const subcommand = args[0]?.toLowerCase()
  
  if (subcommand === 'player') {
    const targetPlayer = args[1]
    if (!targetPlayer) {
      message.reply('❌ Usage: `!rotate player <playername>`')
      return
    }
    
    const player = bot.players[targetPlayer]
    if (!player || !player.entity) {
      message.reply(`❌ Player **${targetPlayer}** not found or not visible`)
      return
    }
    
    bot.lookAt(player.entity.position.offset(0, player.entity.height, 0))
    message.reply(`✅ Now looking at **${targetPlayer}**`)
    return
  }
  
  if (subcommand === 'north' || subcommand === 'south' || subcommand === 'east' || subcommand === 'west' || 
      subcommand === 'left' || subcommand === 'right' || subcommand === 'up' || subcommand === 'down') {
    
    let yaw = bot.entity.yaw
    let pitch = bot.entity.pitch
    
    switch (subcommand) {
      case 'north':
        yaw = -Math.PI
        break
      case 'south':
        yaw = 0
        break
      case 'east':
        yaw = -Math.PI / 2
        break
      case 'west':
        yaw = Math.PI / 2
        break
      case 'left':
        yaw -= Math.PI / 4
        break
      case 'right':
        yaw += Math.PI / 4
        break
      case 'up':
        pitch -= Math.PI / 4
        break
      case 'down':
        pitch += Math.PI / 4
        break
    }
    
    yaw = ((yaw + Math.PI) % (2 * Math.PI)) - Math.PI
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch))
    
    bot.look(yaw, pitch, true)
    message.reply(`✅ Rotated to face **${subcommand.toUpperCase()}**`)
    return
  }
  
  const degrees = parseFloat(args[0])
  if (isNaN(degrees)) {
    message.reply('❌ Usage: `!rotate <degrees>` OR `!rotate player <playername>` OR `!rotate <north|south|east|west|left|right|up|down>`')
    return
  }
  
  const radians = degrees * (Math.PI / 180)
  bot.look(bot.entity.yaw + radians, bot.entity.pitch, true)
  message.reply(`✅ Rotated **${degrees}** degrees`)
}

async function discordPlayersCommand(message) {
  if (!bot || !botOnline) {
    message.reply('❌ Bot is offline.')
    return
  }
  
  // Set bot busy to prevent idle look North from overriding this for 5 seconds
  isBotBusy = true
  setTimeout(() => { isBotBusy = false }, 5000)
  
  const players = Object.keys(bot.players).filter(p => p !== bot.username)
  if (players.length === 0) {
    message.reply('👤 **Nobody online**')
  } else {
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle(`👤 Online Players (${players.length})`)
      .setDescription(players.join('\n'))
      .setTimestamp()
    
    message.reply({ embeds: [embed] })
  }
}

async function discordRenderCommand(message) {
  if (!bot || !botOnline) {
    message.reply('❌ Bot is offline.')
    return
  }
  
  // Set bot busy to prevent idle look North from overriding this for 5 seconds
  isBotBusy = true
  setTimeout(() => { isBotBusy = false }, 5000)
  
  const playersInRender = []
  for (const [name, player] of Object.entries(bot.players)) {
    if (name === bot.username) continue
    if (player.entity) {
      const pos = player.entity.position
      const distance = bot.entity.position.distanceTo(pos)
      playersInRender.push({
        name: name,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        z: Math.round(pos.z),
        distance: Math.round(distance)
      })
    }
  }
  
  if (playersInRender.length === 0) {
    message.reply('👤 **No players in render distance**')
    return
  }
  
  playersInRender.sort((a, b) => a.distance - b.distance)
  
  let description = ''
  for (const p of playersInRender) {
    description += `**${p.name}** - (${p.x}, ${p.y}, ${p.z}) - ${p.distance}m\n`
  }
  
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle(`👁️ Players in Render (${playersInRender.length})`)
    .setDescription(description)
    .setTimestamp()
  
  message.reply({ embeds: [embed] })
}

async function discordStatusCommand(message) {
  // Set bot busy to prevent idle look North from overriding this for 5 seconds
  isBotBusy = true
  setTimeout(() => { isBotBusy = false }, 5000)
  
  const stats = await getServerStats()
  
  const embed = new EmbedBuilder()
    .setColor(botOnline ? 0x00FF00 : 0xFF0000)
    .setTitle('📊 JuroBot Status')
    .addFields(
      { name: '🟢 Bot Status', value: botOnline ? 'Online' : 'Offline', inline: true },
      { name: '👤 Bot Username', value: CONFIG.username, inline: true },
      { name: '🌐 Server', value: CONFIG.host, inline: true }
    )
  
  if (bot && bot.players) {
    const players = Object.keys(bot.players).filter(p => p !== bot.username)
    embed.addFields({ name: '👥 Online Players', value: players.length.toString(), inline: true })
  }
  
  embed.addFields(
    { name: '👥 Total Players', value: (stats.total_players || 0).toString(), inline: true },
    { name: '💀 Total Deaths', value: (stats.total_deaths || 0).toString(), inline: true },
    { name: ' Total Chat', value: (stats.total_chat_messages || 0).toString(), inline: true }
  )
  
  message.reply({ embeds: [embed] })
}

async function discordSyncRolesCommand(message) {
  try {
    const guild = discordClient.guilds.cache.get(CONFIG.discord.guildId)
    if (!guild) {
      message.reply('❌ Could not find Discord server')
      return
    }
    
    await guild.members.fetch()
    const members = guild.members.cache
    
    let syncedCount = 0
    
    for (const member of members.values()) {
      if (member.user.bot) continue
      
      const discordUsername = member.user.username
      let role = 'player'
      
      if (await isDiscordOwner(discordUsername)) {
        role = 'owner'
      } else if (await isDiscordAdmin(discordUsername)) {
        role = 'admin'
      } else if (await isDiscordTrusted(discordUsername)) {
        role = 'trusted'
      }
      
      const player = await getPlayer(discordUsername)
      if (player && player.role !== role) {
        await setPlayerRole(discordUsername, role)
        syncedCount++
      } else if (!player) {
        await setPlayerRole(discordUsername, role)
        syncedCount++
      }
    }
    
    message.reply(`✅ Synced roles for **${syncedCount}** Discord users to Minecraft`)
  } catch (error) {
    console.error('[DISCORD] Sync error:', error)
    message.reply('❌ Failed to sync roles')
  }
}

// -----------------------------
// Send message to Discord channel
// -----------------------------
async function sendToDiscordChannel(message, colorCode = null) {
  if (!discordChannel) return
  try {
    let formatted = "```ansi\n"
    if (colorCode) formatted += colorCode
    formatted += message + "\u001b[0m\n```"
    
    if (formatted.length > 2000) {
      const chunks = message.match(/.{1,1900}/g) || []
      for (const chunk of chunks) {
        let chunkFormatted = "```ansi\n"
        if (colorCode) chunkFormatted += colorCode
        chunkFormatted += chunk + "\u001b[0m\n```"
        await discordChannel.send(chunkFormatted)
      }
    } else await discordChannel.send(formatted)
  } catch (err) { console.error('[DISCORD] Main channel error:', err) }
}

async function sendToDiscordPM(message, colorCode = null) {
  if (!discordPrivateChannel) return
  try {
    let formatted = "```ansi\n"
    if (colorCode) formatted += colorCode
    formatted += message + "\u001b[0m\n```"
    
    if (formatted.length > 2000) {
      const chunks = message.match(/.{1,1900}/g) || []
      for (const chunk of chunks) {
        let chunkFormatted = "```ansi\n"
        if (colorCode) chunkFormatted += colorCode
        chunkFormatted += chunk + "\u001b[0m\n```"
        await discordPrivateChannel.send(chunkFormatted)
      }
    } else await discordPrivateChannel.send(formatted)
  } catch (err) { console.error('[DISCORD] PM channel error:', err) }
}

async function sendToDiscordAlert(message, colorCode = null) {
  if (!discordAlertChannel) return
  try {
    let formatted = "```ansi\n"
    if (colorCode) formatted += colorCode
    formatted += message + "\u001b[0m\n```"
    
    if (formatted.length > 2000) {
      const chunks = message.match(/.{1,1900}/g) || []
      for (const chunk of chunks) {
        let chunkFormatted = "```ansi\n"
        if (colorCode) chunkFormatted += colorCode
        chunkFormatted += chunk + "\u001b[0m\n```"
        await discordAlertChannel.send(chunkFormatted)
      }
    } else await discordAlertChannel.send(formatted)
  } catch (err) { console.error('[DISCORD] Alert channel error:', err) }
}

async function sendToDiscordBase(message, colorCode = null) {
  if (!discordBasesChannel) return
  try {
    let formatted = "```ansi\n"
    if (colorCode) formatted += colorCode
    formatted += message + "\u001b[0m\n```"
    
    if (formatted.length > 2000) {
      const chunks = message.match(/.{1,1900}/g) || []
      for (const chunk of chunks) {
        let chunkFormatted = "```ansi\n"
        if (colorCode) chunkFormatted += colorCode
        chunkFormatted += chunk + "\u001b[0m\n```"
        await discordBasesChannel.send(chunkFormatted)
      }
    } else await discordBasesChannel.send(formatted)
  } catch (err) { console.error('[DISCORD] Bases channel error:', err) }
}

// -----------------------------
// Initialize database connection
// -----------------------------
async function initDatabase() {
  try {
    const DB_CONFIG = {
      host: CONFIG.database.host,
      user: CONFIG.database.user,
      password: CONFIG.database.password,
      database: CONFIG.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    }
    
    db = await mysql.createPool(DB_CONFIG)
    logToConsole('[DB] Connected to MariaDB')
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(16) UNIQUE NOT NULL,
        first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        playtime INT DEFAULT 0,
        deaths INT DEFAULT 0,
        chat_messages INT DEFAULT 0,
        first_chat TEXT,
        role ENUM('owner', 'admin', 'trusted', 'player') DEFAULT 'player',
        INDEX idx_username (username),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    // Ensure 'playtime' column exists (migration for existing tables)
    try {
      const [columns] = await db.execute(`SHOW COLUMNS FROM players LIKE 'playtime'`)
      if (columns.length === 0) {
        logToConsole('[DB] Adding playtime column to players table...')
        await db.execute(`ALTER TABLE players ADD COLUMN playtime INT DEFAULT 0 AFTER last_seen`)
      }
    } catch (err) {
      console.error('[DB] Migration error (playtime):', err)
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS item_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_name VARCHAR(100) NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_item_name (item_name),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS all_item_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_name VARCHAR(100) NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_item_all_name (item_name),
        INDEX idx_timestamp_all (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS server_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stat_name VARCHAR(50) UNIQUE NOT NULL,
        stat_value BIGINT DEFAULT 0,
        INDEX idx_stat_name (stat_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    
    // Check if keeplist table exists and has old schema (username column)
    try {
      const [columns] = await db.execute(`SHOW COLUMNS FROM keeplist WHERE Field = 'username'`)
      if (columns.length > 0) {
        // Old schema detected, drop and recreate
        logToConsole('[DB] Migrating keeplist table from old schema...')
        await db.execute(`DROP TABLE keeplist`)
      }
    } catch (err) {
      // Table doesn't exist yet, that's fine
    }
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS keeplist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_name VARCHAR(100) UNIQUE NOT NULL,
        added_by VARCHAR(16),
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_item_name (item_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS banned_players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(16) UNIQUE NOT NULL,
        banned_by VARCHAR(16),
        banned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reason TEXT,
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        player_count INT,
        bot_ping INT,
        player_names TEXT,
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(16) NOT NULL,
        message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    // Check if player_names column exists (upgrade for existing databases)
    try {
      const [cols] = await db.execute("SHOW COLUMNS FROM activity_log LIKE 'player_names'")
      if (cols.length === 0) {
        await db.execute("ALTER TABLE activity_log ADD COLUMN player_names TEXT")
        logToConsole('[DB] Upgraded activity_log table: added player_names column')
      }
    } catch (e) {}
    
    await db.execute(`INSERT IGNORE INTO server_stats (stat_name, stat_value) VALUES ('total_players', 0)`)
    await db.execute(`INSERT IGNORE INTO server_stats (stat_name, stat_value) VALUES ('total_chat_messages', 0)`)
    await db.execute(`INSERT IGNORE INTO server_stats (stat_name, stat_value) VALUES ('total_deaths', 0)`)
    
    logToConsole('[DB] Database tables initialized')
  } catch (err) {
    console.error('[DB] Failed to connect:', err)
    process.exit(1)
  }
}

// -----------------------------
// Command cooldown (silent) - 2 seconds
// -----------------------------
const COMMAND_DELAY = 2000
let lastCommandTime = 0
function canRunCommand() {
  const now = Date.now()
  if (now - lastCommandTime < COMMAND_DELAY) return false
  lastCommandTime = now
  return true
}

// -----------------------------
// Message queue with no delay (fast responses)
// -----------------------------
const messageQueue = []
let isProcessingQueue = false
let shopInterval = null

function queueMessage(message) {
  messageQueue.push(message)
  processMessageQueue()
}

async function processMessageQueue() {
  if (isProcessingQueue || messageQueue.length === 0) return
  isProcessingQueue = true
  
  while (messageQueue.length > 0) {
    const message = messageQueue.shift()
    if (bot && botOnline) {
      bot.chat(message)
      // Small delay to prevent spam kick (1000ms)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  isProcessingQueue = false
}

// -----------------------------
// Command prefix detection
// -----------------------------
function parseCommand(message) {
  const lower = message.toLowerCase().trim()
  if (lower.startsWith('juro:')) {
    return { prefix: 'juro:', command: message.substring(5).trim(), original: message }
  } else if (lower.startsWith('*')) {
    return { prefix: '*', command: message.substring(1).trim(), original: message }
  }
  return null
}

let bot
let botOnline = false
let lastVindicatorLog = 0
let knownSpecialItems = {}
let chatLog = []
let reconnecting = false
let consoleLogs = []
let spamInterval = null
let spamState = {
  active: false,
  messages: [],
  delay: 0,
  currentIndex: 0
}

// -----------------------------
// Discord webhook
// -----------------------------
async function sendToDiscord(message) {
  try {
    const formatted = "```ansi\n" + message + "\u001b[0m\n```"
    await fetch(CONFIG.discord_webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: formatted })
    })
  } catch (err) {
    console.error('Discord webhook error:', err.message)
  }
}

async function sendToChatWebhook(message) {
  try {
    const url = CONFIG.discord_webhook
    if (!url || url === 'YOUR_WEBHOOK_URL_HERE') return
    const formatted = "```ansi\n" + message + "\u001b[0m\n```"
    if (formatted.length > 2000) {
      const chunks = message.match(/.{1,1900}/g) || []
      for (const chunk of chunks) {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: "```ansi\n" + chunk + "\u001b[0m\n```" })
        })
      }
    } else {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: formatted })
      })
    }
  } catch (err) {
    console.error('Chat webhook error:', err.message)
  }
}

// -----------------------------
// Wordle game state
// -----------------------------
let currentWordle = null
let wordleGuesses = []
let wordleTimeout = null

let activityLogInterval = null
let idleLookInterval = null

// -----------------------------
// Database helper functions
// -----------------------------
async function getPlayer(username) {
  try {
    const [rows] = await db.execute('SELECT * FROM players WHERE username = ?', [username])
    return rows[0] || null
  } catch (err) {
    console.error('[DB] Error getting player:', err)
    return null
  }
}

async function updateLastSeen(username) {
  try {
    const [result] = await db.execute(
      `INSERT INTO players (username, last_seen, playtime) VALUES (?, NOW(), 0) 
       ON DUPLICATE KEY UPDATE last_seen = NOW(), playtime = playtime + 5`,
      [username]
    )
    
    if (result.affectedRows === 1 && result.insertId > 0) {
      await db.execute(`UPDATE server_stats SET stat_value = stat_value + 1 WHERE stat_name = 'total_players'`)
    }
  } catch (err) {
    console.error('[DB] Error updating last seen:', err)
  }
}

async function incrementChatMessage(username, message) {
  try {
    const player = await getPlayer(username)
    
    if (player && !player.first_chat) {
      await db.execute(
        `UPDATE players SET chat_messages = chat_messages + 1, first_chat = ? WHERE username = ?`,
        [message, username]
      )
    } else {
      await db.execute(
        `UPDATE players SET chat_messages = chat_messages + 1 WHERE username = ?`,
        [username]
      )
    }

    await db.execute(
      `INSERT INTO chat_logs (username, message) VALUES (?, ?)`,
      [username, message]
    )
    
    await db.execute(`UPDATE server_stats SET stat_value = stat_value + 1 WHERE stat_name = 'total_chat_messages'`)
  } catch (err) {
    console.error('[DB] Error incrementing chat message:', err)
  }
}

async function incrementDeath(username) {
  try {
    await db.execute(
      `UPDATE players SET deaths = deaths + 1 WHERE username = ?`,
      [username]
    )
    await db.execute(`UPDATE server_stats SET stat_value = stat_value + 1 WHERE stat_name = 'total_deaths'`)
  } catch (err) {
    console.error('[DB] Error incrementing death:', err)
  }
}

async function getServerStats() {
  try {
    const [rows] = await db.execute('SELECT * FROM server_stats')
    const stats = {}
    rows.forEach(row => {
      stats[row.stat_name] = row.stat_value
    })
    return stats
  } catch (err) {
    console.error('[DB] Error getting server stats:', err)
    return {}
  }
}

async function setPlayerRole(username, role) {
  try {
    await db.execute(
      `INSERT INTO players (username, role) VALUES (?, ?) ON DUPLICATE KEY UPDATE role = ?`,
      [username, role, role]
    )
  } catch (err) {
    console.error('[DB] Error setting player role:', err)
  }
}

// -----------------------------
// Keeplist database functions (now for items)
// -----------------------------
async function addToKeeplist(itemName, addedBy) {
  try {
    await db.execute(
      `INSERT INTO keeplist (item_name, added_by) VALUES (?, ?) ON DUPLICATE KEY UPDATE added_by = ?`,
      [itemName, addedBy, addedBy]
    )
    return true
  } catch (err) {
    console.error('[DB] Error adding to keeplist:', err)
    return false
  }
}

async function removeFromKeeplist(itemName) {
  try {
    await db.execute(`DELETE FROM keeplist WHERE item_name = ?`, [itemName])
    return true
  } catch (err) {
    console.error('[DB] Error removing from keeplist:', err)
    return false
  }
}

async function getKeeplist() {
  try {
    const [rows] = await db.execute('SELECT item_name FROM keeplist ORDER BY item_name')
    return rows.map(r => r.item_name)
  } catch (err) {
    console.error('[DB] Error getting keeplist:', err)
    return []
  }
}

async function isOnKeeplist(itemName) {
  try {
    const [rows] = await db.execute('SELECT 1 FROM keeplist WHERE item_name = ?', [itemName])
    return rows.length > 0
  } catch (err) {
    console.error('[DB] Error checking keeplist:', err)
    return false
  }
}

// -----------------------------
// Ban database functions
// -----------------------------
async function banPlayer(username, bannedBy, reason = '') {
  try {
    await db.execute(
      `INSERT INTO banned_players (username, banned_by, reason) VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE banned_by = ?, reason = ?, banned_at = NOW()`,
      [username, bannedBy, reason, bannedBy, reason]
    )
    return true
  } catch (err) {
    console.error('[DB] Error banning player:', err)
    return false
  }
}

async function unbanPlayer(username) {
  try {
    await db.execute(`DELETE FROM banned_players WHERE username = ?`, [username])
    return true
  } catch (err) {
    console.error('[DB] Error unbanning player:', err)
    return false
  }
}

async function isBanned(username) {
  try {
    const [rows] = await db.execute('SELECT 1 FROM banned_players WHERE username = ?', [username])
    return rows.length > 0
  } catch (err) {
    console.error('[DB] Error checking ban:', err)
    return false
  }
}

async function getBannedPlayers() {
  try {
    const [rows] = await db.execute('SELECT username, banned_by, banned_at, reason FROM banned_players ORDER BY banned_at DESC')
    return rows
  } catch (err) {
    console.error('[DB] Error getting banned players:', err)
    return []
  }
}

// -----------------------------
// Activity Logging
// -----------------------------
async function logActivity() {
  if (!bot || !botOnline) return
  
  try {
    const ping = bot.player ? bot.player.ping : 0
    const allPlayers = Object.keys(bot.players).filter(p => p !== bot.username)
    const playerCount = allPlayers.length
    const playerNames = allPlayers.join(',')
    
    await db.execute(
      'INSERT INTO activity_log (player_count, bot_ping, player_names) VALUES (?, ?, ?)',
      [playerCount, ping, playerNames]
    )
    
    // Cleanup old logs (keep 7 days)
    await db.execute('DELETE FROM activity_log WHERE timestamp < DATE_SUB(NOW(), INTERVAL 7 DAY)')
    
  } catch (err) {
    console.error('[DB] Error logging activity:', err)
  }
}

async function getActivityLog(limit = 48) {
  try {
    const [rows] = await db.execute(
      'SELECT timestamp, player_count, bot_ping FROM activity_log ORDER BY timestamp DESC LIMIT ?',
      [limit]
    )
    return rows.reverse()
  } catch (err) {
    console.error('[DB] Error getting activity log:', err)
    return []
  }
}

async function getTopPlayers(limit = 10) {
  try {
    const [rows] = await db.execute(
      'SELECT username, playtime FROM players ORDER BY playtime DESC LIMIT ?',
      [limit]
    )
    return rows
  } catch (err) {
    console.error('[DB] Error getting top players:', err)
    return []
  }
}

async function getMostItems(limit = 10) {
  try {
    const [rows] = await db.execute(
      'SELECT item_name, COUNT(*) as count FROM item_logs GROUP BY item_name ORDER BY count DESC LIMIT ?',
      [limit]
    )
    return rows
  } catch (err) {
    console.error('[DB] Error getting most items:', err)
    return []
  }
}

// -----------------------------
// Permission helper functions
// -----------------------------
async function isOwner(playerName) {
  // Hardcoded owners
  if (playerName === 'JuroBot5000') return true
  
  const player = await getPlayer(playerName)
  return player && player.role === 'owner'
}

async function isAdmin(playerName) {
  // Hardcoded owners have all admin permissions
  if (playerName === 'JuroBot5000') return true
  
  const player = await getPlayer(playerName)
  return player && (player.role === 'admin' || player.role === 'owner')
}

async function isTrusted(playerName) {
  // Hardcoded owners have all trusted permissions
  if (playerName === 'JuroBot5000') return true
  
  const player = await getPlayer(playerName)
  return player && (player.role === 'trusted' || player.role === 'admin' || player.role === 'owner')
}

// -----------------------------
// Helper: Wordle feedback [x][~][OK]
// -----------------------------
function getWordleFeedback(answer, guess) {
  guess = guess.toUpperCase()
  answer = answer.toUpperCase()
  let result = Array(5).fill('[x]')
  const answerLetters = answer.split('')
  const used = Array(5).fill(false)
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answerLetters[i]) {
      result[i] = '[OK]'
      used[i] = true
    }
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] === '[OK]') continue
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guess[i] === answerLetters[j]) {
        result[i] = '[~]'
        used[j] = true
        break
      }
    }
  }
  return result.join('')
}

// -----------------------------
// End Wordle
// -----------------------------
function endWordle(reason = 'Timeout') {
  if (!currentWordle) return
  if (reason === 'Timeout') {
    queueMessage(`[WORDLE] Game ended after 5 minutes of inactivity. The word was ${currentWordle.answer}.`)
    sendToDiscord(`[WORDLE] Game ended after 5 minutes of inactivity. Word: ${currentWordle.answer}`)
    sendToDiscordChannel(`[WORDLE] Game ended after 5 minutes of inactivity. Word: ${currentWordle.answer}`)
  }
  currentWordle = null
  wordleGuesses = []
  if (wordleTimeout) {
    clearTimeout(wordleTimeout)
    wordleTimeout = null
  }
}

// -----------------------------
// Start new Wordle
// -----------------------------
async function startWordle() {
  if (currentWordle) {
    queueMessage('X A Wordle is already active! Please finish it first.')
    return
  }
  try {
    const res = await fetch('https://random-words-api.kushcreates.com/api?category=wordle&length=5&type=uppercase')
    if (!res.ok) throw new Error('Random Word API error')
    const json = await res.json()
    if (!Array.isArray(json) || json.length === 0) throw new Error('Empty API response')
    const randomIndex = Math.floor(Math.random() * json.length)
    const randomWordObj = json[randomIndex]
    const randomWord = randomWordObj.word.toUpperCase()
    if (!randomWord || randomWord.length !== 5) throw new Error('Invalid word from API')

    currentWordle = { answer: randomWord, date: 'RANDOM', guesses: [] }
    wordleGuesses = []

    queueMessage(`[WORDLE] Game started! Guess the 5-letter word in chat.`)
    sendToDiscord(`[WORDLE] Random Wordle started in Minecraft! Word: ${currentWordle.answer}`)
    sendToDiscordChannel(`[WORDLE] Random Wordle started! Guess the 5-letter word in Minecraft chat.`)

    if (wordleTimeout) clearTimeout(wordleTimeout)
    wordleTimeout = setTimeout(() => endWordle('Timeout'), 5 * 60 * 1000)
  } catch (err) {
    queueMessage('X Failed to start Wordle.')
    console.error('Wordle API error:', err)
  }
}

// -----------------------------
// Handle Wordle guess
// -----------------------------
function handleWordleGuess(playerName, guess) {
  if (!currentWordle) return
  guess = guess.toUpperCase()
  if (guess.length !== 5) return
  const feedback = getWordleFeedback(currentWordle.answer, guess)
  queueMessage(`<${playerName}> ${guess} ${feedback}`)
  sendToDiscordChannel(`[WORDLE] <${playerName}> ${guess} ${feedback}`)
  wordleGuesses.push({ playerName, guess })
  if (wordleTimeout) {
    clearTimeout(wordleTimeout)
    wordleTimeout = setTimeout(() => endWordle('Timeout'), 5 * 60 * 1000)
  }
  if (guess === currentWordle.answer) {
    queueMessage(`[WORDLE] Congratulations ${playerName}! You guessed the Wordle! The word was ${currentWordle.answer}.`)
    sendToDiscord(`[WORDLE] ${playerName} guessed the Wordle! Word: ${currentWordle.answer}`)
    sendToDiscordChannel(`🎉 [WORDLE] ${playerName} guessed the Wordle! The word was ${currentWordle.answer}.`)
    endWordle('Solved')
  }
}

// -----------------------------
// Seen command
// -----------------------------
async function seenCommand(targetName) {
  if (!targetName) return
  
  // Set bot busy to prevent idle look North from overriding this for 5 seconds
  isBotBusy = true
  setTimeout(() => { isBotBusy = false }, 5000)
  
  if (bot.players[targetName]) {
    queueMessage(`${targetName} is online`)
    await updateLastSeen(targetName)
  } else {
    const player = await getPlayer(targetName)
    if (player) {
      const last = new Date(player.last_seen)
      queueMessage(`${targetName}: ${last.toLocaleString()}`)
    } else {
      queueMessage(`No record: ${targetName}`)
    }
  }
}

// -----------------------------
// First seen command
// -----------------------------
async function firstSeenCommand(targetName) {
  if (!targetName) return
  
  // Set bot busy to prevent idle look North from overriding this for 5 seconds
  isBotBusy = true
  setTimeout(() => { isBotBusy = false }, 5000)
  
  const player = await getPlayer(targetName)
  if (player) {
    const first = new Date(player.first_seen)
    queueMessage(`${targetName} joined: ${first.toLocaleString()}`)
  } else {
    queueMessage(`No record: ${targetName}`)
  }
}

// -----------------------------
// Player info command
// -----------------------------
async function playerInfoCommand(targetName) {
  if (!targetName) return
  
  // Set bot busy to prevent idle look North from overriding this for 5 seconds
  isBotBusy = true
  setTimeout(() => { isBotBusy = false }, 5000)
  
  const player = await getPlayer(targetName)
  if (player) {
    queueMessage(`${targetName}: ${player.role} | Deaths: ${player.deaths} | Msgs: ${player.chat_messages}`)
  } else {
    queueMessage(`No record: ${targetName}`)
  }
}

// -----------------------------
// Server info command
// -----------------------------
async function serverInfoCommand() {
  // Set bot busy to prevent idle look North from overriding this for 5 seconds
  isBotBusy = true
  setTimeout(() => { isBotBusy = false }, 5000)
  
  const stats = await getServerStats()
  queueMessage(`Players: ${stats.total_players || 0} | Deaths: ${stats.total_deaths || 0} | Messages: ${stats.total_chat_messages || 0}`)
}

// -----------------------------
// List command
// -----------------------------
function listCommand() {
  // Set bot busy to prevent idle look North from overriding this for 5 seconds
  isBotBusy = true
  setTimeout(() => { isBotBusy = false }, 5000)
  
  const players = Object.keys(bot.players).filter(p => p !== bot.username)
  if (players.length === 0) {
    queueMessage('Nobody online')
  } else {
    queueMessage(`Online (${players.length}): ${players.join(', ')}`)
  }
}

// -----------------------------
// Keeplist command (for items)
// -----------------------------
async function keeplistCommand(playerName, args) {
  const subcommand = args[0]?.toLowerCase()
  
  if (subcommand === 'list') {
    queueMessage(`Keeplist (${SPECIAL_ITEMS.length}): ${SPECIAL_ITEMS.join(', ')} (Note: *_spawn_egg [${CONFIG.collect_spawn_eggs}] and shulker [${CONFIG.collect_shulkers}] are kept automatically)`)
    return
  }
  
  if (!(await isAdmin(playerName))) {
    queueMessage('X Only admins can modify the keeplist')
    return
  }
  
  const targetItem = args[1]
  if (!targetItem) {
    queueMessage('X Usage: keeplist <add|remove|list> [item]')
    return
  }
  
  if (subcommand === 'add') {
    if (isKeeplistItem(targetItem)) {
      queueMessage(`[KEEPLIST] ${targetItem} is already in the keeplist or automatically kept`)
      return
    }
    
    SPECIAL_ITEMS.push(targetItem)
    if (saveItems()) {
      queueMessage(`[KEEPLIST] Added ${targetItem} to keeplist`)
      sendToDiscord(`[KEEPLIST] ${playerName} added ${targetItem} to keeplist`)
      sendToDiscordChannel(`[KEEPLIST] ${playerName} added ${targetItem} to keeplist`)
    } else {
      SPECIAL_ITEMS.pop() // Revert if save fails
      queueMessage('X Failed to add to keeplist (file error)')
    }
  } else if (subcommand === 'remove') {
    const index = SPECIAL_ITEMS.indexOf(targetItem)
    if (index === -1) {
      queueMessage(`[ERROR] ${targetItem} is not in the keeplist`)
      return
    }
    
    SPECIAL_ITEMS.splice(index, 1)
    if (saveItems()) {
      queueMessage(`[KEEPLIST] Removed ${targetItem} from keeplist`)
      sendToDiscord(`[KEEPLIST] ${playerName} removed ${targetItem} from keeplist`)
      sendToDiscordChannel(`[KEEPLIST] ${playerName} removed ${targetItem} from keeplist`)
    } else {
      SPECIAL_ITEMS.splice(index, 0, targetItem) // Revert if save fails
      queueMessage('X Failed to remove from keeplist (file error)')
    }
  } else {
    queueMessage('X Usage: keeplist <add|remove|list> [item]')
  }
}

// -----------------------------
// Rank command
// -----------------------------
async function rankCommand(playerName, args) {
  const subcommand = args[0]?.toLowerCase()
  
  // List all players with ranks
  if (subcommand === 'list') {
    try {
      const [rows] = await db.execute(
        `SELECT username, role FROM players WHERE role != 'player' ORDER BY 
         CASE role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'trusted' THEN 3 ELSE 4 END, username`
      )
      
      if (rows.length === 0) {
        queueMessage('No ranked players')
        return
      }
      
      const owners = rows.filter(r => r.role === 'owner')
      const admins = rows.filter(r => r.role === 'admin')
      const trusted = rows.filter(r => r.role === 'trusted')
      
      let msg = 'Ranks:'
      if (owners.length > 0) msg += ` Owners: ${owners.map(r => r.username).join(', ')}`
      if (admins.length > 0) msg += ` | Admins: ${admins.map(r => r.username).join(', ')}`
      if (trusted.length > 0) msg += ` | Trusted: ${trusted.map(r => r.username).join(', ')}`
      queueMessage(msg)
    } catch (err) {
      console.error('[DB] Error listing ranks:', err)
      queueMessage('X Failed to list ranks')
    }
    return
  }
  
  // Remove rank (set to player)
  if (subcommand === 'remove') {
    if (!(await isOwner(playerName))) {
      queueMessage('X Only the owner can remove ranks')
      return
    }
    
    const targetPlayer = args[1]
    if (!targetPlayer) {
      queueMessage('X Usage: rank remove <player>')
      return
    }
    
    if (targetPlayer === 'JuroBot5000') {
      queueMessage('X Cannot remove rank from hardcoded owner')
      return
    }
    
    await setPlayerRole(targetPlayer, 'player')
    queueMessage(`[RANK] Removed rank from ${targetPlayer}`)
    sendToDiscord(`[RANK] ${playerName} removed rank from ${targetPlayer}`)
    sendToDiscordChannel(`[RANK] ${playerName} removed rank from ${targetPlayer}`)
    return
  }
  
  // View specific player rank or self
  if (!subcommand || subcommand !== 'add') {
    const target = subcommand || playerName
    const player = await getPlayer(target)
    
    if (!player) {
      queueMessage(`[RANK] ${target} has no rank data`)
      return
    }
    
    const roleDisplay = player.role.charAt(0).toUpperCase() + player.role.slice(1)
    queueMessage(`[RANK] ${target}: ${roleDisplay}`)
    return
  }
  
  // Add/set rank
  if (!(await isOwner(playerName))) {
    queueMessage('X Only the owner can assign ranks')
    return
  }
  
  const targetPlayer = args[1]
  const newRole = args[2]?.toLowerCase()
  
  if (!targetPlayer || !newRole) {
    queueMessage('X Usage: rank add <player> <owner|admin|trusted|player>')
    return
  }
  
  if (!['owner', 'admin', 'trusted', 'player'].includes(newRole)) {
    queueMessage('X Valid roles: owner, admin, trusted, player')
    return
  }
  
  await setPlayerRole(targetPlayer, newRole)
  const roleDisplay = newRole.charAt(0).toUpperCase() + newRole.slice(1)
  queueMessage(`[RANK] Set ${targetPlayer} to ${roleDisplay}`)
  sendToDiscord(`[RANK] ${playerName} set ${targetPlayer} to ${roleDisplay}`)
  sendToDiscordChannel(`[RANK] ${playerName} set ${targetPlayer} to ${roleDisplay}`)
}

// -----------------------------
// Spam command
// -----------------------------
async function spamCommand(playerName, args) {
  if (!(await isAdmin(playerName))) {
    queueMessage('X Only admins can use spam command')
    return
  }
  
  const subcommand = args[0]?.toLowerCase()
  
  if (subcommand === 'stop') {
    if (spamState.active) {
      spamState.active = false
      if (spamInterval) {
        clearInterval(spamInterval)
        spamInterval = null
      }
      queueMessage(' Stopped')
      sendToDiscord(`[SPAM] ${playerName} stopped spam`)
      sendToDiscordChannel(`[SPAM] ${playerName} stopped spam`)
    } else {
      queueMessage(' No active spam to stop')
    }
    return
  }
  
  const message1 = args[0]
  const message2 = args[1]
  const delay = parseFloat(args[2])
  
  if (!message1 || !message2 || isNaN(delay) || delay <= 0) {
    queueMessage('X Usage: spam <message1> <message2> <delay_seconds> OR spam stop')
    queueMessage(' Delay supports decimals (e.g., 0.1 for 100ms)')
    return
  }
  
  if (spamState.active) {
    queueMessage('X Spam already running. Use "spam stop" first')
    return
  }
  
  const msg1 = message1.replace(/_/g, ' ')
  const msg2 = message2.replace(/_/g, ' ')
  
  spamState.active = true
  spamState.messages = [msg1, msg2]
  spamState.delay = delay * 1000
  spamState.currentIndex = 0
  
  queueMessage(' Started')
  sendToDiscord(`[SPAM] ${playerName} started spam: "${msg1}" / "${msg2}" every ${delay}s`)
  sendToDiscordChannel(`[SPAM] ${playerName} started spam: "${msg1}" / "${msg2}" every ${delay}s`)
  
  queueMessage(spamState.messages[0])
  spamState.currentIndex = 1
  
  spamInterval = setInterval(() => {
    if (!spamState.active) {
      clearInterval(spamInterval)
      spamInterval = null
      return
    }
    queueMessage(spamState.messages[spamState.currentIndex])
    spamState.currentIndex = (spamState.currentIndex + 1) % spamState.messages.length
  }, spamState.delay)
}

// -----------------------------
// Drop command
// -----------------------------
async function dropCommand(playerName, args) {
  if (!(await isAdmin(playerName))) {
    queueMessage('X Only admins can use drop command')
    return
  }
  
  const itemName = args[0]
  const amount = args[1]
  
  if (itemName?.toLowerCase() === 'all') {
    const items = bot.inventory.items()
    if (items.length === 0) {
      queueMessage(' Empty')
      return
    }
    
    queueMessage(`[DROP] Dropping all ${items.length} item stacks...`)
    for (const item of items) {
      try {
        const itemCount = item.count
        const itemNameInInv = item.name
        await bot.tossStack(item)
        updateStock(itemNameInInv, itemCount)
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (err) {
        console.error('Drop error:', err)
      }
    }
    queueMessage(' Dropped all items')
    sendToDiscord(`[DROP] ${playerName} dropped all items`)
    sendToDiscordChannel(`[DROP] ${playerName} dropped all items`)
    return
  }
  
  if (!itemName || !amount) {
    queueMessage('X Usage: drop <item> <amount> OR drop all')
    return
  }
  
  const amountNum = parseInt(amount)
  if (isNaN(amountNum) || amountNum <= 0) {
    queueMessage('X Amount must be a positive number')
    return
  }
  
  const item = bot.inventory.items().find(i => i.name === itemName)
  if (!item) {
    queueMessage(`[ERROR] Item "${itemName}" not found in inventory`)
    return
  }
  
  const dropAmount = Math.min(amountNum, item.count)
  
  try {
    const itemNameInInv = item.name
    await bot.toss(item.type, null, dropAmount)
    updateStock(itemNameInInv, dropAmount)
    queueMessage(`[DROP] Dropped ${dropAmount}x ${itemName}`)
    sendToDiscord(`[DROP] ${playerName} dropped ${dropAmount}x ${itemName}`)
    sendToDiscordChannel(`[DROP] ${playerName} dropped ${dropAmount}x ${itemName}`)
  } catch (err) {
    queueMessage(`[ERROR] Failed to drop ${itemName}`)
    console.error('Drop error:', err)
  }
}

// -----------------------------
// Say command
// -----------------------------
async function sayCommand(playerName, message) {
  if (!(await isAdmin(playerName))) {
    queueMessage('X Only admins can use say command')
    return
  }
  
  if (!message || message.trim() === '') {
    queueMessage('X Usage: say <message>')
    return
  }
  
  queueMessage(message)
  sendToDiscord(`[SAY] Admin ${playerName} used say: ${message}`)
  sendToDiscordChannel(`[SAY] Admin ${playerName} used say: ${message}`)
}

// -----------------------------
// End command (reconnect)
// -----------------------------
async function endCommand(playerName) {
  if (!(await isAdmin(playerName))) {
    queueMessage('X Only admins can reconnect the bot')
    return
  }
  
  queueMessage(' Bot is reconnecting...')
  sendToDiscord(`[END] Admin ${playerName} triggered reconnect`)
  sendToDiscordChannel(`[END] Admin ${playerName} triggered reconnect`)
  logToConsole(`[END] Admin ${playerName} triggered reconnect`)
  if (bot) {
    bot.end()
  }
  reconnect()
}

// -----------------------------
// Stop command
// -----------------------------
async function stopCommand(playerName) {
  if (!(await isOwner(playerName))) {
    queueMessage('X Only the owner can stop the bot')
    return
  }
  
  queueMessage(' Bot is shutting down...')
  sendToDiscord(`[STOP] Owner ${playerName} stopped the bot`)
  sendToDiscordChannel(`[STOP] Owner ${playerName} stopped the bot`)
  logToConsole(`[STOP] Owner ${playerName} stopped the bot`)
  setTimeout(() => {
    process.exit(0)
  }, 1000)
}

// -----------------------------
// Ban command
// -----------------------------
async function banCommand(playerName, args) {
  if (!(await isAdmin(playerName))) {
    queueMessage('X Only admins can use ban command')
    return
  }
  
  if (!args || args.length === 0) {
    queueMessage('X Usage: ban <player> [reason] OR ban unban <player> OR ban list')
    return
  }
  
  const subcommand = args[0]?.toLowerCase()
  
  // List banned players
  if (subcommand === 'list') {
    const bannedList = await getBannedPlayers()
    if (bannedList.length === 0) {
      queueMessage(' No banned players')
      return
    }
    
    queueMessage(`[BAN] Banned players (${bannedList.length}):`)
    for (const ban of bannedList) {
      const reason = ban.reason ? ` - ${ban.reason}` : ''
      queueMessage(`${ban.username} (by ${ban.banned_by})${reason}`)
    }
    return
  }
  
  // Unban player
  if (subcommand === 'unban') {
    const targetPlayer = args[1]
    if (!targetPlayer) {
      queueMessage('X Usage: ban unban <player>')
      return
    }
    
    const success = await unbanPlayer(targetPlayer)
    if (success) {
      queueMessage(`[BAN] Unbanned ${targetPlayer}`)
      sendToDiscord(`[BAN] ${playerName} unbanned ${targetPlayer}`)
      sendToDiscordChannel(`[BAN] ${playerName} unbanned ${targetPlayer}`)
    } else {
      queueMessage('X Failed to unban player')
    }
    return
  }
  
  // Ban player - if we get here, args[0] is the target player name
  const targetPlayer = args[0]
  const reason = args.slice(1).join(' ') || 'No reason provided'
  
  if (targetPlayer === 'JuroBot5000') {
    queueMessage('X Cannot ban the owner')
    return
  }
  
  if (await isAdmin(targetPlayer)) {
    queueMessage('X Cannot ban admins or owners')
    return
  }
  
  const success = await banPlayer(targetPlayer, playerName, reason)
  if (success) {
    queueMessage(`[BAN] Banned ${targetPlayer}: ${reason}`)
    sendToDiscord(`[BAN] ${playerName} banned ${targetPlayer}: ${reason}`)
    sendToDiscordChannel(`[BAN] ${playerName} banned ${targetPlayer}: ${reason}`)
  } else {
    queueMessage('X Failed to ban player')
  }
}

// -----------------------------
// Rotate command with compass directions - MODIFIED
// -----------------------------
async function rotateCommand(playerName, args) {
  if (!(await isAdmin(playerName))) {
    queueMessage('X Only admins can use rotate command')
    return
  }
  
  if (!args || args.length === 0) {
    queueMessage('X Usage: rotate <degrees> OR rotate player <playername> OR rotate <north|south|east|west|left|right|up|down>')
    return
  }
  
  const subcommand = args[0]?.toLowerCase()
  
  // Set bot busy to prevent idle look North from overriding this rotation for 5 seconds
  isBotBusy = true
  setTimeout(() => { isBotBusy = false }, 5000)
  
  // Rotate to look at player
  if (subcommand === 'player') {
    const targetPlayer = args[1]
    if (!targetPlayer) {
      queueMessage('X Usage: rotate player <playername>')
      return
    }
    
    const player = bot.players[targetPlayer]
    if (!player || !player.entity) {
      queueMessage(`[ERROR] Player ${targetPlayer} not found or not visible`)
      return
    }
    
    bot.lookAt(player.entity.position.offset(0, player.entity.height, 0))
    queueMessage(`[ROTATE] Now looking at ${targetPlayer}`)
    sendToDiscord(`[ROTATE] ${playerName} rotated bot to look at ${targetPlayer}`)
    sendToDiscordChannel(`[ROTATE] ${playerName} rotated bot to look at ${targetPlayer}`)
    return
  }
  
  // Compass direction rotation
  if (subcommand === 'north' || subcommand === 'south' || subcommand === 'east' || subcommand === 'west' || 
      subcommand === 'left' || subcommand === 'right' || subcommand === 'up' || subcommand === 'down') {
    
    let yaw = bot.entity.yaw
    let pitch = bot.entity.pitch
    
    switch (subcommand) {
      case 'north':
        yaw = -Math.PI
        break
      case 'south':
        yaw = 0
        break
      case 'east':
        yaw = -Math.PI / 2
        break
      case 'west':
        yaw = Math.PI / 2
        break
      case 'left':
        yaw -= Math.PI / 4 // 45 degrees left
        break
      case 'right':
        yaw += Math.PI / 4 // 45 degrees right
        break
      case 'up':
        pitch -= Math.PI / 4 // Look up 45 degrees
        break
      case 'down':
        pitch += Math.PI / 4 // Look down 45 degrees
        break
    }
    
    // Normalize yaw to -π to π
    yaw = ((yaw + Math.PI) % (2 * Math.PI)) - Math.PI
    
    // Clamp pitch to -π/2 to π/2 (straight up to straight down)
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch))
    
    bot.look(yaw, pitch, true)
    queueMessage(`[ROTATE] Rotated to face ${subcommand.toUpperCase()}`)
    sendToDiscord(`[ROTATE] ${playerName} rotated bot to face ${subcommand}`)
    sendToDiscordChannel(`[ROTATE] ${playerName} rotated bot to face ${subcommand}`)
    return
  }
  
  // Rotate by degrees (original functionality)
  const degrees = parseFloat(args[0])
  if (isNaN(degrees)) {
    queueMessage('X Usage: rotate <degrees> OR rotate player <playername> OR rotate <north|south|east|west|left|right|up|down>')
    return
  }
  
  const radians = degrees * (Math.PI / 180)
  bot.look(bot.entity.yaw + radians, bot.entity.pitch, true)
  queueMessage(`[ROTATE] Rotated ${degrees} degrees`)
  sendToDiscord(`[ROTATE] ${playerName} rotated bot ${degrees} degrees`)
  sendToDiscordChannel(`[ROTATE] ${playerName} rotated bot ${degrees} degrees`)
}

// -----------------------------
// Help command - MODIFIED to queue messages with delay
// -----------------------------
async function helpCommand(playerName) {
  const isOwnerUser = await isOwner(playerName)
  const isAdminUser = await isAdmin(playerName)
  const isTrustedUser = await isTrusted(playerName)
  
  // Super simple help - one message
  let help = 'Commands: help inv info shop wordle list seen firstseen playerinfo serverinfo rank keeplist quote'

  if (isAdminUser) {
    help += ' | Admin: drop say spam ban rotate end pulltidier'
  }
  
  if (isOwnerUser) {
    help += ' | Owner: stop'
  }
  
  queueMessage(help)
  sendToDiscord(`[HELP] ${playerName} viewed help`)
  sendToDiscordChannel(`[HELP] ${playerName} viewed help`)
}

// -----------------------------
// FIXED: Create bot with proper error handling
// -----------------------------
function createBot() {
  const BOT_CONFIG = {
    host: CONFIG.host,
    auth: CONFIG.auth,
    username: CONFIG.username,
    version: '1.21.11', // MUST be 1.21.11 to match server
    checkTimeoutInterval: 60 * 1000,
    hideErrors: true, // Hide internal protocol errors
    skipValidation: true, // Skip packet validation to handle version mismatches
    disableChatSigning: true // Prevent chat_validation_failed kicks
  }
  
  bot = mineflayer.createBot(BOT_CONFIG)

  // Add comprehensive error handler for packet parsing errors
  if (bot._client) {
    // Catch errors on the client
    bot._client.on('error', (err) => {
      if (err.code === 'ERR_OUT_OF_RANGE') {
        console.log('[CLIENT ERROR] Suppressed ERR_OUT_OF_RANGE packet error - continuing...')
        return
      }
      console.error('[CLIENT ERROR]', err)
    })

    // Log raw kick packets
    bot._client.on('kick_disconnect', (packet) => {
      logToConsole(`[RAW KICK] kick_disconnect: ${JSON.stringify(packet)}`)
    })
    bot._client.on('disconnect', (packet) => {
      logToConsole(`[RAW KICK] disconnect: ${JSON.stringify(packet)}`)
    })

    // Debug mode selective packet logger
    bot._client.on('packet', (data, meta) => {
      if (!CONFIG.debug_mode) return
      
      // Strict allow-list for "useful" packets to prevent spam
      const allowedPackets = [
        'system_chat', 'player_chat', 'disguised_chat', 'profileless_chat', 
        'combat_event', 'death_message', 'kick_disconnect', 'chat_command'
      ]

      if (!allowedPackets.includes(meta.name)) return

      // Extract text from chat-related packets for better visibility
      let extraInfo = ''
      if (meta.name.includes('chat')) {
        try {
          // 1.21.11 uses complex chat objects
          const msg = data.content || data.message || data.plainMessage || ''
          extraInfo = ` | TEXT: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`
        } catch (e) {}
      }

      logToConsole(`[DEBUG] IN: ${meta.name} (state: ${meta.state})${extraInfo}`)
      if (Object.keys(data).length > 0) {
        console.log(`  Data: ${JSON.stringify(data)}`)
      }
    })

    const originalWrite = bot._client.write.bind(bot._client)
    bot._client.write = (name, params) => {
      if (CONFIG.debug_mode) {
        const allowedOut = ['chat', 'chat_command', 'chat_message']
        if (allowedOut.includes(name)) {
          logToConsole(`[DEBUG] OUT: ${name}`)
          console.log(`  Params: ${JSON.stringify(params)}`)
        }
      }
      return originalWrite(name, params)
    }

    // Wrap the packet parser to catch errors
    const originalDeserializer = bot._client.deserializer
    if (originalDeserializer) {
      bot._client.deserializer.on('error', (err) => {
        if (err.code === 'ERR_OUT_OF_RANGE') {
          console.log('[DESERIALIZER] Suppressed ERR_OUT_OF_RANGE - continuing...')
          return
        }
        console.error('[DESERIALIZER ERROR]', err)
      })
    }
  }

  bot.once('login', () => {
    botOnline = true
    logToConsole('[BOT] Logged in successfully')
    sendToDiscord('[BOT] Logged in successfully')
    sendToDiscordChannel('🔗 JuroBot connected to Minecraft!', "\u001b[32m") // GREEN
  })

  bot.on('spawn', () => {
    logToConsole('[BOT] Spawned in world')
    
    // Start background loops only once
    if (!dropCycleTimeout) dropItemsCycle()
    if (!monitorInventoryTimeout) monitorInventoryLoop()
    
    // Activity logging (only once)
    if (!activityLogInterval) {
      logActivity()
      activityLogInterval = setInterval(logActivity, 30 * 60 * 1000)
    }
    
    // Idle look North mechanism (only once)
    if (!idleLookInterval) {
      idleLookInterval = setInterval(() => {
        if (bot && botOnline && !isBotBusy) {
          // Only look North if we are not already facing North (approx)
          const currentYaw = bot.entity.yaw
          const targetYaw = -Math.PI
          const diff = Math.abs(currentYaw - targetYaw)
          
          if (diff > 0.1) {
            bot.look(-Math.PI, 0, true)
          }
        }
      }, 5000)
    }

    // Periodic shop message every 30 minutes (only once)
    if (!shopInterval) {
      shopInterval = setInterval(() => {
        if (bot && botOnline) {
          sendShop()
        }
      }, 30 * 60 * 1000)
    }
  })

  // Alert when players enter render distance
  bot.on('entitySpawn', (entity) => {
    if (entity.type === 'player' && entity.username !== bot.username) {
      // Ignore specific bot/admin accounts
      if (['JuroBot5000', 'MechRobot'].includes(entity.username)) return

      const pos = entity.position
      const dist = bot.entity.position.distanceTo(pos).toFixed(1)
      const msg = `Player Spotted: ${entity.username} at ${Math.round(pos.x)} ${Math.round(pos.y)} ${Math.round(pos.z)} (${dist} blocks away)`
      logToConsole(`[ALERT] ${entity.username} entered render distance (${dist}m)`)
      sendToDiscordAlert(msg, "\u001b[33m") // YELLOW
    }
  })

  // RAW PLAYER CHAT with enhanced error handling
  if (bot._client && bot._client.on) {
    bot._client.on('player_chat', async (packet) => {
      try {
        if (!packet || packet.senderUuid === bot.uuid) return
        
        let playerName = ''
        if (packet.networkName) {
          if (typeof packet.networkName === 'string') {
            playerName = packet.networkName
          } else if (packet.networkName.value && typeof packet.networkName.value === 'string') {
            playerName = packet.networkName.value
          } else if (packet.networkName.value && packet.networkName.value.text) {
            playerName = packet.networkName.value.text.value || packet.networkName.value.text
          } else {
            // Fallback for complex NBT-like structures
            const networkNameStr = JSON.stringify(packet.networkName)
            const match = networkNameStr.match(/"text":"([^"]+)"/)
            if (match) playerName = match[1]
          }
        }

        // Final fallback to senderUuid lookup if name extraction fails
        if (!playerName || playerName === '[object Object]') {
          const player = Object.values(bot.players).find(p => p.uuid === packet.senderUuid)
          if (player) playerName = player.username
        }

        if (!playerName || playerName === '[object Object]') return
        
        // Check if player is banned
        if (await isBanned(playerName)) {
          logToConsole(`[BAN] Banned player ${playerName} attempted to chat`)
          return
        }
        
        await updateLastSeen(playerName)
        const message = packet.plainMessage || ''
        
        // Determine if it's a private message (chatType 2 in 1.21.11 is typically PM)
        const isPM = packet.type?.chatType === 2
        const logPrefix = isPM ? '[PM]' : '[Chat]'
        
        logToConsole(`${logPrefix} <${playerName}> ${message}`)
        sendToDiscord(`${logPrefix} <${playerName}> ${message}`)
        
        if (isPM) {
          sendToDiscordPM(`PM from ${playerName}: ${message}`, "\u001b[36m") // CYAN

          // Handle "pull" command from owner (JuroBot5000)
          if (playerName === 'JuroBot5000' && message.toLowerCase() === 'pull') {
            const button = bot.findBlock({
              matching: (block) => block.name.includes('button'),
              maxDistance: 4
            })
            
            if (button) {
              await bot.activateBlock(button)
              queueMessage(`/w ${playerName} I pulled`)
            } else {
              queueMessage(`/w ${playerName} I couldn't find a button nearby!`)
            }
          }
          
          // Handle "pull <reason>" command from TidierLeek3903
          if (playerName === 'TidierLeek3903' && message.toLowerCase().startsWith('pull')) {
            const parts = message.split(' ')
            const reason = parts.slice(1).join(' ')
            if (!reason) {
              queueMessage(`/w TidierLeek3903 Please provide a reason. Use pull <reason>`)
            } else if (await pressNearestLever(playerName, reason)) {
              queueMessage(`/w TidierLeek3903 I pulled the lever! Reason: ${reason}`)
            } else {
              queueMessage(`/w TidierLeek3903 I couldn't find a lever nearby!`)
            }
          }
        } else {
          let color = null
          if (playerName.toLowerCase() === 'hipporater') color = "\u001b[32m" // GREEN
          sendToDiscordChannel(`<${playerName}> ${message}`, color)
          sendToChatWebhook(`<${playerName}> ${message}`)
          
          // Coordinate detection logic for bases
          // Matches: "1231, 12312", "x 123123 y 12 z 88888", "55 225", etc.
          const coordRegex = /(-?\d{2,}[\s,]+-?\d{2,}([\s,]+-?\d{2,})?)|([xX][\s:]*-?\d+[\s,]*[yY][\s:]*-?\d+([\s,]*[zZ][\s:]*-?\d+)?)/
          if (coordRegex.test(message)) {
            sendToDiscordBase(`Potential Coords from ${playerName}: ${message}`, "\u001b[33m") // YELLOW
          }
        }
        
        await incrementChatMessage(playerName, message)

        if (message.toLowerCase().includes('what is this server')) {
          queueMessage('ThfProject is an infinite void world with structures where players receive a random item every 30 seconds. Starting with nothing, players use creativity and luck to build incredible structures, build unique bases, survive and pvp.')
          return
        }

        const cmd = parseCommand(message)
        if (!cmd) {
          // Store quotes for messages with 4+ words that aren't commands (and not PMs)
          if (!isPM) {
            const words = message.trim().split(/\s+/).filter(w => w.length > 0)
            if (words.length >= 4 && playerName !== 'JuroBot5000' && playerName !== bot.username) {
              // Only 1 in 20 qualifying messages (5% chance)
              if (Math.random() < 0.05) {
                QUOTES.push({ text: message, author: playerName })
                saveQuotes()
              }
            }
          }

          if (currentWordle && /^[a-zA-Z]{5}$/.test(message)) {
            handleWordleGuess(playerName, message)
          }
          return
        }

        if (!canRunCommand()) return

        const parts = cmd.command.split(' ')
        const command = parts[0].toLowerCase()
        const args = parts.slice(1)

        // All responses via queueMessage() will go to public chat as requested

        // DEFAULT COMMANDS
        if (command === 'help') {
          await helpCommand(playerName)
        }
        else if (command === 'inv') {
          sendInventory()
        }
        else if (command === 'info') {
          sendInfo()
        }
        else if (command === 'shop') {
          sendShop()
        }
        else if (command === 'wordle') {
          startWordle()
        }
        else if (command === 'seen' && args[0]) {
          await seenCommand(args[0])
        }
        else if (command === 'firstseen' && args[0]) {
          await firstSeenCommand(args[0])
        }
        else if (command === 'playerinfo' && args[0]) {
          await playerInfoCommand(args[0])
        }
        else if (command === 'serverinfo') {
          await serverInfoCommand()
        }
        else if (command === 'rank') {
          await rankCommand(playerName, args)
        }
        else if (command === 'list') {
          listCommand()
        }
        else if (command === 'keeplist') {
          await keeplistCommand(playerName, args)
        }
        else if (command === 'quote') {
          if (CONFIG.quotes_enabled === false) {
            queueMessage("The quote command is currently disabled.")
          } else if (QUOTES.length === 0) {
            queueMessage("No quotes stored yet! Chat some more (4+ words).")
          } else {
            const q = QUOTES[Math.floor(Math.random() * QUOTES.length)]
            queueMessage(`"${q.text}" -${q.author}`)
          }
        }
        
        // ADMIN COMMANDS
        else if (command === 'tidierpull') {
          if (playerName === 'TidierLeek3903' || await isOwner(playerName)) {
            const reason = args.join(' ')
            if (!reason) {
              queueMessage(`Please provide a reason. Use ${cmd.prefix}tidierpull <reason>`)
            } else if (await pressNearestLever(playerName, reason)) {
              queueMessage(`[PULL] Lever pulled by ${playerName}! Reason: ${reason}`)
            } else {
              queueMessage(`I couldn't find a lever nearby!`)
            }
          } else {
            queueMessage("You don't have permission to use that command.")
          }
        }
        else if (command === 'drop') {
          await dropCommand(playerName, args)
        }
        else if (command === 'say') {
          await sayCommand(playerName, args.join(' '))
        }
        else if (command === 'spam') {
          await spamCommand(playerName, args)
        }
        else if (command === 'end') {
          await endCommand(playerName)
        }
        else if (command === 'stop') {
          await stopCommand(playerName)
        }
        else if (command === 'ban') {
          await banCommand(playerName, args)
        }
        else if (command === 'rotate') {
          await rotateCommand(playerName, args)
        }
        else {
          queueMessage(`Unknown command: ${command}. Use ${cmd.prefix}help`)
        }

      } catch (e) {
        // Suppress specific packet parsing errors
        if (e.code === 'ERR_OUT_OF_RANGE' && e.field === 'play.toClient') {
          console.log('[PACKET] Suppressed ERR_OUT_OF_RANGE in chat packet')
          return
        }
        console.error('Chat packet error:', e)
      }
    })
  }

  // Log player join/leave events
  bot.on('playerJoined', (player) => {
    if (!player || player.username === bot.username) return
    logToConsole(`[JOIN] ${player.username} joined the server`)
    sendToDiscord(`[JOIN] ${player.username} joined the server`)
    sendToDiscordChannel(`[JOIN] ${player.username} joined the server`, "\u001b[33m") // YELLOW
    
    // Special welcome for JuroBot5000
    if (player.username === 'JuroBot5000') {
      let spawnerCount = 0
      if (bot.inventory) {
        for (const item of bot.inventory.items()) {
          if (item.name === 'spawner' || item.name === 'minecraft:spawner') {
            spawnerCount += item.count
          }
        }
      }
      setTimeout(() => {
        queueMessage(`/w JuroBot5000 welcome i have collected ${spawnerCount} spawners`)
      }, 5000) // Small delay to ensure they are fully joined
    }
  })

  bot.on('playerLeft', (player) => {
    if (!player || player.username === bot.username) return
    logToConsole(`[LEAVE] ${player.username} left the server`)
    sendToDiscord(`[LEAVE] ${player.username} left the server`)
    sendToDiscordChannel(`[LEAVE] ${player.username} left the server`, "\u001b[33m") // YELLOW
  })

  // Update seen from tablist every 5s
  setInterval(async () => {
    if (!bot || !bot.players) return
    for (const playerName of Object.keys(bot.players)) {
      if (!playerName) continue
      if (playerName === bot.username) continue
      await updateLastSeen(playerName)
    }
  }, 5000)
  
  // Track deaths via death message with error handling
  bot.on('message', async (jsonMsg) => {
    try {
      const text = jsonMsg.toString()
      
      if (text.includes(' died') || text.includes(' was ') || text.includes(' fell ') || 
          text.includes(' drowned') || text.includes(' burned') || text.includes(' killed')) {
        const match = text.match(/^(\w+) (died|was|fell|drowned|burned|killed)/)
        if (match) {
          const playerName = match[1]
          await incrementDeath(playerName)
          logToConsole(`[DEATH] ${playerName} died`)
          sendToDiscord(`[DEATH] ${playerName} died`)
          sendToDiscordChannel(`[DEATH] ${text}`, "\u001b[31m") // RED
          sendToChatWebhook(`💀 ${text}`)
        }
      }
    } catch (e) {
      console.error('Death tracking error:', e)
    }
  })

  bot.on('kicked', (reason) => {
    botOnline = false
    let reasonStr = reason
    if (typeof reason === 'object' && reason !== null) {
      try {
        if (reason.value && reason.value.translate) reasonStr = reason.value.translate.value || reason.value.translate
        else if (reason.translate) reasonStr = reason.translate
        else reasonStr = JSON.stringify(reason)
      } catch (e) {
        reasonStr = '[Complex Kick Reason]'
      }
    }
    logToConsole(`[WARNING] Kicked: ${reasonStr}`)
    sendToDiscord(`[KICKED] ${reasonStr}`)
    sendToDiscordChannel(`🚫 Bot kicked: ${reasonStr}`, "\u001b[31m") // RED
    reconnect()
  })

  bot.on('end', () => {
    botOnline = false
    logToConsole('[WARNING] Connection ended')
    sendToDiscordChannel('🔌 Bot disconnected from Minecraft', "\u001b[31m") // RED
    reconnect()
  })

  bot.on('error', (err) => {
    // Suppress ERR_OUT_OF_RANGE packet parsing errors
    if (err.code === 'ERR_OUT_OF_RANGE') {
      console.log('[BOT ERROR] Suppressed ERR_OUT_OF_RANGE - continuing...')
      return
    }
    // Only suppress non-critical errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
      logToConsole(`[WARNING] Connection error: ${err.code}`)
      reconnect()
      return
    }
    // Log all other errors for debugging
    console.error('[BOT ERROR]', err)
  })
}

// -----------------------------
// Inventory / Help / Info / Loops
// -----------------------------
function sendInventory() {
  if (!bot || !bot.inventory) return
  const inventorySummary = {}
  for (const item of bot.inventory.items()) inventorySummary[item.name] = (inventorySummary[item.name] || 0) + item.count
  const invMessage = Object.entries(inventorySummary).map(([name,count])=>`${name} ${count}x`).join(', ')
  queueMessage(invMessage || 'Empty')
  sendToDiscord(`[INVENTORY] ${invMessage || 'Empty'}`)
}

function sendInfo() {
  const msg = '[INFO] JuroBot was created by JuroBot5000. This bot is made for fun.'
  queueMessage(msg)
  sendToDiscord(msg)
}

function sendShop() {
  const shopPhrases = [
    "Trade and buy in-game items with items at JuroBot's shop!",
    "Looking for a deal? JuroBot's shop: In-game item-for-item trading!",
    "Join JuroBot's shop to trade your loot for something better!",
    "JuroBot's shop: Where in-game items get you the items you need!",
    "Need gear? Trade your in-game items for it at JuroBot's shop!",
    "Friendly item-for-item trading hub: JuroBot's shop!",
    "JuroBot's shop - the best spot for in-game item trades!",
    "Upgrade your inventory at JuroBot's shop! Item-for-item trading.",
    "Swap your in-game loot for items at JuroBot's shop!",
    "The place for in-game item-for-item trading: JuroBot's shop!",
    "JuroBot's shop is open for in-game item trades!",
    "Looking to buy? Trade in-game items at JuroBot's shop!",
    "Trade smart! Use JuroBot's shop for item-for-item exchanges.",
    "JuroBot's shop - Join our community for in-game item trades!",
    "Exchange your items for loot at JuroBot's shop!",
    "The community trading hub: JuroBot's shop (Items for Items)!",
    "JuroBot's shop: Trading in-game items for in-game items!",
    "Get what you need by trading items at JuroBot's shop!",
    "Safe and easy in-game item trades at JuroBot's shop!",
    "JuroBot's shop: The #1 spot for item-for-item trading!",
    "Don't search, just trade at JuroBot's shop! Item-for-item.",
    "JuroBot's shop is live! Trading in-game items for items!",
    "Turn your loot into gear at JuroBot's shop (Item Trades)!",
    "JuroBot's shop - Join for fair in-game item trades!",
    "Everything is item-for-item at JuroBot's shop!",
    "Exchange your extra loot at JuroBot's shop!",
    "JuroBot's shop: Simple in-game item-for-item trading!",
    "Looking for a trade? JuroBot's shop: Items for Items!",
    "The player-run shop for item trades: JuroBot's shop!",
    "Join JuroBot's shop for the best in-game item trades!",
    "JuroBot's shop: Trade your loot for items today!",
    "In-game item-for-item trading at JuroBot's shop!",
    "JuroBot's shop - your home for in-game item exchanges!",
    "Swap loot for items at JuroBot's shop!",
    "JuroBot's shop: Trading made easy (Items for Items)!",
    "Find your next deal at JuroBot's shop! Item-for-item.",
    "JuroBot's shop: The spot for in-game item swaps!",
    "Need a trade? JuroBot's shop is always open (Items)!",
    "Exchange items for gear at JuroBot's shop!",
    "JuroBot's shop: Your community item-for-item trading hub!"
  ]
  const randomPhrase = shopPhrases[Math.floor(Math.random() * shopPhrases.length)]
  const invite = "https://discord.gg/M2JUtYBqrt"
  const msg = `${randomPhrase} ${invite}`
  
  queueMessage(msg)
  sendToDiscord(msg)
}

// -----------------------------
// Drop items cycle (MODIFIED) - Now: turn, wait 1s, drop, turn back, wait 1s, drop
// -----------------------------
let dropCycleTimeout = null
async function dropItemsCycle() {
  if (dropCycleTimeout) clearTimeout(dropCycleTimeout)
  
  if (!bot || !bot.inventory) {
    dropCycleTimeout = setTimeout(dropItemsCycle, 60000)
    return
  }
  
  isBotBusy = true
  try {
    const ping = bot.player ? bot.player.ping : 0
    
    if (ping > 200) {
      logToConsole(`[DROP CYCLE] High ping detected (${ping}ms). Only dropping non-keeplist items (NORTH)...`)
      
      // Face north (-PI)
      await bot.look(-Math.PI, 0, true)
      
      const allItems = bot.inventory.items()
      // KEEP spawners in inventory
      const nonKeeplistItems = allItems.filter(item => !isKeeplistItem(item.name) && !item.name.includes('spawner'))
      
      for (const item of nonKeeplistItems) {
        try {
          await bot.tossStack(item)
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (err) {
          console.error('Drop error:', err)
        }
      }
    } else {
      // Normal behavior when ping <= 200
      // Save current look direction
      const originalYaw = bot.entity.yaw
      const originalPitch = bot.entity.pitch
      
      // Phase 1: Face south, wait 5 seconds + 0.5s per item, then drop keeplist items
      const allItems = bot.inventory.items()
      // KEEP spawners in inventory - don't include them in the toss list
      const keeplistItems = allItems.filter(item => isKeeplistItem(item.name) && !item.name.includes('spawner'))
      const waitTime1 = 5000 + (keeplistItems.length * 500)
      
      await bot.look(0, 0, true) // Face south (0)
      await new Promise(resolve => setTimeout(resolve, waitTime1))
      
      for (const item of keeplistItems) {
        try {
          const itemCount = item.count
          const itemName = item.name
          await bot.tossStack(item)
          updateStock(itemName, itemCount)
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (err) {
          console.error('Drop error:', err)
        }
      }
      
      // Phase 2: Face north, wait 5 seconds + 0.5s per item, then drop non-keeplist items
      const allItems2 = bot.inventory.items()
      // KEEP spawners in inventory - don't include them in the toss list
      const nonKeeplistItems = allItems2.filter(item => !isKeeplistItem(item.name) && !item.name.includes('spawner'))
      const waitTime2 = 5000 + (nonKeeplistItems.length * 500)
      
      await bot.look(-Math.PI, 0, true) // Face north (-PI)
      await new Promise(resolve => setTimeout(resolve, waitTime2))
      
      for (const item of nonKeeplistItems) {
        try {
          await bot.tossStack(item)
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (err) {
          console.error('Drop error:', err)
        }
      }
      
      // Restore original look direction
      await bot.look(originalYaw, originalPitch, true)
    }
    
  } catch (err) {
    console.error('[DROP CYCLE] Error:', err)
  }
  isBotBusy = false
  
  // Schedule next cycle in 60 seconds
  dropCycleTimeout = setTimeout(dropItemsCycle, 60000)
}

// Global flag to prevent idle look from interfering with active tasks
let isBotBusy = false

let monitorInventoryTimeout = null
function monitorInventoryLoop() {
  if (monitorInventoryTimeout) clearTimeout(monitorInventoryTimeout)
  
  if (!bot || !bot.inventory) {
    monitorInventoryTimeout = setTimeout(monitorInventoryLoop, 1000)
    return
  }
  
  try {
    for (const item of bot.inventory.items()) {
      const prevCount = knownSpecialItems[item.name] || 0
      if (item.count > prevCount) {
        // ALWAYS log to persistent database
        db.execute('INSERT INTO all_item_logs (item_name) VALUES (?)', [item.name]).catch(e => console.error('[DB] All Item log error:', e))

        if (isKeeplistItem(item.name)) {
          sendToDiscord(`[SPECIAL] Got special item: ${item.name} x${item.count - prevCount}`)
          sendToDiscordChannel(`✨ Got special item: ${item.name} x${item.count - prevCount}`, "\u001b[32m") // GREEN
          
          // Log to daily DB
          db.execute('INSERT INTO item_logs (item_name) VALUES (?)', [item.name]).catch(e => console.error('[DB] Item log error:', e))
        }
        knownSpecialItems[item.name] = item.count
      }
    }
  } catch (err) {
    console.error('[INVENTORY] Monitor error:', err)
  }
  
  monitorInventoryTimeout = setTimeout(monitorInventoryLoop, 1000)
}

function reconnect() {
  if (reconnecting) return
  reconnecting = true
  
  // Clear periodic shop message interval
  if (shopInterval) {
    clearInterval(shopInterval)
    shopInterval = null
  }
  
  if (activityLogInterval) {
    clearInterval(activityLogInterval)
    activityLogInterval = null
  }
  
  if (idleLookInterval) {
    clearInterval(idleLookInterval)
    idleLookInterval = null
  }

  // Clean up old instance listeners to prevent ghosting
  if (bot) {
    bot.removeAllListeners()
    try { bot.end() } catch(e) {}
  }

  logToConsole('[RECONNECT] Reconnecting in 6 seconds...')
  sendToDiscord('[RECONNECT] Reconnecting in 6 seconds...')
  sendToDiscordChannel('🔄 Reconnecting in 6 seconds...', "\u001b[33m") // YELLOW
  
  setTimeout(() => {
    reconnecting = false
    createBot()
  }, 6000)
}

// -----------------------------
// Initialize and start
// -----------------------------
loadConfig()
loadItems()
loadQuotes()

initDatabase().then(() => {
  createBot()
  initDiscord()
}).catch(err => {
  console.error('[FATAL] Failed to initialize database:', err)
  process.exit(1)
})

// -----------------------------
// Console input handler - always active
// -----------------------------
let rl = null

// Keep process alive and handle console input
process.stdin.resume()

rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

rl.on('line', (input) => {
  const trimmed = input.trim()
  if (!trimmed) return
  
  if (!bot || !botOnline) {
    console.log('[ERROR] Bot is not online')
    return
  }
  
  const parts = trimmed.split(' ')
  const cmd = parts[0].toLowerCase()
  
  if (cmd === 'say') {
    const message = parts.slice(1).join(' ')
    if (message) {
      queueMessage(message)
      console.log(`[CONSOLE] Said: ${message}`)
    } else {
      console.log('[ERROR] Usage: say <message>')
    }
  } else if (cmd === 'help') {
    console.log('[CONSOLE] Commands: say <message>, inv, players, stop')
  } else if (cmd === 'inv') {
    sendInventory()
  } else if (cmd === 'players') {
    const playerList = Object.keys(bot.players).filter(p => p !== bot.username)
    console.log(`[CONSOLE] Online: ${playerList.join(', ') || 'None'}`)
  } else if (cmd === 'stop') {
    console.log('[SYSTEM] Shutting down...')
    process.exit(0)
  } else {
    console.log(`[ERROR] Unknown command: ${cmd}`)
  }
})

rl.on('close', () => {
  // stdin closed but keep process running (e.g. when piped)
  console.log('[SYSTEM] Console input closed - bot continues running')
})


// -----------------------------
// Web panel server
// -----------------------------
const server = http.createServer(async (req, res) => {
  const baseURL = `http://${req.headers.host || 'localhost'}`;
  const parsedUrl = new URL(req.url, baseURL);
  const path = parsedUrl.pathname;

  if (path === '/stop') {
    logToConsole('[WEB] Stop requested via /stop')
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Bot stopping...\n')
    setTimeout(() => {
      process.exit(0)
    }, 500)
    return
  }

  if (path === '/collected') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    if (!db) {
      res.end('Database not available')
      return
    }
    try {
      const [allRows] = await db.execute(
        'SELECT item_name, COUNT(*) as count FROM item_logs GROUP BY item_name ORDER BY count DESC'
      )
      
      const rows = allRows.filter(row => {
        const name = row.item_name;
        return SPECIAL_ITEMS.includes(name) && !name.endsWith('_spawn_egg') && !name.includes('shulker');
      });
      
      let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Collected Items</title>
  <style>
    body { background: #1a1a1a; color: #fff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; margin: 0; }
    .grid { padding: 10px; width: 100%; }
    .item-box { 
      display: inline-block; vertical-align: top;
      background: #3a3a3a; border: 1px solid #555; padding: 10px; width: 120px; margin: 5px;
      text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); 
    }
    .item-img { width: 48px; height: 48px; image-rendering: pixelated; margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto; }
    /* Visual rendering for non-full blocks */
    .item-box.slab .item-img { height: 24px; margin-top: 24px; object-fit: cover; object-position: top; border-bottom: 2px solid rgba(0,0,0,0.5); }
    .item-box.carpet .item-img { height: 8px; margin-top: 40px; object-fit: cover; object-position: top; border-bottom: 1px solid rgba(0,0,0,0.5); }
    .item-box.stairs .item-img { clip-path: polygon(0% 50%, 50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%); }
    
    .item-count { font-size: 16px; font-weight: bold; color: #00bcd4; margin-bottom: 4px; }
    .item-name { font-size: 11px; color: #aaa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    h1 { margin-left: 10px; color: #00bcd4; }
    .reset-btn { 
      margin: 20px 10px; padding: 12px 20px; background: #ff4081; color: #fff; border: none; 
      font-weight: bold; cursor: pointer; border-radius: 4px; text-transform: uppercase;
    }
    .reset-btn:hover { background: #f50057; }
    .nav { margin-bottom: 20px; padding-left: 10px; }
    .nav a { color: #00bcd4; text-decoration: none; font-weight: bold; margin-right: 20px; }
  </style>
  <script>
    function tryNext(img, list) {
      if (!list || list.length === 0) {
        img.onerror = null;
        img.src = '/textures/block/barrier.png';
        return;
      }
      var nextSrc = list.shift();
      img.src = nextSrc;
    }
    async function resetCollected() {
      const res = await fetch('/api/reset-collected', { method: 'POST' });
      if (res.ok) {
        location.reload();
      }
    }
  </script>
</head>
<body>
  <div class="nav">
    <a href="/panel">← Dashboard</a>
    <a href="/stats">Stats</a>
    <a href="/allcollected">Full Archive</a>
  </div>
  <h1>Museum of Collected Items</h1>
  <div class="grid">`
      
      if (rows.length === 0) {
        html += '<p style="padding: 20px;">No items logged yet.</p>'
      } else {
        for (const row of rows) {
          const name = row.item_name;
          let itemClass = '';
          if (name.endsWith('_slab')) itemClass = 'slab';
          else if (name.endsWith('_carpet')) itemClass = 'carpet';
          else if (name.endsWith('_stairs')) itemClass = 'stairs';

          const fallbacks = [
            `/textures/item/${name}.png`,
            `/textures/block/${name}.png`
          ];

          if (name.endsWith('_spawn_egg')) fallbacks.push('/textures/item/spawn_egg.png');
          if (name.includes('banner')) fallbacks.push(`/textures/map/decorations/${name}.png`);
          if (name === 'bundle') fallbacks.push('/textures/item/bundle.png');
          
          let temp = name;
          const prefixes = ['waxed_', 'weathered_', 'oxidized_', 'exposed_', 'cut_', 'chiseled_', 'polished_', 'smooth_'];
          const suffixes = ['_stairs', '_slab', '_wall', '_fence', '_fence_gate', '_door', '_button', '_pressure_plate', '_carpet', '_banner', '_hanging_sign', '_sign', '_trapdoor', '_gate', '_tile', '_mosaic'];
          
          for (let i = 0; i < 4; i++) {
            let changed = false;
            for (const p of prefixes) { if (temp.startsWith(p)) { temp = temp.substring(p.length); changed = true; } }
            for (const s of suffixes) { if (temp.endsWith(s)) { temp = temp.substring(0, temp.length - s.length); changed = true; } }
            if (!changed) break;
            
            fallbacks.push(`/textures/item/${temp}.png`);
            fallbacks.push(`/textures/block/${temp}.png`);
            fallbacks.push(`/textures/block/${temp}s.png`);
            fallbacks.push(`/textures/block/${temp}_top.png`);
            fallbacks.push(`/textures/block/${temp}_planks.png`);
            fallbacks.push(`/textures/block/${temp}_wool.png`);
          }

          fallbacks.push(`/textures/block/${name}_top.png`);
          fallbacks.push(`/textures/block/${name}_front.png`);
          
          if (name.includes('oak')) fallbacks.push('/textures/block/oak_planks.png');
          if (name.includes('stone')) fallbacks.push('/textures/block/stone.png');
          if (name.includes('deepslate')) fallbacks.push('/textures/block/deepslate.png');
          
          const first = fallbacks.shift();
          const listJson = JSON.stringify(fallbacks).replace(/"/g, "'");
          
          let imgSrc = first;
          if (name === 'trial_spawner') imgSrc = '/textures/block/trial_spawner_side_inactive.png';
          
          html += `
    <div class="item-box ${itemClass}">
      <img class="item-img" src="${imgSrc}" onerror="tryNext(this, ${listJson})">
      <div class="item-count">${row.count}x</div>
      <div class="item-name" title="${name}">${name}</div>
    </div>`
        }
      }
      
      html += `
  </div>
  <button class="reset-btn" onclick="resetCollected()">Reset Museum</button>
  <p style="margin-top: 30px; padding: 10px; font-size: 12px; color: #666; border-top: 1px solid #333;">Bot Collected Registry &bull; Manual refresh to update</p>
</body>
</html>`
      res.end(html)
    } catch (err) {
      console.error('[WEB] Collected error:', err)
      res.end('Error loading collected items: ' + err.message)
    }
    return
  }

  if (path === '/api/reset-collected' && req.method === 'POST') {
    if (!db) {
      res.writeHead(503); res.end('Database not available'); return;
    }
    try {
      logToConsole('[WEB] Manual museum reset triggered via panel');
      await db.execute('DELETE FROM item_logs');
      sendToDiscordChannel('🧹 Museum Reset: The museum has been manually cleared via the control panel.', "\u001b[33m"); // YELLOW
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    } catch (err) {
      console.error('[WEB] Reset error:', err)
      res.writeHead(500); res.end(JSON.stringify({ success: false, error: err.message }))
    }
    return
  }

  if (path === '/stats') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    if (!db) { res.end('Database not available'); return; }
    try {
      // 0. Get Online Players
      const onlinePlayers = bot && bot.players ? Object.keys(bot.players).filter(p => p) : []

      // 1. Top Playtime
      const [topPlaytime] = await db.execute('SELECT username, playtime, deaths, chat_messages FROM players ORDER BY playtime DESC LIMIT 10')
      
      // 2. Server Totals
      const [serverStats] = await db.execute('SELECT stat_name, stat_value FROM server_stats')
      const stats = {}
      serverStats.forEach(s => stats[s.stat_name] = s.stat_value)
      
      // 3. Chat Activity by Hour
      const [chatActivity] = await db.execute('SELECT HOUR(timestamp) as hour, COUNT(*) as count FROM chat_logs GROUP BY hour ORDER BY hour')
      const chatHours = Array(24).fill(0)
      chatActivity.forEach(row => chatHours[row.hour] = row.count)

      // 4. Most Collected Items (Persistent)
      const [topItems] = await db.execute('SELECT item_name, COUNT(*) as count FROM all_item_logs GROUP BY item_name ORDER BY count DESC LIMIT 10')

      let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="60">
  <title>JuroBot Server Stats</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg: #121212;
      --card-bg: #1e1e1e;
      --text: #e0e0e0;
      --primary: #00bcd4;
      --accent: #ff4081;
      --border: #333;
    }
    body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; line-height: 1.4; font-size: 16px; margin: 0; }
    .container { max-width: 1000px; margin: 0 auto; }
    h1, h2 { color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 5px; margin-top: 30px; }
    h1 { margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background: var(--card-bg); border-radius: 8px; overflow: hidden; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid var(--border); }
    th { background: rgba(255,255,255,0.05); color: var(--primary); text-transform: uppercase; font-size: 12px; }
    .nav { margin-bottom: 20px; font-weight: bold; }
    .nav a { color: var(--primary); text-decoration: none; margin-right: 20px; }
    .nav a:hover { text-decoration: underline; }
    .stat-card { background: var(--card-bg); padding: 20px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 25px; }
    .chart-container { height: 300px; position: relative; margin-top: 15px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
    .online-player { display: inline-block; background: #2a2a2a; color: #fff; padding: 5px 12px; margin: 5px; border-radius: 20px; border-left: 3px solid #4caf50; font-size: 14px; }
    @media (max-width: 800px) { .grid-2, .grid-3 { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="nav">
      <a href="/panel">← Dashboard</a>
      <a href="/collected">Museum</a>
      <a href="/allcollected">Full Archive</a>
    </div>
    <h1>Server Statistics</h1>

    <div class="stat-card">
      <h2>Currently Online (${onlinePlayers.length})</h2>
      <div style="padding-top: 10px;">
        ${onlinePlayers.length > 0 ? onlinePlayers.map(p => `<span class="online-player">${p}</span>`).join('') : '<span style="color: #666;">No players online right now.</span>'}
      </div>
    </div>
    
    <div class="grid-2">
      <div class="stat-card">
        <h2>General Totals</h2>
        <table>
          <tr><td>Total Unique Players</td><td>${stats.total_players || 0}</td></tr>
          <tr><td>Total Chat Messages</td><td>${stats.total_chat_messages || 0}</td></tr>
          <tr><td>Total Player Deaths</td><td>${stats.total_deaths || 0}</td></tr>
        </table>
      </div>

      <div class="stat-card">
        <h2>Top Items</h2>
        <table>
          <tr><th>Item</th><th>Count</th></tr>`
      
      topItems.forEach(i => {
        html += `<tr><td>${i.item_name}</td><td>${i.count}</td></tr>`
      })

      html += `</table>
      </div>
    </div>

    <div class="stat-card">
      <h2>Top Playtime (Hours)</h2>
      <div class="chart-container">
        <canvas id="playtimeChart"></canvas>
      </div>
    </div>

    <div class="stat-card">
      <h2>Chat Activity (24h)</h2>
      <div class="chart-container">
        <canvas id="chatChart"></canvas>
      </div>
    </div>

    <div class="stat-card">
      <h2>Player Leaderboard</h2>
      <table>
        <tr><th>Player</th><th>Playtime</th><th>Msgs</th><th>Deaths</th></tr>`
      
      topPlaytime.forEach(p => {
        const hours = Math.floor(p.playtime / 3600);
        const mins = Math.floor((p.playtime % 3600) / 60);
        html += `<tr><td>${p.username}</td><td>${hours}h ${mins}m</td><td>${p.chat_messages}</td><td>${p.deaths}</td></tr>`
      })

      html += `</table>
    </div>
    
    <p style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid var(--border); padding-top: 10px;">
      Stats generated at: ${new Date().toLocaleString()}
    </p>
  </div>

  <script>
    const playtimeCtx = document.getElementById('playtimeChart').getContext('2d');
    new Chart(playtimeCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(topPlaytime.map(p => p.username))},
        datasets: [{
          label: 'Hours',
          data: ${JSON.stringify(topPlaytime.map(p => (p.playtime / 3600).toFixed(1)))},
          backgroundColor: '#00bcd4',
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#888' } },
          x: { grid: { display: false }, ticks: { color: '#888' } }
        }
      }
    });

    const chatCtx = document.getElementById('chatChart').getContext('2d');
    new Chart(chatCtx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(Array.from({length: 24}, (_, i) => i + ':00'))},
        datasets: [{
          label: 'Messages',
          data: ${JSON.stringify(chatHours)},
          borderColor: '#ff4081',
          backgroundColor: 'rgba(255, 64, 129, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#888' } },
          x: { grid: { color: '#333' }, ticks: { color: '#888' } }
        }
      }
    });
  </script>
</body>
</html>`
      res.end(html)
    } catch (err) {
      console.error('[WEB] Stats error:', err)
      res.end('Error loading stats: ' + err.message)
    }
    return
  }

  if (path === '/staticmap') {
    if (!bot || !bot.entity) {
      res.writeHead(503); res.end('Bot loading...'); return;
    }

    const radius = 64; 
    const cellSize = 8;
    const botPos = bot.entity.position;
    const { exec } = require('child_process');
    const tmpFile = pathModule.join(__dirname, 'assets', 'staticmap.png');
    const mvgFile = pathModule.join(__dirname, 'assets', 'staticmap.mvg');
    
    // Create an MVG (Magick Vector Graphics) file for high performance
    let mvg = `viewbox 0 0 ${(radius*2+1)*cellSize} ${(radius*2+1)*cellSize}\nfill black\nrectangle 0,0 ${(radius*2+1)*cellSize},${(radius*2+1)*cellSize}\n`;
    
    for (let z = -radius; z <= radius; z++) {
      for (let x = -radius; x <= radius; x++) {
        let found = 'air';
        let foundY = 0;
        for (let y = 10; y >= -10; y--) {
          const b = bot.blockAt(botPos.offset(x, y, z));
          if (b && b.name !== 'air' && b.name !== 'cave_air' && b.name !== 'void_air') {
            found = b.name;
            foundY = Math.floor(botPos.y + y);
            break;
          }
        }
        
        if (found !== 'air') {
          const px = (x + radius) * cellSize;
          const pz = (z + radius) * cellSize;
          
          let name = found.toLowerCase();
          
          // Slab override logic
          if (name.includes('_slab')) {
            const base = name.replace('_slab', '');
            if (fs.existsSync(pathModule.join(__dirname, 'assets/minecraft/textures/block', base + '_planks.png'))) name = base + '_planks';
            else if (fs.existsSync(pathModule.join(__dirname, 'assets/minecraft/textures/block', base + '.png'))) name = base;
            else if (base === 'bamboo') name = 'bamboo_planks';
          }

          let tex = 'stone.png';
          if (name.includes('grass')) tex = 'grass_block_top.png';
          else if (name.includes('dirt')) tex = 'dirt.png';
          else if (name.includes('water')) tex = 'water_still.png';
          else if (name.includes('sand')) tex = 'sand.png';
          else if (name.includes('deepslate')) tex = 'deepslate.png';
          else if (name.includes('planks')) tex = name.includes('_planks') ? name + '.png' : 'oak_planks.png';
          else if (name.includes('cobble')) tex = 'cobblestone.png';
          else if (name.includes('netherrack')) tex = 'netherrack.png';
          else if (fs.existsSync(pathModule.join(__dirname, 'assets/minecraft/textures/block', name + '.png'))) tex = name + '.png';

          const texPath = pathModule.join(__dirname, 'assets/minecraft/textures/block', tex);
          mvg += `image over ${px},${pz} ${cellSize},${cellSize} "${texPath}"\n`;
          
          // Shading logic
          if (x > -radius && z > -radius) {
            const nw = bot.blockAt(botPos.offset(x-1, 1, z-1)); 
            if (nw && nw.name !== 'air') {
              mvg += `fill "rgba(255,255,255,0.1)"\nrectangle ${px},${pz} ${px+cellSize},${pz+cellSize}\n`;
            }
          }
        }
      }
    }

    // Entities
    if (bot.entities) {
      for (const entity of Object.values(bot.entities)) {
        if (entity === bot.entity) continue;
        const dx = entity.position.x - botPos.x, dz = entity.position.z - botPos.z;
        if (Math.abs(dx) > radius || Math.abs(dz) > radius) continue;
        const ex = (dx + radius) * cellSize + cellSize/2, ez = (dz + radius) * cellSize + cellSize/2;
        let color = 'magenta';
        if (entity.type === 'player') color = 'red';
        else if (entity.type === 'mob') color = 'orange';
        else if (entity.type === 'item') color = 'yellow';
        mvg += `fill ${color}\nstroke white\ncircle ${ex},${ez} ${ex+cellSize},${ez}\n`;
      }
    }

    // Self
    const c = radius * cellSize + cellSize/2;
    mvg += `fill "#00bcd4"\nstroke white\ncircle ${c},${c} ${c+cellSize},${c}\n`;

    fs.writeFileSync(mvgFile, mvg);
    
    exec(`convert mvg:"${mvgFile}" "${tmpFile}"`, (error) => {
      if (error) {
        console.error('[WEB] ImageMagick error:', error);
        res.writeHead(500); res.end('Error generating PNG');
      } else {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(fs.readFileSync(tmpFile));
      }
    });
    return;
  }

  if (path === '/allcollected') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    if (!db) { res.end('Database not available'); return; }
    try {
      const [rows] = await db.execute(
        'SELECT item_name, COUNT(*) as count FROM all_item_logs GROUP BY item_name ORDER BY count DESC'
      )
      
      let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>All Collected Items (Persistent)</title>
  <style>
    body { background: #1a1a1a; color: #fff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; margin: 0; }
    .grid { padding: 10px; width: 100%; }
    .item-box { 
      display: inline-block; vertical-align: top;
      background: #3a3a3a; border: 1px solid #555; padding: 10px; width: 120px; margin: 5px;
      text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); 
    }
    .item-img { width: 48px; height: 48px; image-rendering: pixelated; margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto; }
    /* Visual rendering for non-full blocks */
    .item-box.slab .item-img { height: 24px; margin-top: 24px; object-fit: cover; object-position: top; border-bottom: 2px solid rgba(0,0,0,0.5); }
    .item-box.carpet .item-img { height: 8px; margin-top: 40px; object-fit: cover; object-position: top; border-bottom: 1px solid rgba(0,0,0,0.5); }
    .item-box.stairs .item-img { clip-path: polygon(0% 50%, 50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%); }
    
    .item-count { font-size: 16px; font-weight: bold; color: #00bcd4; margin-bottom: 4px; }
    .item-name { font-size: 11px; color: #aaa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    h1 { margin-left: 10px; color: #00bcd4; }
  </style>
  <script>
    function tryNext(img, list) {
      if (!list || list.length === 0) {
        img.onerror = null;
        img.src = '/textures/block/barrier.png';
        return;
      }
      var nextSrc = list.shift();
      img.src = nextSrc;
    }
  </script>
</head>
<body>
  <h1>The Great Hall of Everything</h1>
  <div class="grid">`
      
      if (rows.length === 0) {
        html += '<p style="padding: 20px;">No items logged yet.</p>'
      } else {
        for (const row of rows) {
          const name = row.item_name;
          let itemClass = '';
          if (name.endsWith('_slab')) itemClass = 'slab';
          else if (name.endsWith('_carpet')) itemClass = 'carpet';
          else if (name.endsWith('_stairs')) itemClass = 'stairs';

          const fallbacks = [
            `/textures/item/${name}.png`,
            `/textures/block/${name}.png`
          ];

          if (name.endsWith('_spawn_egg')) fallbacks.push('/textures/item/spawn_egg.png');
          if (name.includes('banner')) fallbacks.push(`/textures/map/decorations/${name}.png`);
          if (name === 'bundle') fallbacks.push('/textures/item/bundle.png');
          
          let temp = name;
          const prefixes = ['waxed_', 'weathered_', 'oxidized_', 'exposed_', 'cut_', 'chiseled_', 'polished_', 'smooth_'];
          const suffixes = ['_stairs', '_slab', '_wall', '_fence', '_fence_gate', '_door', '_button', '_pressure_plate', '_carpet', '_banner', '_hanging_sign', '_sign', '_trapdoor', '_gate', '_tile', '_mosaic'];
          
          for (let i = 0; i < 4; i++) {
            let changed = false;
            for (const p of prefixes) { if (temp.startsWith(p)) { temp = temp.substring(p.length); changed = true; } }
            for (const s of suffixes) { if (temp.endsWith(s)) { temp = temp.substring(0, temp.length - s.length); changed = true; } }
            if (!changed) break;
            
            fallbacks.push(`/textures/item/${temp}.png`);
            fallbacks.push(`/textures/block/${temp}.png`);
            fallbacks.push(`/textures/block/${temp}s.png`);
            fallbacks.push(`/textures/block/${temp}_top.png`);
            fallbacks.push(`/textures/block/${temp}_planks.png`);
            fallbacks.push(`/textures/block/${temp}_wool.png`);
          }

          fallbacks.push(`/textures/block/${name}_top.png`);
          fallbacks.push(`/textures/block/${name}_front.png`);
          
          if (name.includes('oak')) fallbacks.push('/textures/block/oak_planks.png');
          if (name.includes('stone')) fallbacks.push('/textures/block/stone.png');
          if (name.includes('deepslate')) fallbacks.push('/textures/block/deepslate.png');
          
          const first = fallbacks.shift();
          const listJson = JSON.stringify(fallbacks).replace(/"/g, "'");
          
          let imgSrc = first;
          if (name === 'trial_spawner') imgSrc = '/textures/block/trial_spawner_side_inactive.png';
          
          html += `
    <div class="item-box ${itemClass}">
      <img class="item-img" src="${imgSrc}" onerror="tryNext(this, ${listJson})">
      <div class="item-count">${row.count}x</div>
      <div class="item-name" title="${name}">${name}</div>
    </div>`
        }
      }
      
      html += `
  </div>
  <p style="margin-top: 30px; padding: 10px; font-size: 12px; color: #666; border-top: 1px solid #333;">Persistent Hall of Everything &bull; Does not reset</p>
</body>
</html>`
      res.end(html)
    } catch (err) {
      console.error('[WEB] All Collected error:', err)
      res.end('Error: ' + err.message)
    }
    return
  }

  if (path === '/inv') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    if (!bot || !bot.inventory) {
      res.end('Bot inventory not available\n')
      return
    }
    const inventorySummary = {}
    for (const item of bot.inventory.items()) {
      inventorySummary[item.name] = (inventorySummary[item.name] || 0) + item.count
    }
    if (Object.keys(inventorySummary).length === 0) {
      res.end('Empty\n')
    } else {
      const invText = Object.entries(inventorySummary)
        .map(([name, count]) => `${name} ${count}x`)
        .join('\n')
      res.end(invText + '\n')
    }
    return
  }

  if (path.startsWith('/textures/')) {
    const parts = path.split('/')
    if (parts.length >= 4) {
      const type = parts[2]
      const filename = parts[3]
      
      // Get all overlay folders and sort them descending (highest version first)
      const assetsDir = pathModule.join(__dirname, 'assets')
      const overlays = fs.readdirSync(assetsDir)
        .filter(f => f.startsWith('overlay_'))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));

      let filePath = null;
      
      // 1. Try overlays first
      for (const overlay of overlays) {
        const p = pathModule.join(assetsDir, overlay, 'assets/minecraft/textures', type, filename);
        if (fs.existsSync(p)) {
          filePath = p;
          break;
        }
      }
      
      // 2. Try standard assets
      if (!filePath) {
        const standardPath = pathModule.join(__dirname, 'assets/minecraft/textures', type, filename);
        if (fs.existsSync(standardPath)) {
          filePath = standardPath;
        }
      }

      if (filePath) {
        // Log every 100th request
        global.textureReqCount = (global.textureReqCount || 0) + 1
        if (global.textureReqCount % 100 === 0) {
          logToConsole(`[WEB] Serving texture #${global.textureReqCount}: ${type}/${filename}`)
        }
        res.writeHead(200, { 'Content-Type': 'image/png' })
        res.end(fs.readFileSync(filePath))
      } else {
        res.writeHead(404)
        res.end('Not found')
      }
      return
    }
  }

  if (path === '/api/textures') {
    logToConsole('[WEB] Texture list requested')
    try {
      const textureFile = pathModule.join(__dirname, 'assets', 'texture_list.txt')
      if (fs.existsSync(textureFile)) {
        const textures = fs.readFileSync(textureFile, 'utf8')
          .split('\n')
          .map(line => line.trim())
          .filter(line => line !== '')
        logToConsole(`[WEB] Serving ${textures.length} textures in list`)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(textures))
      } else {
        logToConsole('[WEB] Error: texture_list.txt not found')
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify([]))
      }
    } catch (err) {
      console.error('[WEB] Texture API error:', err)
      res.writeHead(500)
      res.end('Internal Server Error')
    }
    return
  }
  
  if (path === '/players') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    if (!bot || !bot.players) {
      res.end('Bot players not available\n')
      return
    }
    const playerList = Object.keys(bot.players).filter(p => p !== bot.username)
    if (playerList.length === 0) {
      res.end('Nobody online\n')
    } else {
      res.end(playerList.join('\n') + '\n')
    }
        return
      }
    
      if (path === '/logs') {    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    const logsText = consoleLogs
      .slice(-50) // Last 50 logs
      .map(log => `${log.time.substring(11, 19)} ${log.message}`)
      .join('\n')
    res.end(logsText + '\n')
    return
  }
  
  if (path === '/say') {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain' })
      res.end('Method not allowed\n')
      return
    }
    const msg = parsedUrl.searchParams.get('msg')
    if (!msg) {
      res.writeHead(400, { 'Content-Type': 'text/plain' })
      res.end('Missing msg parameter\n')
      return
    }
    if (bot && botOnline) {
      queueMessage(msg)
      logToConsole(`[WEB] /say: ${msg}`)
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end(`Message sent: ${msg}\n`)
    } else {
      res.writeHead(503, { 'Content-Type': 'text/plain' })
      res.end('Bot is offline\n')
    }
    return
  }
  
  if (path === '/status') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    let statusText = 'JuroBot Status\n'
    statusText += '==============\n'
    statusText += 'Bot online: ' + (botOnline ? 'YES' : 'NO') + '\n'
    statusText += 'Bot username: ' + (bot ? bot.username : 'N/A') + '\n'
    statusText += 'Ping: ' + (bot && bot.player ? bot.player.ping : 0) + 'ms\n'
    statusText += 'Health: ' + (bot ? bot.health : 0) + '/20\n'
    statusText += 'Food: ' + (bot ? bot.food : 0) + '/20\n'
    statusText += 'Level: ' + (bot && bot.experience ? bot.experience.level : 0) + '\n'
    
    if (bot && bot.entity) {
      const pos = bot.entity.position
      statusText += 'Position: X:' + Math.round(pos.x) + ' Y:' + Math.round(pos.y) + ' Z:' + Math.round(pos.z) + '\n'
      statusText += 'Dimension: ' + (bot.game ? bot.game.dimension : 'unknown') + '\n'
    }
    
    const uptime = Math.floor((Date.now() - startTime) / 1000)
    const h = Math.floor(uptime / 3600)
    const m = Math.floor((uptime % 3600) / 60)
    const s = uptime % 60
    statusText += 'Uptime: ' + h + 'h ' + m + 'm ' + s + 's\n'
    
    statusText += 'Discord connected: ' + (discordClient ? 'YES' : 'NO') + '\n'
    
    if (bot && bot.players) {
      const playerList = Object.keys(bot.players).filter(p => p !== bot.username)
      statusText += 'Online players (' + playerList.length + '): ' + (playerList.join(', ') || 'None') + '\n'
    }
    
    if (bot && bot.inventory) {
      const inventorySummary = {}
      for (const item of bot.inventory.items()) {
        inventorySummary[item.name] = (inventorySummary[item.name] || 0) + item.count
      }
      const itemCount = Object.keys(inventorySummary).length
      statusText += 'Inventory items: ' + itemCount + '\n'
    }
    
    res.end(statusText)
    return
  }
  
  // Plain text main panel (e-reader friendly)
  if (path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    let panelText = 'JuroBot Control Panel\n'
    panelText += '=====================\n\n'
    
    // Bot status
    panelText += 'Status: ' + (botOnline ? 'ONLINE' : 'OFFLINE') + '\n'
    if (bot) {
      panelText += 'Username: ' + bot.username + '\n'
    }
    panelText += 'Discord: ' + (discordClient ? 'CONNECTED' : 'DISABLED') + '\n'
    panelText += '\n'
    
    // Quick commands
    panelText += 'Quick Commands:\n'
    panelText += '  /inv          - Show bot inventory\n'
    panelText += '  /players      - List online players\n'
    panelText += '  /logs         - View console logs\n'
    panelText += '  /status       - Bot status\n'
    panelText += '  /say?msg=TEXT - Send chat message\n'
    panelText += '\n'
    
    // Online players
    if (bot && bot.players) {
      const playerList = Object.keys(bot.players).filter(p => p !== bot.username)
      panelText += 'Online Players (' + playerList.length + '):\n'
      if (playerList.length > 0) {
        panelText += playerList.join(', ') + '\n'
      } else {
        panelText += 'Nobody online\n'
      }
    }
    panelText += '\n'
    
    panelText += 'Recent Logs:\n'
    const recentLogs = consoleLogs.slice(-5)
    if (recentLogs.length > 0) {
      recentLogs.forEach(log => {
        panelText += log.time.substring(11, 19) + ' ' + log.message + '\n'
      })
    } else {
      panelText += 'No logs yet\n'
    }
    
    panelText += '\n'
    panelText += 'Full interface: http://localhost:' + CONFIG.web_port + '/panel\n'
    
    res.end(panelText)
    return
  }
  
  // Fullscreen Map
  if (path === '/map') {
    logToConsole('[WEB] Accessing /map (Fullscreen)')
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>JuroBot Live Map - Bare Bones</title>
<style>
  body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; font-family: sans-serif; }
  #map-container { width: 100%; height: 100%; position: relative; cursor: crosshair; }
  #map-canvas { background: #007bff; display: block; image-rendering: pixelated; }
  #ui { position: absolute; top: 10px; left: 10px; z-index: 100; color: #fff; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px; pointer-events: none; }
  #entity-data { 
    position: absolute; top: 10px; right: 10px; width: 350px; bottom: 10px; 
    background: rgba(0,0,0,0.85); color: #0f0; padding: 15px; border-radius: 8px; 
    overflow-y: auto; font-family: monospace; font-size: 12px; display: none; z-index: 200;
    border: 1px solid #333;
  }
  #entity-data h3 { color: #00bcd4; margin-top: 0; }
  .close-btn { position: absolute; top: 5px; right: 10px; cursor: pointer; color: #f00; font-size: 20px; pointer-events: auto; }
  #controls { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); padding: 10px; border-radius: 20px; color: #fff; z-index: 100; }
  kbd { background: #333; padding: 2px 5px; border-radius: 3px; border: 1px solid #555; }
  #loading { 
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #121212; 
    display: flex; flex-direction: column; align-items: center; justify-content: center; 
    z-index: 1000; color: #00bcd4;
  }
</style>
</head>
<body>
<div id="loading">
  <h1>Loading Textures...</h1>
  <div id="loading-status">0%</div>
</div>

<div id="ui">
  <b>JuroBot Live Map</b><br>
  Coords: <span id="coords">0, 0</span><br>
  Zoom: <span id="zoom-val">1.0</span>x<br>
  Entities: <span id="ent-count">0</span>
</div>

<div id="entity-data">
  <span class="close-btn" onclick="document.getElementById('entity-data').style.display='none'">×</span>
  <div id="entity-content"></div>
</div>

<div id="controls">
  Pan: <kbd>Drag</kbd> or <kbd>Arrows</kbd> | Zoom: <kbd>Scroll</kbd> or <kbd>+</kbd>/<kbd>-</kbd> | Reset: <kbd>Space</kbd>
</div>

<div id="map-container">
  <canvas id="map-canvas"></canvas>
</div>

<script>
  console.log('[MAP] Script starting...');
  const canvas = document.getElementById('map-canvas');
  const ctx = canvas.getContext('2d');
  const container = document.getElementById('map-container');
  
  let mapCache = {};
  let panX = 0;
  let panY = 0;
  let zoom = 32; 
  let lastMouseX = 0;
  let lastMouseY = 0;
  let isDragging = false;
  let botPos = { x: 0, z: 0 };
  let entities = [];
  let selectedEntity = null;
  let textures = {}; 
  let mouseWorldX = null;
  let mouseWorldZ = null;
  const blockTextureCache = {};

  async function loadTextures() {
    const status = document.getElementById('loading-status');
    console.log('[MAP] Loading textures...');
    try {
      const response = await fetch('/api/textures');
      if (!response.ok) throw new Error('Failed to fetch texture list: ' + response.status);
      const textureList = await response.json();
      console.log('[MAP] Successfully fetched texture list with ' + textureList.length + ' items');
      console.log('[MAP] Found ' + textureList.length + ' textures to download');
      
      const total = textureList.length;
      console.log('[MAP] Total textures to load:', total);
      if (total === 0) {
        console.warn('[MAP] Texture list is empty');
        document.getElementById('loading').style.display = 'none';
        return;
      }
      
      status.textContent = '0%';
      let loaded = 0;

      // Load in batches
      const batchSize = 20;
      for (let i = 0; i < textureList.length; i += batchSize) {
        console.log('[MAP] Fetching batch starting at ' + i);
        const batch = textureList.slice(i, i + batchSize);
        await Promise.all(batch.map(async (file) => {
          const name = file.replace('.png', '');
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              textures[name] = img;
              loaded++;
              console.log('[MAP] Loaded (' + loaded + '/' + total + '): ' + file);
              status.textContent = Math.round((loaded / total) * 100) + '%';
              resolve();
            };
            img.onerror = () => {
              loaded++;
              console.warn('[MAP] Failed to load: ' + file);
              status.textContent = Math.round((loaded / total) * 100) + '%';
              resolve();
            };
            img.src = '/textures/block/' + file;
          });
        }));
      }

      console.log('[MAP] Textures loaded.');
      document.getElementById('loading').style.display = 'none';
    } catch (err) {
      console.error('[MAP] Error:', err);
      status.textContent = 'Error: ' + err.message;
      setTimeout(() => { document.getElementById('loading').style.display = 'none'; }, 3000);
    }
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
  }
  window.addEventListener('resize', resize);
  resize();

  function getTextureForBlock(name) {
    if (!name) return null;
    if (blockTextureCache[name]) return blockTextureCache[name];

    let originalName = name;
    name = name.toLowerCase();
    
    // Slab override
    if (name.includes('_slab')) {
      let base = name.replace('_slab', '');
      if (textures[base + '_planks']) name = base + '_planks';
      else if (textures[base]) name = base;
      else if (base === 'bamboo') name = 'bamboo_planks';
    }

    let tex = null;
    if (textures[name + '_top']) tex = textures[name + '_top'];
    else if (textures[name]) tex = textures[name];
    else if (name.includes('grass')) tex = textures['grass_block_top'];
    else if (name.includes('dirt')) tex = textures['dirt'];
    else if (name.includes('stone')) tex = textures['stone'];
    else if (name.includes('water')) tex = textures['water_still'];
    else if (name.includes('lava')) tex = textures['lava_still'];
    else if (name.includes('log')) tex = textures[name + '_top'] || textures[name];
    else if (name.includes('leaves')) tex = textures[name];
    else if (name.includes('planks')) tex = textures[name];
    
    blockTextureCache[originalName] = tex;
    return tex;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2 + panX;
    const centerY = canvas.height / 2 + panY;

    const radius = Math.ceil(canvas.width / (zoom * 2)) + 10;
    const startX = Math.floor(botPos.x - radius);
    const endX = Math.ceil(botPos.x + radius);
    const startZ = Math.floor(botPos.z - radius);
    const endZ = Math.ceil(botPos.z + radius);

    // Draw grid
    if (zoom > 4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = startX; x <= endX; x++) {
        const bx = centerX + (x - botPos.x) * zoom - (zoom / 2);
        ctx.moveTo(bx, 0); ctx.lineTo(bx, canvas.height);
      }
      for (let z = startZ; z <= endZ; z++) {
        const bz = centerY + (z - botPos.z) * zoom - (zoom / 2);
        ctx.moveTo(0, bz); ctx.lineTo(canvas.width, bz);
      }
      ctx.stroke();
    }

    for (let x = startX; x <= endX; x++) {
      for (let z = startZ; z <= endZ; z++) {
        const entry = mapCache[x + ',' + z];
        if (entry) {
          const bx = centerX + (x - botPos.x) * zoom - (zoom/2);
          const bz = centerY + (z - botPos.z) * zoom - (zoom/2);
          
          const tex = getTextureForBlock(entry.name);
          if (tex) {
            ctx.drawImage(tex, bx, bz, zoom + 0.5, zoom + 0.5);
          } else {
            let color = '#1a1a1a';
            const name = entry.name.toLowerCase();
            if (name.includes('grass') || name.includes('leaves')) color = '#2d4c14';
            else if (name.includes('bamboo')) color = '#ffeb3b';
            else if (name.includes('dirt') || name.includes('wood')) color = '#4d331f';
            else if (name.includes('stone') || name.includes('cobble')) color = '#333';
            else if (name.includes('water')) color = '#000066';
            else if (name.includes('lava')) color = '#662200';
            ctx.fillStyle = color;
            ctx.fillRect(bx, bz, zoom + 0.5, zoom + 0.5);
          }

          const nwEntry = mapCache[(x-1) + ',' + (z-1)];
          if (nwEntry) {
            const diff = entry.y - nwEntry.y;
            if (diff > 0) {
              ctx.fillStyle = 'rgba(255,255,255,0.15)'; 
              ctx.fillRect(bx, bz, zoom + 0.5, zoom + 0.5);
            } else if (diff < 0) {
              ctx.fillStyle = 'rgba(0,0,0,0.15)'; 
              ctx.fillRect(bx, bz, zoom + 0.5, zoom + 0.5);
            }
          }
        }
      }
    }

    // Highlight block under mouse
    if (mouseWorldX !== null && mouseWorldZ !== null) {
      const bx = centerX + (mouseWorldX - botPos.x) * zoom - (zoom / 2);
      const bz = centerY + (mouseWorldZ - botPos.z) * zoom - (zoom / 2);
      ctx.strokeStyle = '#00bcd4';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, bz, zoom, zoom);
      ctx.fillStyle = 'rgba(0, 188, 212, 0.2)';
      ctx.fillRect(bx, bz, zoom, zoom);
    }

    entities.forEach(e => {
      const ex = centerX + (e.absX - botPos.x) * zoom;
      const ez = centerY + (e.absZ - botPos.z) * zoom;
      
      if (e.type === 'player') ctx.fillStyle = '#ff0000';
      else if (e.name === 'vindicator' || e.mobType === 'Vindicator') ctx.fillStyle = '#ff00ff';
      else if (e.type === 'mob') ctx.fillStyle = '#ff8800';
      else if (e.type === 'item') ctx.fillStyle = '#d4af37';
      else ctx.fillStyle = '#880088';
      
      ctx.beginPath(); ctx.arc(ex, ez, zoom/4, 0, Math.PI * 2); ctx.fill();
      if (selectedEntity && selectedEntity.id === e.id) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      }
      
      ctx.fillStyle = '#fff';
      ctx.font = (zoom < 8) ? "0px Arial" : "10px Arial";
      ctx.fillText(e.name, ex + 5, ez - 5);
    });

    ctx.fillStyle = '#00bcd4';
    ctx.beginPath(); ctx.arc(centerX, centerY, zoom/3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillText("YOU", centerX + 10, centerY - 10);
  }

  function updateData() {
    fetch('/api/status').then(r => r.json()).then(d => {
      if (d.bot && d.bot.pos) {
        botPos = d.bot.pos;
        document.getElementById('coords').textContent = Math.round(botPos.x) + ', ' + Math.round(botPos.z);
      }
      if (d.blocks) {
        d.blocks.forEach(b => {
          mapCache[(Math.floor(botPos.x) + b.x) + ',' + (Math.floor(botPos.z) + b.z)] = { name: b.name, y: b.y };
        });
      }
      if (d.nearby) {
        entities = d.nearby;
        document.getElementById('ent-count').textContent = entities.length;
        if (selectedEntity) {
          const updated = entities.find(e => e.id === selectedEntity.id);
          if (updated) { selectedEntity = updated; showEntityData(updated); }
        }
      }
      draw();
    }).catch(e => console.error("Map update error:", e));
  }

  container.onmousedown = (e) => { isDragging = true; lastMouseX = e.clientX; lastMouseY = e.clientY; };
  window.onmouseup = () => { isDragging = false; };
  window.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const centerX = canvas.width / 2 + panX;
    const centerY = canvas.height / 2 + panY;

    mouseWorldX = Math.floor((clickX - centerX) / zoom + botPos.x);
    mouseWorldZ = Math.floor((clickY - centerY) / zoom + botPos.z);

    if (isDragging) {
      panX += e.clientX - lastMouseX;
      panY += e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
    draw();
  };

  container.onwheel = (e) => {
    e.preventDefault();
    zoom = Math.max(2, Math.min(200, zoom - e.deltaY / 10));
    document.getElementById('zoom-val').textContent = (zoom/32).toFixed(1);
    draw();
  };

  container.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const centerX = canvas.width / 2 + panX;
    const centerY = canvas.height / 2 + panY;

    let found = null;
    entities.forEach(ent => {
      const ex = centerX + (ent.absX - botPos.x) * zoom;
      const ez = centerY + (ent.absZ - botPos.z) * zoom;
      const dist = Math.sqrt((clickX - ex)**2 + (clickY - ez)**2);
      if (dist < zoom/2) found = ent;
    });

    if (found) {
      selectedEntity = found;
      showEntityData(found);
    } else {
      selectedEntity = null;
      const worldX = Math.floor((clickX - centerX) / zoom + botPos.x);
      const worldZ = Math.floor((clickY - centerY) / zoom + botPos.z);
      if (e.shiftKey) inspectColumn(worldX, worldZ);
      else showBlockInfo(worldX, worldZ);
    }
    draw();
  };

  function showBlockInfo(x, z) {
    const box = document.getElementById('entity-data');
    const content = document.getElementById('entity-content');
    box.style.display = 'block';
    const entry = mapCache[x + ',' + z];
    let html = '<h3>Block at ' + x + ', ' + z + '</h3>';
    if (entry) {
      html += '<b>Name:</b> ' + entry.name + '<br><b>Surface Y:</b> ' + entry.y + '<br><i>(Cached)</i><br>';
    } else {
      html += '<i>No cached data.</i><br>';
    }
    html += '<hr><p style="font-size:11px; color:#888">Shift+Click to scan column live.</p>';
    content.innerHTML = html;
  }

  function inspectColumn(x, z) {
    const box = document.getElementById('entity-data');
    const content = document.getElementById('entity-content');
    box.style.display = 'block';
    content.innerHTML = '<h3>Scanning...</h3><p>X:' + x + ' Z:' + z + '</p>';
    fetch('/api/block-column?x=' + x + '&z=' + z)
      .then(r => r.json())
      .then(data => {
        if (data.error) { content.innerHTML += '<p style="color:red">' + data.error + '</p>'; return; }
        let html = '<h3>Column at ' + x + ', ' + z + '</h3>';
        html += '<b>Blocks:</b> ' + data.column.length + '<br><br>';
        html += '<div style="display:flex; flex-direction:column; border-left:2px solid #555; padding-left:10px;">';
        
        if (data.column.length === 0) {
          html += '<i>Empty</i>';
        } else {
          data.column.forEach(b => {
            const tex = getTextureForBlock(b.name);
            html += '<div style="margin-bottom:8px; display:flex; align-items:center; border-bottom:1px solid #333; padding-bottom:4px;">';
            if (tex) {
              html += '<canvas id="inspect-tex-' + b.y + '" width="32" height="32" style="margin-right:10px; border:1px solid #444; image-rendering:pixelated; background:#000; flex-shrink:0;"></canvas>';
            }
            html += '<div><b style="color:#00bcd4">Y ' + b.y + ':</b> ' + b.name + '</div></div>';
          });
        }
        html += '</div>';
        content.innerHTML = html;
        
        // Render textures to canvases
        data.column.forEach(b => {
          const tex = getTextureForBlock(b.name);
          if (tex) {
            const canv = document.getElementById('inspect-tex-' + b.y);
            if (canv) canv.getContext('2d').drawImage(tex, 0, 0, 32, 32);
          }
        });
      });
  }

  function showEntityData(ent) {
    const box = document.getElementById('entity-data');
    const content = document.getElementById('entity-content');
    box.style.display = 'block';
    let html = '<h3>' + ent.name + ' (' + ent.type + ')</h3>';
    html += '<b>Pos:</b> ' + ent.absX + ', ' + ent.y + ', ' + ent.absZ + '<br>';
    if (ent.health) html += '<b>Health:</b> ' + Math.round(ent.health) + '/20<br>';
    html += '<hr><b>RAW DATA:</b><br><pre>' + JSON.stringify(ent.raw, null, 2) + '</pre>';
    content.innerHTML = html;
  }

  window.onkeydown = (e) => {
    const step = 20;
    if (e.key === 'ArrowUp' || e.key === 'w') panY += step;
    else if (e.key === 'ArrowDown' || e.key === 's') panY -= step;
    else if (e.key === 'ArrowLeft' || e.key === 'a') panX += step;
    else if (e.key === 'ArrowRight' || e.key === 'd') panX -= step;
    else if (e.key === '+') zoom = Math.min(200, zoom + 5);
    else if (e.key === '-') zoom = Math.max(2, zoom - 5);
    else if (e.key === ' ') { panX = 0; panY = 0; zoom = 32; }
    document.getElementById('zoom-val').textContent = (zoom/32).toFixed(1);
    draw();
  };

  let lastTouchDist = 0;
  container.ontouchstart = (e) => {
    isDragging = true;
    lastMouseX = e.touches[0].clientX;
    lastMouseY = e.touches[0].clientY;
    if (e.touches.length === 2) lastTouchDist = Math.hypot(e.touches[0].pageX - e.touches[1].clientX, e.touches[0].pageY - e.touches[1].clientY);
  };
  container.ontouchmove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      panX += e.touches[0].clientX - lastMouseX; panY += e.touches[0].clientY - lastMouseY;
      lastMouseX = e.touches[0].clientX; lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].pageX - e.touches[1].clientX, e.touches[0].pageY - e.touches[1].clientY);
      if (lastTouchDist > 0) zoom = Math.max(2, Math.min(200, zoom * (dist / lastTouchDist)));
      lastTouchDist = dist;
    }
    draw();
  };
  container.ontouchend = () => { isDragging = false; lastTouchDist = 0; };

  function startApp() { setInterval(updateData, 1000); updateData(); }
  loadTextures().then(() => {
    startApp();
  });
</script>
</body>
</html>`)
    return
  }

  // Original HTML panel
  if (path === '/panel') {
    logToConsole('[WEB] Accessing /panel (Dashboard)')
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>JuroBot Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  :root {
    --bg: #121212;
    --card-bg: #1e1e1e;
    --text: #e0e0e0;
    --primary: #00bcd4;
    --accent: #ff4081;
    --border: #333;
  }
  body { 
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
    background: var(--bg); 
    color: var(--text); 
    padding: 20px;
    margin: 0;
    line-height: 1.6;
  }
  h1 { color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 10px; }
  .card {
    background: var(--card-bg);
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 20px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    border: 1px solid var(--border);
  }
  a { color: var(--primary); text-decoration: none; cursor: pointer; }
  a:hover { text-decoration: underline; }
  pre { 
    background: #000;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
    font-family: 'Consolas', monospace;
    font-size: 13px;
    color: #00ff00;
  }
  input {
    background: #000;
    color: #fff;
    border: 1px solid var(--border);
    padding: 8px;
    border-radius: 4px;
    width: 250px;
    margin-right: 10px;
  }
  .tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 20px; flex-wrap: wrap; }
  .tab { 
    padding: 10px 20px; 
    cursor: pointer; 
    border-bottom: 3px solid transparent;
    transition: 0.3s;
    font-weight: bold;
    color: #888;
  }
  .tab:hover { color: var(--text); background: rgba(255,255,255,0.05); }
  .tab.active { border-color: var(--primary); color: var(--primary); }
  .tab-content { display: none; }
  .tab-content.active { display: block; animation: fadeIn 0.5s; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
  .stat-item { text-align: center; }
  .stat-value { font-size: 20px; font-weight: bold; color: var(--primary); }
  .stat-label { font-size: 12px; text-transform: uppercase; color: #888; }
  
  #map-canvas { 
    border: 2px solid var(--border); 
    background: #007bff; 
    width: 100%; 
    max-width: 600px; 
    height: auto; 
    aspect-ratio: 1/1;
    image-rendering: pixelated;
    border-radius: 8px;
  }
  
  .player-card {
    border-left: 4px solid var(--primary);
    padding-left: 15px;
    margin-bottom: 15px;
    background: rgba(255,255,255,0.02);
    padding: 10px;
    border-radius: 0 8px 8px 0;
  }
  .enchant { color: #ffaa00; font-size: 11px; margin-right: 5px; }
  .equipment { font-size: 12px; color: #aaa; }

  #loading-overlay { 
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); 
    display: flex; flex-direction: column; align-items: center; justify-content: center; 
    z-index: 2000; color: #00bcd4;
  }
</style>
</head>
<body>
<div id="loading-overlay">
  <h2>Loading Textures...</h2>
  <div id="loading-status">0%</div>
</div>

<h1>JuroBot Control Panel</h1>

<div class="tabs">
  <div class="tab active" onclick="openTab(event, 'main-tab')">Dashboard</div>
  <div class="tab" onclick="openTab(event, 'player-info-tab')">Players Nearby</div>
  <div class="tab" onclick="openTab(event, 'map-tab')">Live Map</div>
  <div class="tab" onclick="openTab(event, 'analytics-tab')">Analytics</div>
  <div class="tab" onclick="openTab(event, 'inv-tab')">Inventory</div>
  <div class="tab" onclick="location.href='/collected'">Museum</div>
  <div class="tab" onclick="location.href='/stats'">Stats</div>
  <div class="tab" onclick="openTab(event, 'logs-tab')">Console</div>
</div>

<div id="main-tab" class="tab-content active">
  <div class="card stat-grid">
    <div class="stat-item"><div class="stat-value" id="status">...</div><div class="stat-label">Bot Status</div></div>
    <div class="stat-item"><div class="stat-value" id="bot-ping">0ms</div><div class="stat-label">Latency</div></div>
    <div class="stat-item"><div class="stat-value" id="bot-health">0/20</div><div class="stat-label">Health</div></div>
    <div class="stat-item"><div class="stat-value" id="bot-uptime">0s</div><div class="stat-label">Uptime</div></div>
  </div>

  <div class="card">
    <b>Quick Actions:</b><br><br>
    <a onclick="reconnect()">[RECONNECT BOT]</a> &nbsp; 
    <a onclick="stop()" style="color:var(--accent)">[TERMINATE BOT]</a> &nbsp; 
    <a onclick="update()">[FORCE REFRESH]</a>
  </div>

  <div class="card">
    <b>Send Broadcast:</b><br><br>
    <input type="text" id="cmd" placeholder="Type message..." onkeypress="if(event.key==='Enter')send()">
    <a onclick="send()">[SEND CHAT]</a> &nbsp; 
    <a onclick="sendCmd()">[EXECUTE CMD]</a>
  </div>
</div>

<div id="player-info-tab" class="tab-content">
  <div id="player-list-detailed">Loading nearby player data...</div>
</div>

<div id="map-tab" class="tab-content">
  <div class="card">
    <div style="margin-bottom: 10px;">
      Zoom: <input type="range" id="map-zoom" min="2" max="60" value="16" style="width: 200px;">
      <a href="/map" target="_blank" style="margin-left: 20px;">[OPEN FULLSCREEN MAP]</a>
    </div>
    <canvas id="map-canvas" width="600" height="600"></canvas>
    <div style="margin-top: 10px; font-size: 12px;">
      <span style="color: blue;">● Bot</span> | 
      <span style="color: red;">● Players</span> | 
      <span style="color: #ff00ff;">● Vindicators</span> | 
      <span style="color: orange;">● Mobs</span> | 
      <span style="color: #d4af37;">● Items</span>
    </div>
  </div>
</div>

<div id="analytics-tab" class="tab-content">
  <div class="card" style="height: 300px;">
    <b>Population History (24h)</b>
    <canvas id="activityChart"></canvas>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
    <div class="card">
      <b>Top Playtime</b>
      <pre id="top-players">...</pre>
    </div>
    <div class="card">
      <b>Frequent Items</b>
      <pre id="most-items">...</pre>
    </div>
  </div>
</div>

<div id="inv-tab" class="tab-content">
  <div class="card">
    <b>Bot Inventory Content</b>
    <pre id="inventory">...</pre>
  </div>
</div>

<div id="logs-tab" class="tab-content">
  <div class="card">
    <b>System Runtime Logs</b>
    <pre id="logs" style="height: 400px; overflow-y: auto;">...</pre>
  </div>
</div>

<script>
let activityChart = null;
let mapCache = {}; 
let textures = {};
let dashboardMouseX = null;
let dashboardMouseZ = null;

async function loadTextures() {
  const status = document.getElementById('loading-status');
  console.log('[PANEL] Loading textures...');
  try {
    const response = await fetch('/api/textures');
    if (!response.ok) throw new Error('Failed to fetch texture list: ' + response.status);
    const textureList = await response.json();
    console.log('[PANEL] Found ' + textureList.length + ' textures to download');
    
    const total = textureList.length;
    if (total === 0) {
      console.warn('[PANEL] Texture list is empty');
      document.getElementById('loading-overlay').style.display = 'none';
      return;
    }
    
    status.textContent = '0%';
    let loaded = 0;

    // Load in batches
    const batchSize = 20;
    for (let i = 0; i < textureList.length; i += batchSize) {
      const batch = textureList.slice(i, i + batchSize);
      await Promise.all(batch.map(async (file) => {
        const name = file.replace('.png', '');
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            textures[name] = img;
            loaded++;
            status.textContent = Math.round((loaded / total) * 100) + '%';
            resolve();
          };
          img.onerror = () => {
            loaded++;
            status.textContent = Math.round((loaded / total) * 100) + '%';
            resolve();
          };
          img.src = '/textures/block/' + file;
        });
      }));
    }

    console.log('[PANEL] Textures loaded.');
    document.getElementById('loading-overlay').style.display = 'none';
  } catch (err) {
    console.error('[PANEL] Error:', err);
    status.textContent = 'Error: ' + err.message;
    setTimeout(() => { document.getElementById('loading-overlay').style.display = 'none'; }, 3000);
  }
}

function openTab(evt, tabId) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabcontent.length; i++) { tabcontent[i].classList.remove("active"); }
  tablinks = document.getElementsByClassName("tab");
  for (i = 0; i < tablinks.length; i++) { tablinks[i].classList.remove("active"); }
  document.getElementById(tabId).classList.add("active");
  evt.currentTarget.classList.add("active");
}

const blockTextureCache = {};
function getTextureForBlock(name) {
  if (!name) return null;
  if (blockTextureCache[name]) return blockTextureCache[name];

  let originalName = name;
  name = name.toLowerCase();
  
  // Slab override
  if (name.includes('_slab')) {
    let base = name.replace('_slab', '');
    if (textures[base + '_planks']) name = base + '_planks';
    else if (textures[base]) name = base;
    else if (base === 'bamboo') name = 'bamboo_planks';
  }

  let tex = null;
  if (textures[name + '_top']) tex = textures[name + '_top'];
  else if (textures[name]) tex = textures[name];
  else if (name.includes('grass')) tex = textures['grass_block_top'];
  else if (name.includes('dirt')) tex = textures['dirt'];
  else if (name.includes('stone')) tex = textures['stone'];
  else if (name.includes('water')) tex = textures['water_still'];
  else if (name.includes('lava')) tex = textures['lava_still'];
  else if (name.includes('log')) tex = textures[name + '_top'] || textures[name];
  else if (name.includes('leaves')) tex = textures[name];
  else if (name.includes('planks')) tex = textures[name];
  
  blockTextureCache[originalName] = tex;
  return tex;
}

function adjustBrightness(col, amt) {
  let usePound = false;
  if (col[0] == "#") { col = col.slice(1); usePound = true; }
  let num = parseInt(col, 16);
  let r = (num >> 16) + amt;
  if (r > 255) r = 255; else if (r < 0) r = 0;
  let b = ((num >> 8) & 0x00FF) + amt;
  if (b > 255) b = 255; else if (b < 0) b = 0;
  let g = (num & 0x0000FF) + amt;
  if (g > 255) g = 255; else if (g < 0) g = 0;
  return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}

function drawMap(nearby, blocks, botPos) {
  const canvas = document.getElementById('map-canvas');
  const ctx = canvas.getContext('2d');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const blockSize = parseInt(document.getElementById('map-zoom').value) || 12;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (botPos) {
    const radius = 128; 

    // Draw grid
    if (blockSize > 4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -radius; x <= radius; x++) {
        const bx = centerX + (x * blockSize) - (blockSize / 2);
        if (bx < 0 || bx > canvas.width) continue;
        ctx.moveTo(bx, 0); ctx.lineTo(bx, canvas.height);
      }
      for (let z = -radius; z <= radius; z++) {
        const bz = centerY + (z * blockSize) - (blockSize / 2);
        if (bz < 0 || bz > canvas.height) continue;
        ctx.moveTo(0, bz); ctx.lineTo(canvas.width, bz);
      }
      ctx.stroke();
    }

    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const absX = botPos.x + x;
        const absZ = botPos.z + z;
        const entry = mapCache[absX + ',' + absZ];
        
        if (entry) {
          const bx = centerX + (x * blockSize) - (blockSize/2);
          const bz = centerY + (z * blockSize) - (blockSize/2);
          
          const tex = getTextureForBlock(entry.name);
          if (tex) {
            ctx.drawImage(tex, bx, bz, blockSize + 0.5, blockSize + 0.5);
          } else {
            let color = '#1a1a1a';
            const name = entry.name.toLowerCase();
            if (name.includes('grass') || name.includes('leaves')) color = '#2d4c14';
            else if (name.includes('bamboo')) color = '#ffeb3b';
            else if (name.includes('dirt') || name.includes('wood')) color = '#4d331f';
            else if (name.includes('stone') || name.includes('cobble')) color = '#333';
            else if (name.includes('water')) color = '#000066';
            else if (name.includes('lava')) color = '#662200';
            ctx.fillStyle = color;
            ctx.fillRect(bx, bz, blockSize + 0.5, blockSize + 0.5);
          }

          const nwEntry = mapCache[(absX-1) + ',' + (absZ-1)];
          if (nwEntry) {
            const diff = entry.y - nwEntry.y;
            if (diff > 0) { ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(bx, bz, blockSize+0.5, blockSize+0.5); }
            else if (diff < 0) { ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(bx, bz, blockSize+0.5, blockSize+0.5); }
          }
        }
      }
    }

    // Highlight block under mouse
    if (dashboardMouseX !== null && dashboardMouseZ !== null) {
      const bx = centerX + (dashboardMouseX * blockSize) - (blockSize / 2);
      const bz = centerY + (dashboardMouseZ * blockSize) - (blockSize / 2);
      ctx.strokeStyle = '#00bcd4';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, bz, blockSize, blockSize);
      ctx.fillStyle = 'rgba(0, 188, 212, 0.2)';
      ctx.fillRect(bx, bz, blockSize, blockSize);
    }
  }

  if (nearby) {
    nearby.forEach(e => {
      const ex = centerX + (e.x * blockSize);
      const ez = centerY + (e.z * blockSize);
      if (e.type === 'player') ctx.fillStyle = '#ff0000';
      else if (e.name === 'vindicator' || e.mobType === 'Vindicator') ctx.fillStyle = '#ff00ff';
      else if (e.type === 'mob') ctx.fillStyle = '#ff8800';
      else if (e.type === 'item') ctx.fillStyle = '#d4af37';
      else ctx.fillStyle = '#880088';
      ctx.beginPath(); ctx.arc(ex, ez, blockSize/2, 0, Math.PI * 2); ctx.fill();
      
      // Always show entity names
      ctx.fillStyle = '#fff';
      ctx.font = "10px Arial";
      ctx.fillText(e.name, ex+5, ez-5);
    });
  }

  ctx.fillStyle = '#00bcd4';
  ctx.beginPath(); ctx.arc(centerX, centerY, blockSize/1.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillText("YOU", centerX+10, centerY-10);
}

function renderPlayerInfo(nearby) {
  const container = document.getElementById('player-list-detailed');
  const players = nearby.filter(e => e.type === 'player');
  if (players.length === 0) { container.innerHTML = "No players in render distance."; return; }
  
  container.innerHTML = players.map(p => {
    const equip = (p.equipment || []).map(item => {
      if (!item) return '';
      const duraStr = item.maxDurability ? '(' + item.durability + '/' + item.maxDurability + ' dura)' : '';
      return '<div class="equipment">' +
          '<b style="color:#fff">' + (item.displayName || item.name) + '</b> ' + duraStr +
          '<br>' + (item.enchants || []).map(en => '<span class="enchant">' + en + '</span>').join('') +
        '</div>';
    }).join('');

    const effects = (p.effects || []).length > 0 
      ? '<div style="margin-top:5px; font-size:11px; color:#aaa"><b>Effects:</b> ' + p.effects.join(', ') + '</div>' 
      : '';
    
    return '<div class="card player-card">' +
        '<b style="font-size:18px; color:var(--primary)">' + p.name + '</b> ' +
        '<span style="margin-left:10px; color:#ff4444">❤ ' + Math.round(p.health) + '/20</span>' +
        effects +
        '<div style="margin-top:10px">' + equip + '</div>' +
      '</div>';
  }).join('');
}

function updateChart(activity) {
  const ctx = document.getElementById('activityChart').getContext('2d');
  const labels = activity.map(a => new Date(a.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
  const data = activity.map(a => a.player_count);
  const playerNames = activity.map(a => a.player_names ? a.player_names.replace(/,/g, ', ') : 'None');

  if (activityChart) {
    activityChart.data.labels = labels; 
    activityChart.data.datasets[0].data = data;
    activityChart.data.datasets[0].playerNames = playerNames;
    activityChart.update();
  } else {
    activityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{ 
          label: 'Players', 
          data: data, 
          playerNames: playerNames,
          borderColor: '#00bcd4', 
          tension: 0.3, 
          fill: true, 
          backgroundColor: 'rgba(0,188,212,0.1)' 
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        plugins: {
          tooltip: {
            callbacks: {
              afterBody: function(context) {
                const item = context[0];
                const names = item.dataset.playerNames[item.dataIndex];
                return 'Online: ' + names;
              }
            }
          }
        }
      }
    });
  }
}

function update(){
  fetch('/api/status').then(r=>r.json()).then(d=>{
    document.getElementById('status').textContent = d.online ? 'ONLINE' : 'OFFLINE';
    document.getElementById('bot-ping').textContent = (d.bot ? d.bot.ping : 0) + 'ms';
    document.getElementById('bot-health').textContent = (d.bot ? d.bot.health : 0) + '/20';
    
    if (d.bot) {
      const uptime = d.bot.uptime;
      const h = Math.floor(uptime / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      document.getElementById('bot-uptime').textContent = h + 'h ' + m + 'm ' + (uptime % 60) + 's';
    }

    document.getElementById('inventory').textContent = d.inventory.replace(/\\\\n/g, '\\n');
    document.getElementById('logs').textContent = d.logs.map(l=>l.time.substring(11,19)+' '+l.message).join('\\n');
    
    if (d.activity) updateChart(d.activity);
    
    // Update map cache
    if (d.blocks && d.bot && d.bot.pos) {
      d.blocks.forEach(b => {
        const absX = d.bot.pos.x + b.x;
        const absZ = d.bot.pos.z + b.z;
        mapCache[absX + ',' + absZ] = { name: b.name, y: b.y };
      });
    }
    
    if (d.nearby) { 
      drawMap(d.nearby, d.blocks, d.bot ? d.bot.pos : null); 
      renderPlayerInfo(d.nearby); 
    }
    
    if (d.topPlayers) {
      document.getElementById('top-players').textContent = d.topPlayers.map(p => p.username + ': ' + Math.floor(p.playtime/60) + 'm').join('\\n');
    }
    if (d.mostItems) {
      document.getElementById('most-items').textContent = d.mostItems.map(i => i.item_name + ': ' + i.count).join('\\n');
    }
  }).catch(e => console.error(e));
}

function send(){
  const cmd = document.getElementById('cmd').value; if(!cmd) return;
  fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:cmd,type:'msg'})});
  document.getElementById('cmd').value = ''; setTimeout(update, 200);
}
function sendCmd(){
  const cmd = document.getElementById('cmd').value; if(!cmd) return;
  fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:cmd,type:'cmd'})});
  document.getElementById('cmd').value = ''; setTimeout(update, 200);
}
function reconnect(){ fetch('/api/reconnect',{method:'POST'}); setTimeout(update, 200); }
function stop(){ fetch('/api/stop',{method:'POST'}); }

loadTextures().then(() => {
  const dashboardMapCanvas = document.getElementById('map-canvas');
  if (dashboardMapCanvas) {
    dashboardMapCanvas.onmousemove = (e) => {
      const rect = dashboardMapCanvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) * (dashboardMapCanvas.width / rect.width);
      const clickY = (e.clientY - rect.top) * (dashboardMapCanvas.height / rect.height);
      const blockSize = parseInt(document.getElementById('map-zoom').value) || 12;
      const centerX = dashboardMapCanvas.width / 2;
      const centerY = dashboardMapCanvas.height / 2;
      dashboardMouseX = Math.round((clickX - centerX) / blockSize);
      dashboardMouseZ = Math.round((clickY - centerY) / blockSize);
    };
    dashboardMapCanvas.onmouseleave = () => {
      dashboardMouseX = null;
      dashboardMouseZ = null;
    };
  }
  setInterval(update, 1000);
  update();
});
</script>
</body>
</html>`)

  } else if (path === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    const playerList = bot && bot.players ? Object.keys(bot.players).filter(p => p !== bot.username) : []
    
    // Get inventory summary
    let inventorySummary = 'Empty'
    if (bot && bot.inventory) {
      const inv = {}
      for (const item of bot.inventory.items()) {
        inv[item.name] = (inv[item.name] || 0) + item.count
      }
      const invText = Object.entries(inv).map(([name, count]) => `${name} x${count}`).join('\\n')
      inventorySummary = invText || 'Empty'
    }
    
    // Additional bot status
    const botStatus = {
      ping: bot && bot.player ? bot.player.ping : 0,
      health: bot ? bot.health : 0,
      food: bot ? bot.food : 0,
      level: bot && bot.experience ? bot.experience.level : 0,
      pos: bot && bot.entity ? { 
        x: Math.round(bot.entity.position.x), 
        y: Math.round(bot.entity.position.y), 
        z: Math.round(bot.entity.position.z) 
      } : null,
      dimension: bot && bot.game ? bot.game.dimension : 'unknown',
      uptime: Math.floor((Date.now() - startTime) / 1000)
    }
    
    // Get ALL nearby entities for map and player info
    const nearby = []
    if (bot && bot.entities && bot.entity) {
      for (const entity of Object.values(bot.entities)) {
        if (entity === bot.entity) continue
        
        // Only include entities within a reasonable distance (e.g., 128 blocks)
        const dist = entity.position.distanceTo(bot.entity.position)
        if (dist > 128) continue

        const entityData = {
          id: entity.id,
          type: entity.type,
          name: entity.username || entity.name || entity.displayName || entity.type,
          x: Math.round(entity.position.x - bot.entity.position.x),
          z: Math.round(entity.position.z - bot.entity.position.z),
          absX: Math.round(entity.position.x),
          absZ: Math.round(entity.position.z),
          y: Math.round(entity.position.y),
          kind: entity.kind,
          mobType: entity.displayName || entity.name || entity.type,
          health: entity.health,
          // Sanitized raw data to avoid circular references
          raw: {
            metadata: entity.metadata,
            attributes: entity.attributes,
            equipment: entity.equipment,
            effects: entity.effects,
            onGround: entity.onGround,
            headYaw: entity.headYaw,
            pitch: entity.pitch,
            yaw: entity.yaw
          }
        }

        // Detailed info for players
        if (entity.type === 'player') {
          entityData.health = entity.metadata[9] || 20 // Approx health from metadata
          entityData.equipment = []
          entityData.effects = []

          // Extract Effects from metadata[10]
          if (Array.isArray(entity.metadata[10])) {
            entity.metadata[10].forEach(ef => {
              if (ef && ef.type === 'entity_effect') {
                // Minecraft encodes effect ID in the data field (usually lower bits)
                const effectId = ef.data & 0xFF; 
                entityData.effects.push(EFFECT_NAMES[effectId] || `Effect ${effectId}`);
              }
            });
          }
          
          // Equipment: 0: held, 1: offhand, 2-5: boots to helmet
          for (let i = 0; i < 6; i++) {
            const item = entity.equipment[i]
            if (item) {
              const enchants = []
              let currentDamage = 0

              // Modern Component Support (1.20.5+)
              if (item.components) {
                const enchComp = item.components.find(c => c.type === 'enchantments')
                if (enchComp && enchComp.data && enchComp.data.enchantments) {
                  enchComp.data.enchantments.forEach(e => {
                    enchants.push(`${getEnchantmentName(e.id)} ${e.level}`)
                  })
                }
                const damageComp = item.components.find(c => c.type === 'damage')
                if (damageComp) currentDamage = damageComp.data
              } 
              // Fallback to legacy NBT style
              else if (item.nbt && item.nbt.value) {
                if (item.nbt.value.Enchantments) {
                  const enchList = item.nbt.value.Enchantments.value.value
                  enchList.forEach(e => {
                    const id = e.id.value.split(':').pop()
                    const lvl = e.lvl.value
                    enchants.push(`${getEnchantmentName(id)} ${lvl}`)
                  })
                }
                if (item.nbt.value.Damage) currentDamage = item.nbt.value.Damage.value
              }

              entityData.equipment.push({
                slot: i,
                name: item.name,
                displayName: item.displayName || item.name,
                durability: item.maxDurability ? (item.maxDurability - currentDamage) : null,
                maxDurability: item.maxDurability,
                enchants: enchants
              })
            }
          }
        }

        nearby.push(entityData)
      }
    }
    
    // Get nearby blocks for map (128x128 area) - full density scan
    // Radius increased to 64 for better map coverage
    const blocks = []
    if (bot && bot.entity) {
      const radius = 64
      const botPos = bot.entity.position
      
      for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
          // Find the top-most solid block around the bot's height
          let foundBlock = null
          let foundY = 0
          for (let y = 10; y >= -10; y--) {
            const b = bot.blockAt(botPos.offset(x, y, z))
            if (b && b.name !== 'air' && b.name !== 'cave_air' && b.name !== 'void_air') {
              foundBlock = b
              foundY = Math.floor(botPos.y + y)
              break
            }
          }
          
          if (foundBlock) {
            blocks.push({ x, z, y: foundY, name: foundBlock.name })
          }
        }
      }
    }
    
    // Stats caching to prevent DB overload
    const now = Date.now()
    if (!global.statsCache || (now - (global.statsCacheTime || 0) > 30000)) {
      Promise.all([
        getActivityLog(48),
        getTopPlayers(5),
        getMostItems(5)
      ]).then(([activity, topPlayers, mostItems]) => {
        global.statsCache = { activity, topPlayers, mostItems }
        global.statsCacheTime = now
        sendResponse(activity, topPlayers, mostItems)
      }).catch(err => {
        console.error('[WEB] Stats query error:', err)
        sendResponse([], [], [])
      })
    } else {
      sendResponse(global.statsCache.activity, global.statsCache.topPlayers, global.statsCache.mostItems)
    }

    function sendResponse(activity, topPlayers, mostItems) {
      res.end(JSON.stringify({ 
        players: playerList, 
        online: botOnline,
        discord: discordClient !== null,
        inventory: inventorySummary,
        logs: consoleLogs,
        bot: botStatus,
        activity: activity,
        nearby: nearby,
        blocks: blocks,
        topPlayers: topPlayers,
        mostItems: mostItems
      }))
    }
    return
  } else if (path === '/api/block-column') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    const x = parseInt(parsedUrl.searchParams.get('x'))
    const z = parseInt(parsedUrl.searchParams.get('z'))
    
    if (isNaN(x) || isNaN(z)) {
      res.end(JSON.stringify({ error: 'Invalid coordinates' }))
      return
    }

    if (!bot || !botOnline) {
      res.end(JSON.stringify({ error: 'Bot offline' }))
      return
    }

    const column = []
    const minY = bot.game.minY ?? -64
    const maxY = bot.game.maxY ?? 320
    
    try {
      const vec = require('vec3')
      for (let y = maxY; y >= minY; y--) {
        const b = bot.blockAt(new vec(x, y, z))
        if (b && b.name !== 'air' && b.name !== 'void_air' && b.name !== 'cave_air') {
          column.push({ y, name: b.name })
        }
      }
      res.end(JSON.stringify({ x, z, column }))
    } catch (e) {
      res.end(JSON.stringify({ error: 'Failed to scan column' }))
    }
    return
  } else if (path === '/api/command' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const data = JSON.parse(body)
        if (data.command && bot && botOnline) {
          // Check if it's a message or command
          if (data.type === 'cmd') {
            // Execute as owner-level command
            logToConsole(`[WEB] Executing command: ${data.command}`)
            
            const cmd = parseCommand(`juro:${data.command}`)
            if (cmd) {
              const parts = cmd.command.split(' ')
              const command = parts[0].toLowerCase()
              const args = parts.slice(1)
              
              // Execute command as 'JuroBot5000' (owner)
              const playerName = 'JuroBot5000'
              
              if (command === 'help') await helpCommand(playerName)
              else if (command === 'inv') sendInventory()
              else if (command === 'info') sendInfo()
              else if (command === 'shop') sendShop()
              else if (command === 'wordle') startWordle()
              else if (command === 'seen' && args[0]) await seenCommand(args[0])
              else if (command === 'firstseen' && args[0]) await firstSeenCommand(args[0])
              else if (command === 'playerinfo' && args[0]) await playerInfoCommand(args[0])
              else if (command === 'serverinfo') await serverInfoCommand()
              else if (command === 'rank') await rankCommand(playerName, args)
              else if (command === 'list') listCommand()
              else if (command === 'keeplist') await keeplistCommand(playerName, args)
              else if (command === 'drop') await dropCommand(playerName, args)
              else if (command === 'say') await sayCommand(playerName, args.join(' '))
              else if (command === 'spam') await spamCommand(playerName, args)
              else if (command === 'end') await endCommand(playerName)
              else if (command === 'stop') await stopCommand(playerName)
              else if (command === 'ban') await banCommand(playerName, args)
              else if (command === 'rotate') await rotateCommand(playerName, args)
              
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, message: 'Command executed' }))
            } else {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: false, message: 'Invalid command format' }))
            }
          } else {
            // Send as chat message (default)
            queueMessage(data.command)
            logToConsole(`[WEB] Sent: ${data.command}`)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true }))
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false }))
        }
      } catch (e) {
        console.error('[WEB] Command error:', e)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: e.message }))
      }
    })
  } else if (path === '/api/reconnect' && req.method === 'POST') {
    logToConsole('[WEB] Reconnect requested')
    if (bot) {
      bot.end()
    }
    reconnect()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true }))
  } else if (path === '/api/stop' && req.method === 'POST') {
    logToConsole('[WEB] Stop requested')
    sendToDiscord('[WEB] Bot stopped via web panel')
    sendToDiscordChannel('[WEB] Bot stopped via web panel')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true }))
    setTimeout(() => {
      process.exit(0)
    }, 500)
    return
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found\n')
  }
})

server.listen(CONFIG.web_port, () => {
  logToConsole(`[WEB] Control panel running at http://localhost:${CONFIG.web_port}`)
  logToConsole(`[WEB] E-reader friendly panel at http://localhost:${CONFIG.web_port}/`)
  logToConsole(`[WEB] Endpoints: /inv /collected /allcollected /players /logs /say?msg= /status /staticmap`)
})
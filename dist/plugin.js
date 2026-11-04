exports.version = 2.4
exports.apiRequired = 10
exports.description = "System power governor + maintainer: CPU frequency switching by listen/schedule mode, RAMMap working set release, process cleanup, temp file cleanup. All lists are user-editable."
exports.repo = "Hug3O/System-Power-Maintainer"

// ============================================================
// Internal constants (not exposed in UI)
// ============================================================
const RAMMAP_ARGS = '-Ew'
const RAMMAP_THRESHOLD_MB_DEFAULT = 300

exports.config = {
  // ============================================
  // === Configuration Group Selector ===
  // ============================================
  config_tab: {
    type: 'select',
    defaultValue: 'basic',
    options: {
      '1. Basic': 'basic',
      '2. Mode & Thresholds': 'mode',
      '3. Whitelist': 'whitelist',
      '4. Maintainer': 'maintainer',
      '5. Debug': 'debug'
    },
    label: 'Configuration Category',
    helperText: 'Select a category to view and edit settings.',
    frontend: true
  },

  // ============================================
  // === 1. Basic ===
  // ============================================
  enableControl: {
    showIf: x => x.config_tab === 'basic',
    type: 'boolean',
    defaultValue: true,
    label: 'Enable Power Scheduler',
    helperText: 'When disabled, no CPU frequency changes will be applied.',
    xs: 12
  },
  switchInterval: {
    showIf: x => x.config_tab === 'basic' && x.enableControl,
    type: 'number',
    defaultValue: 5,
    label: 'Mode Switch Interval (minutes)',
    helperText: 'Minimum interval between high/low power switches. Idle waits this long before downclocking; high power holds at least this long before falling back.',
    min: 1,
    max: 120,
    xs: 6,
    when: config => config.enableControl === true
  },
  processCheckInterval: {
    showIf: x => x.config_tab === 'basic' && x.enableControl,
    type: 'number',
    defaultValue: 30,
    label: 'Process Check Interval (seconds)',
    helperText: 'How often to check whether whitelist processes are running. Whitelist is configured on the Whitelist page.',
    min: 5,
    max: 300,
    xs: 6,
    when: config => config.enableControl === true
  },

  // ============================================
  // === 2. Mode & Thresholds ===
  // ============================================
  scheduleMode: {
    showIf: x => x.config_tab === 'mode',
    type: 'select',
    defaultValue: 'listen',
    label: 'Schedule Mode',
    options: {
      'Listen Mode (trigger by access/process)': 'listen',
      'Schedule Mode (switch by time window)': 'schedule'
    },
    helperText: 'Listen mode: raises frequency on frontend access or whitelist processes, lowers when idle. Schedule mode: forces high power inside the time window, low power outside (whitelist processes still override).',
    xs: 12
  },

  // --- Listen mode only ---
  listenHint: {
    showIf: x => x.config_tab === 'mode' && x.scheduleMode === 'listen',
    type: 'string',
    defaultValue: '',
    label: 'Listen Mode Notes',
    helperText: 'In listen mode, the following will raise frequency:\n1. Frontend access to synced folders (excluding IP whitelist)\n2. Whitelist process started (e.g. ffmpeg.exe)\nFrequency drops after idle exceeds the switch interval.',
    xs: 12,
    frontend: true
  },

  // --- Schedule mode only ---
  highPowerStart: {
    showIf: x => x.config_tab === 'mode' && x.scheduleMode === 'schedule',
    type: 'string',
    defaultValue: '08:00',
    label: 'High Power Start Time (HH:MM)',
    helperText: 'Schedule mode: high power starts at this time. Cross-day supported, e.g. 23:00 ~ 08:00.',
    xs: 6,
    when: config => config.scheduleMode === 'schedule'
  },
  highPowerEnd: {
    showIf: x => x.config_tab === 'mode' && x.scheduleMode === 'schedule',
    type: 'string',
    defaultValue: '23:00',
    label: 'High Power End Time (HH:MM)',
    helperText: 'Schedule mode: high power ends at this time, falls back to low power.',
    xs: 6,
    when: config => config.scheduleMode === 'schedule'
  },
  scheduleHint: {
    showIf: x => x.config_tab === 'mode' && x.scheduleMode === 'schedule',
    type: 'string',
    defaultValue: '',
    label: 'Schedule Mode Notes',
    helperText: 'In schedule mode, CPU frequency is decided only by the time window:\n- Inside window: forced high power\n- Outside window: forced low power\nWhitelist processes still override to avoid killing FFmpeg.',
    xs: 12,
    frontend: true,
    when: config => config.scheduleMode === 'schedule'
  },

  // --- Shared thresholds ---
  lowPowerMin: {
    showIf: x => x.config_tab === 'mode',
    type: 'number',
    defaultValue: 5,
    label: 'Low Power - Min CPU State (%)',
    helperText: 'Minimum processor state in low power mode. Recommended 5~10.',
    min: 1,
    max: 100,
    xs: 6
  },
  lowPowerMax: {
    showIf: x => x.config_tab === 'mode',
    type: 'number',
    defaultValue: 10,
    label: 'Low Power - Max CPU State (%)',
    helperText: 'Maximum processor state in low power mode. Too low (e.g. 5%) may cause UI lag; whitelist processes will still protect FFmpeg.',
    min: 1,
    max: 100,
    xs: 6
  },
  highPowerMin: {
    showIf: x => x.config_tab === 'mode',
    type: 'number',
    defaultValue: 60,
    label: 'High Power - Min CPU State (%)',
    helperText: 'Minimum processor state in high power mode. 60 means at least 60% performance to avoid downclocking.',
    min: 1,
    max: 100,
    xs: 6
  },
  highPowerMax: {
    showIf: x => x.config_tab === 'mode',
    type: 'number',
    defaultValue: 100,
    label: 'High Power - Max CPU State (%)',
    helperText: 'Maximum processor state in high power mode. 100 allows full turbo.',
    min: 1,
    max: 100,
    xs: 6
  },

  // ============================================
  // === 3. Whitelist ===
  // ============================================
  forceHighPerformanceProcesses: {
    showIf: x => x.config_tab === 'whitelist',
    type: 'string',
    multiline: true,
    defaultValue: 'ffmpeg.exe',
    label: 'Force High Performance Processes (one per line)',
    helperText: 'Enter one process name per line. While any of these processes are running, the plugin will not enter low power mode.\nWorks in both listen and schedule modes.\nExample:\nffmpeg.exe\nHandBrakeCLI.exe\naria2c.exe',
    xs: 12
  },
  ignoreLocalAccess: {
    showIf: x => x.config_tab === 'whitelist' && x.scheduleMode === 'listen',
    type: 'boolean',
    defaultValue: true,
    label: 'Ignore Local Access',
    helperText: 'When enabled, requests from local IPs and IP whitelist entries will NOT trigger high performance.\nLocal IPs include 127.0.0.1, ::1 and all network interfaces on this machine (e.g. 192.168.1.224).\nThis only affects listen mode.',
    xs: 12,
    when: config => config.scheduleMode === 'listen'
  },
  ipWhitelist: {
    showIf: x => x.config_tab === 'whitelist' && x.scheduleMode === 'listen' && x.ignoreLocalAccess,
    type: 'string',
    multiline: true,
    defaultValue: 'localhost\n127.0.0.1\n::1',
    label: 'IP Whitelist (one per line)',
    helperText: 'Requests from these IPs or CIDR ranges will NOT trigger high performance.\nIPv4 CIDR is supported.\nExample:\nlocalhost\n127.0.0.1\n::1\n192.168.1.100\n10.0.0.0/24',
    xs: 12,
    when: config => config.scheduleMode === 'listen' && config.ignoreLocalAccess === true
  },
  whitelistHint: {
    showIf: x => x.config_tab === 'whitelist',
    type: 'string',
    defaultValue: '',
    label: 'Whitelist Notes',
    helperText: 'Process whitelist overrides both listen and schedule modes.\nIP whitelist only affects listen mode (frontend access).\nSwitch to Listen Mode on the Mode & Thresholds page to configure IP whitelist.',
    xs: 12,
    frontend: true
  },

  // ============================================
  // === 4. Maintainer ===
  // ============================================
  maintainerHint: {
    showIf: x => x.config_tab === 'maintainer',
    type: 'string',
    defaultValue: '',
    label: 'Maintainer Notes',
    helperText: 'Cleanup tasks run in the background on their configured intervals.\nRAMMap requires RAMMap64.exe in the plugin public/ folder.\nLines starting with # are ignored in all lists.',
    xs: 12,
    frontend: true
  },
  enableRamMap: {
    showIf: x => x.config_tab === 'maintainer',
    type: 'boolean',
    defaultValue: true,
    label: 'Enable RAMMap Working Set Release',
    helperText: 'When enabled, RAMMap64.exe is called to release working sets when this process RSS exceeds the configured threshold.',
    xs: 12
  },
  ramMapIntervalMinutes: {
    showIf: x => x.config_tab === 'maintainer' && x.enableRamMap,
    type: 'number',
    defaultValue: 10,
    min: 1,
    label: 'RAMMap Check Interval (minutes)',
    helperText: 'How often to check whether RAMMap should be triggered.',
    xs: 6,
    when: config => config.enableRamMap === true
  },
  ramMapThresholdMb: {
    showIf: x => x.config_tab === 'maintainer' && x.enableRamMap,
    type: 'number',
    defaultValue: RAMMAP_THRESHOLD_MB_DEFAULT,
    min: 50,
    label: 'RAMMap RSS Threshold (MB)',
    helperText: 'When this process RSS exceeds this value, RAMMap working set release is triggered. Default ' + RAMMAP_THRESHOLD_MB_DEFAULT + 'MB.',
    xs: 6,
    when: config => config.enableRamMap === true
  },
  enableKill: {
    showIf: x => x.config_tab === 'maintainer',
    type: 'boolean',
    defaultValue: true,
    label: 'Enable Process Cleanup',
    helperText: 'Periodically kill the processes listed below.',
    xs: 12
  },
  killIntervalMinutes: {
    showIf: x => x.config_tab === 'maintainer' && x.enableKill,
    type: 'number',
    defaultValue: 60,
    min: 5,
    label: 'Process Cleanup Interval (minutes)',
    helperText: 'How often to run the process cleanup.',
    xs: 6,
    when: config => config.enableKill === true
  },
  killList: {
    showIf: x => x.config_tab === 'maintainer' && x.enableKill,
    type: 'string',
    multiline: true,
    defaultValue:
`MicrosoftEdgeUpdate.exe
OneDrive.exe
ACDSeeCommander20.exe
GoogleCrashHandler.exe
GoogleCrashHandler64.exe
GoogleUpdate.exe
AutoUpdate.exe`,
    label: 'Process Kill List (one per line)',
    helperText: 'Enter one process name per line. These processes will be forcibly killed on schedule.\nLines starting with # are ignored.',
    xs: 12,
    when: config => config.enableKill === true
  },
  enableTempClean: {
    showIf: x => x.config_tab === 'maintainer',
    type: 'boolean',
    defaultValue: true,
    label: 'Enable Temp File Cleanup',
    helperText: 'Periodically clean the temp paths and remove the directories listed below.',
    xs: 12
  },
  tempIntervalMinutes: {
    showIf: x => x.config_tab === 'maintainer' && x.enableTempClean,
    type: 'number',
    defaultValue: 360,
    min: 10,
    label: 'Temp Cleanup Interval (minutes)',
    helperText: 'How often to run the temp file cleanup.',
    xs: 6,
    when: config => config.enableTempClean === true
  },
  tempPaths: {
    showIf: x => x.config_tab === 'maintainer' && x.enableTempClean,
    type: 'string',
    multiline: true,
    defaultValue:
`%userprofile%\\AppData\\Local\\Microsoft\\Windows\\INetCache\\IE
%userprofile%\\AppData\\Local\\Microsoft\\Windows\\WebCache
%userprofile%\\AppData\\Local\\Temp
%systemdrive%\\Windows\\temp
%systemdrive%\\Windows\\SoftwareDistribution\\Download
%systemdrive%\\Windows\\SoftwareDistribution\\DataStore
%userprofile%\\AppData\\Roaming\\Tencent\\Logs
%userprofile%\\Documents\\Youku Files\\ikudisk`,
    label: 'Temp Paths to Clean (one per line)',
    helperText: 'Enter one path per line. Contents of these folders will be deleted with del /f /s /q.\nEnvironment variables like %userprofile% and %systemdrive% are supported.\nLines starting with # are ignored.',
    xs: 12,
    when: config => config.enableTempClean === true
  },
  tempDirsToRemove: {
    showIf: x => x.config_tab === 'maintainer' && x.enableTempClean,
    type: 'string',
    multiline: true,
    defaultValue:
`C:\\ProgramData\\Tencent\\QQPinyin\\users\\6780AEECE3F251553A868317CC214C47@qq.sohu.com
C:\\ProgramData\\Tencent\\QQPCMgr\\Tfsdocpro
C:\\Users\\monst\\AppData\\Roaming\\baidu\\BaiduNetdisk\\AutoUpdate\\Download
C:\\Users\\monst\\AppData\\Roaming\\youku\\upgrade`,
    label: 'Directories to Remove (one per line)',
    helperText: 'Enter one directory per line. These directories will be removed entirely with rd /s /q.\nWARNING: Only add directories that are safe to delete completely.\nLines starting with # are ignored.',
    xs: 12,
    when: config => config.enableTempClean === true
  },
  enableRecycleClean: {
    showIf: x => x.config_tab === 'maintainer' && x.enableTempClean,
    type: 'boolean',
    defaultValue: true,
    label: 'Also Empty Recycle Bin',
    helperText: 'When enabled, the recycle bin will also be emptied during temp cleanup.',
    xs: 12,
    when: config => config.enableTempClean === true
  },

  // ============================================
  // === 5. Debug ===
  // ============================================
  debug: {
    showIf: x => x.config_tab === 'debug',
    type: 'boolean',
    defaultValue: false,
    label: 'Debug Mode',
    helperText: 'When enabled, result logs are printed to the server console. Routine operations are silent.',
    xs: 12
  }
}

exports.init = api => {
  if (typeof console.log.original !== 'function') {
    console.log.original = console.log
  }
  const { exec, execSync } = require('child_process')
  const fs = require('fs')
  const path = require('path')
  const os = require('os')

  // ============================================================
  // === Windows power plan GUIDs ===
  // ============================================================
  const GUID_PROCESSOR_SETTINGS = '54533251-82be-4824-96c1-47b60b740d00'
  const GUID_MIN_STATE = '893dee8e-2bef-41e0-89c6-b55d0929964c'
  const GUID_MAX_STATE = 'bc5038f7-23e0-4960-96da-33abaf5935ec'

  // ============================================================
  // === Runtime state ===
  // ============================================================
  let currentMode = 'low'
  let switchTimer = null
  let processCheckTimer = null
  let lastSwitchTime = 0
  let lastConfigHash = ''
  let lastScheduleMode = ''
  let configWatcher = null
  let isApplying = false
  let localIpCache = new Set()

  const maintainerTimers = []

  // ============================================================
  // === Config helpers ===
  // ============================================================
  const getConfig = api.getConfig

  const getRamMapThresholdMb = () => {
    const v = Number(getConfig('ramMapThresholdMb'))
    return Number.isFinite(v) && v > 0 ? v : RAMMAP_THRESHOLD_MB_DEFAULT
  }

  const getConfigHash = () => {
    return JSON.stringify({
      enableControl: getConfig('enableControl'),
      scheduleMode: getConfig('scheduleMode'),
      lowPowerMin: getConfig('lowPowerMin'),
      lowPowerMax: getConfig('lowPowerMax'),
      highPowerMin: getConfig('highPowerMin'),
      highPowerMax: getConfig('highPowerMax'),
      switchInterval: getConfig('switchInterval'),
      forceHighPerformanceProcesses: getConfig('forceHighPerformanceProcesses'),
      processCheckInterval: getConfig('processCheckInterval'),
      highPowerStart: getConfig('highPowerStart'),
      highPowerEnd: getConfig('highPowerEnd'),
      ignoreLocalAccess: getConfig('ignoreLocalAccess'),
      ipWhitelist: getConfig('ipWhitelist'),
      enableRamMap: getConfig('enableRamMap'),
      ramMapIntervalMinutes: getConfig('ramMapIntervalMinutes'),
      ramMapThresholdMb: getConfig('ramMapThresholdMb'),
      enableKill: getConfig('enableKill'),
      killIntervalMinutes: getConfig('killIntervalMinutes'),
      killList: getConfig('killList'),
      enableTempClean: getConfig('enableTempClean'),
      tempIntervalMinutes: getConfig('tempIntervalMinutes'),
      tempPaths: getConfig('tempPaths'),
      tempDirsToRemove: getConfig('tempDirsToRemove'),
      enableRecycleClean: getConfig('enableRecycleClean'),
      debug: getConfig('debug')
    })
  }

  const getSwitchMs = () => (getConfig('switchInterval') || 5) * 60 * 1000
  const getProcessCheckMs = () => (getConfig('processCheckInterval') || 30) * 1000

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0
    const parts = timeStr.split(':')
    if (parts.length !== 2) return 0
    const h = Number(parts[0])
    const m = Number(parts[1])
    if (isNaN(h) || isNaN(m)) return 0
    return h * 60 + m
  }

  // ============================================================
  // === Logging (tied to debug flag) ===
  // ============================================================
  const log = (msg) => {
    if (getConfig('debug')) api.log(msg)
  }

  // ============================================================
  // === Multiline list parser ===
  // ============================================================
  const parseLines = (raw) => {
    if (!raw || typeof raw !== 'string') return []
    return raw
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
  }

  // ============================================================
  // === Local IP detection (silent) ===
  // ============================================================
  const refreshLocalIps = () => {
    localIpCache = new Set()
    try {
      const interfaces = os.networkInterfaces()
      for (const name of Object.keys(interfaces)) {
        for (const info of interfaces[name] || []) {
          if (info.address) {
            localIpCache.add(info.address)
            if (info.address.includes('%')) {
              localIpCache.add(info.address.split('%')[0])
            }
          }
        }
      }
    } catch (e) {}
  }

  // ============================================================
  // === IP whitelist parsing ===
  // ============================================================
  const ipToLong = (ip) => {
    const parts = ip.split('.').map(Number)
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null
    return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
  }

  const isIpInCidr = (ip, cidr) => {
    const [range, bitsStr] = cidr.split('/')
    const bits = Number(bitsStr)
    if (isNaN(bits) || bits < 0 || bits > 32) return false
    const ipLong = ipToLong(ip)
    const rangeLong = ipToLong(range)
    if (ipLong === null || rangeLong === null) return false
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
    return (ipLong & mask) === (rangeLong & mask)
  }

  const isWhitelistEntryMatch = (ip, entry) => {
    if (entry.toLowerCase() === 'localhost') {
      if (ip === '127.0.0.1' || ip === '::1') return true
      if (localIpCache.has(ip)) return true
      return false
    }
    if (entry.includes('/')) {
      return isIpInCidr(ip, entry)
    }
    return entry === ip
  }

  const isLocalOrWhitelisted = (clientIp) => {
    if (!clientIp) return false
    if (!getConfig('ignoreLocalAccess')) return false

    let ip = clientIp
    if (ip.startsWith('::ffff:')) ip = ip.substring(7)
    if (ip.includes('%')) ip = ip.split('%')[0]

    if (localIpCache.has(ip)) return true

    const whitelist = parseLines(getConfig('ipWhitelist'))
    for (const entry of whitelist) {
      if (isWhitelistEntryMatch(ip, entry)) return true
    }

    return false
  }

  const getClientIp = (ctx) => {
    if (!ctx) return ''
    if (ctx.ip) return ctx.ip
    if (ctx.request?.socket?.remoteAddress) return ctx.request.socket.remoteAddress
    if (ctx.request?.connection?.remoteAddress) return ctx.request.connection.remoteAddress
    if (ctx.socket?.remoteAddress) return ctx.socket.remoteAddress
    if (ctx.headers?.['x-forwarded-for']) {
      return ctx.headers['x-forwarded-for'].split(',')[0].trim()
    }
    return ''
  }

  // ============================================================
  // === Whitelist process check ===
  // ============================================================
  const isForcedProcessRunning = () => {
    const processList = parseLines(getConfig('forceHighPerformanceProcesses'))
      .map(p => p.toLowerCase())

    if (processList.length === 0) return false

    try {
      const output = execSync('tasklist /FO CSV /NH', {
        windowsHide: true,
        encoding: 'utf8',
        timeout: 10000
      }).toLowerCase()

      return processList.some(proc => output.includes(proc))
    } catch (e) {
      return false
    }
  }

  // ============================================================
  // === Apply CPU state (result only) ===
  // ============================================================
  const setCpuState = (minState, maxState, mode) => {
    if (isApplying) return
    isApplying = true

    const safeMin = Math.max(1, Math.min(100, Number(minState) || 5))
    const safeMax = Math.max(1, Math.min(100, Number(maxState) || 10))
    const finalMin = Math.min(safeMin, safeMax)
    const finalMax = Math.max(safeMin, safeMax)

    const cmd =
      `powercfg -setacvalueindex SCHEME_CURRENT ${GUID_PROCESSOR_SETTINGS} ${GUID_MIN_STATE} ${finalMin} && ` +
      `powercfg -setacvalueindex SCHEME_CURRENT ${GUID_PROCESSOR_SETTINGS} ${GUID_MAX_STATE} ${finalMax} && ` +
      `powercfg -setactive SCHEME_CURRENT`

    exec(cmd, { windowsHide: true }, (error) => {
      isApplying = false
      if (error) {
        log(`[SPM] Switch failed: ${error.message}`)
        return
      }
      log(`[SPM] ${mode === 'high' ? 'High performance' : 'Low power'} mode active (min ${finalMin}% / max ${finalMax}%)`)
    })
  }

  const applyLowPower = () => {
    setCpuState(getConfig('lowPowerMin'), getConfig('lowPowerMax'), 'low')
  }

  const applyHighPower = () => {
    setCpuState(getConfig('highPowerMin'), getConfig('highPowerMax'), 'high')
  }

  // ============================================================
  // === Time window check ===
  // ============================================================
  const isInHighPowerWindow = () => {
    const start = getConfig('highPowerStart') || '08:00'
    const end = getConfig('highPowerEnd') || '23:00'
    const now = new Date()
    const current = now.getHours() * 60 + now.getMinutes()
    const startMin = parseTimeToMinutes(start)
    const endMin = parseTimeToMinutes(end)

    if (endMin <= startMin) {
      return current >= startMin || current < endMin
    }
    return current >= startMin && current < endMin
  }

  // ============================================================
  // === Mode transitions ===
  // ============================================================
  const goHighPerformance = (reason) => {
    if (switchTimer) {
      clearTimeout(switchTimer)
      switchTimer = null
    }

    if (currentMode === 'high') {
      switchTimer = setTimeout(tick, getSwitchMs())
      return
    }

    currentMode = 'high'
    lastSwitchTime = Date.now()
    applyHighPower()
    log(`[SPM] High performance triggered by: ${reason || 'unknown'}`)

    switchTimer = setTimeout(tick, getSwitchMs())
  }

  const goLowPower = () => {
    if (switchTimer) {
      clearTimeout(switchTimer)
      switchTimer = null
    }

    if (currentMode === 'low') {
      switchTimer = setTimeout(tick, getSwitchMs())
      return
    }

    const elapsed = Date.now() - lastSwitchTime
    if (elapsed < getSwitchMs()) {
      switchTimer = setTimeout(tick, getSwitchMs() - elapsed)
      return
    }

    currentMode = 'low'
    lastSwitchTime = Date.now()
    applyLowPower()

    switchTimer = setTimeout(tick, getSwitchMs())
  }

  // ============================================================
  // === Unified tick ===
  // ============================================================
  const tick = () => {
    if (!getConfig('enableControl')) {
      switchTimer = setTimeout(tick, getSwitchMs())
      return
    }

    const mode = getConfig('scheduleMode') || 'listen'

    if (isForcedProcessRunning()) {
      goHighPerformance('whitelist process running')
      return
    }

    if (mode === 'schedule') {
      if (isInHighPowerWindow()) {
        goHighPerformance('schedule mode - inside high power window')
      } else {
        goLowPower()
      }
    } else {
      const elapsed = Date.now() - lastSwitchTime
      if (currentMode === 'high' && elapsed < getSwitchMs()) {
        switchTimer = setTimeout(tick, getSwitchMs() - elapsed)
      } else {
        goLowPower()
      }
    }
  }

  // ============================================================
  // === Process polling fallback ===
  // ============================================================
  const startProcessPolling = () => {
    if (processCheckTimer) clearInterval(processCheckTimer)
    processCheckTimer = setInterval(() => {
      if (!getConfig('enableControl')) return
      if (isForcedProcessRunning() && currentMode !== 'high') {
        goHighPerformance('process polling detected whitelist process')
      }
    }, getProcessCheckMs())
  }

  // ============================================================
  // === Config change watcher ===
  // ============================================================
  const reload = () => {
    refreshLocalIps()

    if (switchTimer) {
      clearTimeout(switchTimer)
      switchTimer = null
    }

    const newMode = getConfig('scheduleMode') || 'listen'
    const modeChanged = newMode !== lastScheduleMode
    lastScheduleMode = newMode

    if (modeChanged) {
      currentMode = 'low'
      lastSwitchTime = 0

      if (newMode === 'listen') {
        if (isForcedProcessRunning()) {
          currentMode = 'high'
          lastSwitchTime = Date.now()
          applyHighPower()
          log('[SPM] High performance triggered by: mode switch, whitelist process running')
        } else {
          applyLowPower()
        }
      }
    } else {
      currentMode = 'low'
      lastSwitchTime = 0
    }

    if (getConfig('enableControl')) {
      tick()
      startProcessPolling()
    } else {
      if (processCheckTimer) {
        clearInterval(processCheckTimer)
        processCheckTimer = null
      }
      setCpuState(5, 100, 'high')
    }

    restartMaintainer()
  }

  // ============================================================
  // === Maintainer: RAMMap (result only) ===
  // ============================================================
  const getRamMapPath = () => {
    const pluginDir = __dirname
    const p1 = path.join(pluginDir, 'public', 'RAMMap64.exe')
    if (fs.existsSync(p1)) return p1
    const p2 = path.join(pluginDir, 'RAMMap64.exe')
    if (fs.existsSync(p2)) return p2
    return null
  }

  const callRamMap = () => {
    const exe = getRamMapPath()
    if (!exe) return false

    const exeDir = path.dirname(exe)
    try {
      execSync(`"${exe}" ${RAMMAP_ARGS} -AcceptEula`, {
        windowsHide: true,
        cwd: exeDir
      })
      return true
    } catch (e) {
      return false
    }
  }

  const doRamMapIfNeeded = () => {
    if (!getConfig('enableRamMap')) return

    const rss = process.memoryUsage().rss / 1024 / 1024
    if (rss < getRamMapThresholdMb()) return

    const ok = callRamMap()
    const after = process.memoryUsage().rss / 1024 / 1024
    log(`[SPM] RAMMap ${ok ? 'ok' : 'failed'}: RSS ${rss.toFixed(1)}MB -> ${after.toFixed(1)}MB`)
  }

  const scheduleRamMapCheck = () => {
    if (!getConfig('enableRamMap')) return
    const ms = (getConfig('ramMapIntervalMinutes') || 5) * 60_000
    const t = setTimeout(() => {
      doRamMapIfNeeded()
      scheduleRamMapCheck()
    }, ms)
    maintainerTimers.push(t)
  }

  // ============================================================
  // === Maintainer: Process cleanup (result only) ===
  // ============================================================
  const killProcesses = () => {
    if (!getConfig('enableKill')) return

    const killList = parseLines(getConfig('killList'))
    if (killList.length === 0) return

    const t0 = Date.now()
    let okCount = 0
    let failCount = 0

    for (const name of killList) {
      try {
        execSync(`taskkill /F /IM "${name}" 2>nul`, { windowsHide: true })
        okCount++
      } catch (e) {
        failCount++
      }
    }

    log(`[SPM] Process cleanup done: ${okCount} killed, ${failCount} skipped (${Date.now() - t0}ms)`)
  }

  const scheduleKill = () => {
    if (!getConfig('enableKill')) return
    const ms = (getConfig('killIntervalMinutes') || 60) * 60_000
    const t = setTimeout(() => {
      killProcesses()
      scheduleKill()
    }, ms)
    maintainerTimers.push(t)
  }

  // ============================================================
  // === Maintainer: Temp file cleanup (result only) ===
  // ============================================================
  const cleanTemp = () => {
    if (!getConfig('enableTempClean')) return

    const t0 = Date.now()
    let cleaned = 0
    let removed = 0
    let failed = 0

    const tempPaths = parseLines(getConfig('tempPaths'))
    for (const p of tempPaths) {
      try {
        execSync(`del /f /s /q "${p}\\*.*" 2>nul`, { windowsHide: true, shell: 'cmd.exe' })
        cleaned++
      } catch (e) {
        failed++
      }
    }

    const dirsToRemove = parseLines(getConfig('tempDirsToRemove'))
    for (const d of dirsToRemove) {
      try {
        execSync(`rd /s /q "${d}" 2>nul`, { windowsHide: true, shell: 'cmd.exe' })
        removed++
      } catch (e) {
        failed++
      }
    }

    if (getConfig('enableRecycleClean')) {
      try {
        execSync('del /f /s /q %systemdrive%\\recycled\\*.* 2>nul', { windowsHide: true, shell: 'cmd.exe' })
      } catch (e) {}
    }

    log(`[SPM] Temp cleanup done: ${cleaned} paths, ${removed} dirs removed, ${failed} failed (${Date.now() - t0}ms)`)
  }

  const scheduleTemp = () => {
    if (!getConfig('enableTempClean')) return
    const ms = (getConfig('tempIntervalMinutes') || 180) * 60_000
    const t = setTimeout(() => {
      cleanTemp()
      scheduleTemp()
    }, ms)
    maintainerTimers.push(t)
  }

  // ============================================================
  // === Maintainer: Restart on config change ===
  // ============================================================
  const stopMaintainer = () => {
    for (const t of maintainerTimers) clearTimeout(t)
    maintainerTimers.length = 0
  }

  const startMaintainer = () => {
    if (getConfig('enableRamMap')) {
      doRamMapIfNeeded()
      scheduleRamMapCheck()
    }
    if (getConfig('enableKill')) {
      killProcesses()
      scheduleKill()
    }
    if (getConfig('enableTempClean')) {
      cleanTemp()
      scheduleTemp()
    }
  }

  const restartMaintainer = () => {
    stopMaintainer()
    setTimeout(() => startMaintainer(), 1000)
  }

  // ============================================================
  // === Init ===
  // ============================================================
  const init = () => {
    refreshLocalIps()
    lastConfigHash = getConfigHash()
    lastScheduleMode = getConfig('scheduleMode') || 'listen'

    if (getConfig('enableControl')) {
      setTimeout(() => {
        tick()
        startProcessPolling()
      }, 2000)
    }

    setTimeout(() => startMaintainer(), 30_000)

    configWatcher = api.setInterval(() => {
      const currentHash = getConfigHash()
      if (currentHash !== lastConfigHash) {
        lastConfigHash = currentHash
        reload()
      }
    }, 3000)
  }

  setTimeout(init, 1500)

  // ============================================================
  // === Exports ===
  // ============================================================
  return {
    middleware: (ctx) => {
      return () => {
        if (!getConfig('enableControl')) return
        if ((getConfig('scheduleMode') || 'listen') !== 'listen') return

        const clientIp = getClientIp(ctx)
        if (isLocalOrWhitelisted(clientIp)) return

        if (currentMode !== 'high') {
          goHighPerformance(`frontend access from ${clientIp}`)
        } else {
          if (switchTimer) clearTimeout(switchTimer)
          switchTimer = setTimeout(tick, getSwitchMs())
        }
      }
    },

    unload() {
      if (switchTimer) {
        clearTimeout(switchTimer)
        switchTimer = null
      }
      if (processCheckTimer) {
        clearInterval(processCheckTimer)
        processCheckTimer = null
      }
      if (configWatcher) {
        clearInterval(configWatcher)
        configWatcher = null
      }
      stopMaintainer()
      setCpuState(5, 100, 'high')
    },

    customRest: {
      async getPowerStatus() {
        return {
          enableControl: getConfig('enableControl'),
          scheduleMode: getConfig('scheduleMode') || 'listen',
          currentMode,
          lastSwitchTime: lastSwitchTime > 0 ? new Date(lastSwitchTime).toISOString() : null,
          switchIntervalMinutes: getConfig('switchInterval') || 5,
          lowPower: {
            min: getConfig('lowPowerMin'),
            max: getConfig('lowPowerMax')
          },
          highPower: {
            min: getConfig('highPowerMin'),
            max: getConfig('highPowerMax')
          },
          forceProcesses: parseLines(getConfig('forceHighPerformanceProcesses')),
          forcedProcessRunning: isForcedProcessRunning(),
          inHighPowerWindow: isInHighPowerWindow(),
          ignoreLocalAccess: getConfig('ignoreLocalAccess'),
          localIps: Array.from(localIpCache),
          ipWhitelist: parseLines(getConfig('ipWhitelist')),
          maintainer: {
            enableRamMap: getConfig('enableRamMap'),
            ramMapIntervalMinutes: getConfig('ramMapIntervalMinutes'),
            ramMapThresholdMb: getRamMapThresholdMb(),
            enableKill: getConfig('enableKill'),
            killIntervalMinutes: getConfig('killIntervalMinutes'),
            killList: parseLines(getConfig('killList')),
            enableTempClean: getConfig('enableTempClean'),
            tempIntervalMinutes: getConfig('tempIntervalMinutes'),
            tempPaths: parseLines(getConfig('tempPaths')),
            tempDirsToRemove: parseLines(getConfig('tempDirsToRemove')),
            enableRecycleClean: getConfig('enableRecycleClean')
          }
        }
      },

      async forceHighPower() {
        goHighPerformance('manual override')
        return { message: 'Switched to high performance', currentMode }
      },

      async forceLowPower() {
        goLowPower()
        return { message: 'Switched to low power', currentMode }
      }
    }
  }
}
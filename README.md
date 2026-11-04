Feature List — System Power Maintainer (v2.3)

1. CPU Frequency Scheduling (Power Management)
   
2. Feature	Description

Enable/Disable Scheduler	Master switch; no CPU frequency changes are applied when disabled

Listen Mode	Frontend access or whitelist processes trigger high performance; downclocks after idle exceeds the switch interval

Schedule Mode	Forces high/low power based on a time window, supports cross-day (e.g. 23:00 ~ 08:00)

Mode Switch Interval	Minimum interval between high/low power switches (1–120 minutes)

Process Check Interval	How often whitelist processes are polled (5–300 seconds)

Low Power Thresholds	Min/Max processor state percentages (default 5% / 10%)

High Power Thresholds	Min/Max processor state percentages (default 60% / 100%)

3. Whitelist

Feature	Description

Process Whitelist	Forces high performance while listed processes are running (e.g. ffmpeg.exe); applies to both modes

Ignore Local Access	Local IPs and whitelisted IPs do not trigger high performance (listen mode only)

IP Whitelist	Supports single IPs, localhost, and IPv4 CIDR (e.g. 10.0.0.0/24); listen mode only

4. System Maintainer

Feature	Description

RAMMap Working Set Release	Calls RAMMap64.exe to release working sets when RSS exceeds the threshold

└ Check Interval	How often to check (minutes)

└ RSS Threshold (MB)	Trigger only when RSS exceeds this value; user-adjustable (default 300MB)

Process Cleanup	Periodically force-kills processes in the kill list

└ Cleanup Interval	How often to run (minutes)

Temp File Cleanup	Periodically deletes contents of specified paths (supports environment variables)

└ Cleanup Interval	How often to run (minutes)

└ Directories to Remove	Fully removes specified directories (rd /s /q)

└ Empty Recycle Bin	Also empties the recycle bin during cleanup

5. Debug & Misc

Feature	Description

Debug Mode	Prints result logs to the server console when enabled

Grouped Config Tabs	Basic / Mode & Thresholds / Whitelist / Maintainer / Debug

Hot Config Reload	Automatically reloads scheduling and maintainer tasks on config change

Status Query API	getPowerStatus returns current mode, thresholds, whitelists, maintainer settings, etc.

Manual Override API	forceHighPower / forceLowPower to manually force high/low power

Safe Unload	Clears all timers and restores CPU state on unload

const socket = io();

// Element References
const csvTrigger = document.getElementById('csvTrigger');
const csvInput = document.getElementById('csvFile');
const proxyTrigger = document.getElementById('proxyTrigger');
const proxyInput = document.getElementById('proxyFile');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const configForm = document.getElementById('configForm');
const activityLogs = document.getElementById('activityLogs');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

let hasCsv = false;

// File Upload Handling
setupFileUpload(csvTrigger, csvInput, (file) => {
    hasCsv = true;
    updateStartButton();
    addLog(`CSV Loaded: ${file.name}`, 'info');
});

setupFileUpload(proxyTrigger, proxyInput, (file) => {
    addLog(`Proxy File Loaded: ${file.name}`, 'info');
});

function setupFileUpload(trigger, input, callback) {
    trigger.addEventListener('click', () => input.click());

    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            trigger.parentElement.classList.add('has-file');
            trigger.querySelector('.text').textContent = file.name;
            callback(file);
        }
    });
}

function updateStartButton() {
    startBtn.disabled = !hasCsv;
}

// Connection mode toggles
const vpnToggle = document.getElementById('useVPN');
const vpnOptions = document.getElementById('vpnOptions');
const mobileToggle = document.getElementById('useMobile');
const mobileOptions = document.getElementById('mobileOptions');
const multiPhoneToggle = document.getElementById('useMultiPhone');
const multiPhoneOptions = document.getElementById('multiPhoneOptions');
const webProxyToggle = document.getElementById('useWebProxy');
const webProxyOptions = document.getElementById('webProxyOptions');
const headlessToggle = document.getElementById('headless');
const threadsInput = document.getElementById('threads');

// Helper to disable all other connection modes
function disableOtherModes(except) {
    if (except !== 'vpn' && vpnToggle) {
        vpnToggle.checked = false;
        vpnOptions.style.display = 'none';
    }
    if (except !== 'mobile' && mobileToggle) {
        mobileToggle.checked = false;
        mobileOptions.style.display = 'none';
    }
    if (except !== 'mobileturbo') {
        const mobileTurboToggle = document.getElementById('useMobileTurbo');
        const mobileTurboOptions = document.getElementById('mobileTurboOptions');
        if (mobileTurboToggle) {
            mobileTurboToggle.checked = false;
            mobileTurboOptions.style.display = 'none';
        }
    }
    if (except !== 'multiphone' && multiPhoneToggle) {
        multiPhoneToggle.checked = false;
        multiPhoneOptions.style.display = 'none';
    }
    if (except !== 'webproxy' && webProxyToggle) {
        webProxyToggle.checked = false;
        webProxyOptions.style.display = 'none';
    }
}

// Web Proxy Mode Toggle Handler
if (webProxyToggle) {
    webProxyToggle.addEventListener('change', (e) => {
        webProxyOptions.style.display = e.target.checked ? 'block' : 'none';
        
        if (e.target.checked) {
            disableOtherModes('webproxy');
            headlessToggle.checked = false; // Headed mode recommended
            headlessToggle.disabled = false;
            threadsInput.value = 1;
            threadsInput.disabled = true;
            updateWebProxyTotal();
            addLog('🌐 Web Proxy TURBO Mode enabled - 3 browsers × 5 tabs = 15 parallel visits!', 'info');
        } else {
            threadsInput.disabled = false;
        }
    });
}

// Web Proxy Total Calculator
function updateWebProxyTotal() {
    const browserCount = parseInt(document.getElementById('webProxyBrowserCount')?.value || 3);
    const tabCount = parseInt(document.getElementById('webProxyTabCount')?.value || 5);
    const total = browserCount * tabCount;
    const totalSpan = document.getElementById('webProxyTotalCalc');
    if (totalSpan) {
        totalSpan.textContent = total;
    }
}

// Add listeners for browser/tab count changes
document.getElementById('webProxyBrowserCount')?.addEventListener('input', updateWebProxyTotal);
document.getElementById('webProxyTabCount')?.addEventListener('input', updateWebProxyTotal);

// Multi-Phone Mode Toggle Handler
if (multiPhoneToggle) {
    multiPhoneToggle.addEventListener('change', (e) => {
        multiPhoneOptions.style.display = e.target.checked ? 'block' : 'none';
        
        if (e.target.checked) {
            disableOtherModes('multiphone');
            headlessToggle.disabled = false;
            threadsInput.disabled = true; // Auto-set to phone count
            addLog('📱📱📱 Multi-Phone Mode enabled - using multiple phones via USB', 'info');
            
            // Scan for phones
            fetch('/api/scan-phones').then(r => r.json()).then(data => {
                if (data.devices && data.devices.length > 0) {
                    document.getElementById('multiPhoneStatus').innerHTML = 
                        `✅ Found ${data.devices.length} phone(s): ${data.devices.map(d => d.model).join(', ')}`;
                    threadsInput.value = data.devices.length;
                } else {
                    document.getElementById('multiPhoneStatus').innerHTML = 
                        '❌ No phones detected. Check USB connections.';
                }
            }).catch(() => {
                document.getElementById('multiPhoneStatus').innerHTML = '⚠️ Could not scan phones';
            });
        } else {
            threadsInput.disabled = false;
        }
    });
}

// Mobile Mode Toggle Handler (Single Phone)
if (mobileToggle) {
    mobileToggle.addEventListener('change', (e) => {
        mobileOptions.style.display = e.target.checked ? 'block' : 'none';
        
        if (e.target.checked) {
            disableOtherModes('mobile');
            threadsInput.value = 1;
            threadsInput.disabled = true;
            addLog('📱 Single Phone Mode enabled - using USB Tethering + ADB', 'info');
            
            // Check phone status
            checkPhoneStatus('mobileStatus');
        } else {
            threadsInput.disabled = false;
        }
    });
}

// Mobile TURBO Mode Toggle Handler
const mobileTurboToggle = document.getElementById('useMobileTurbo');
const mobileTurboOptions = document.getElementById('mobileTurboOptions');
if (mobileTurboToggle) {
    mobileTurboToggle.addEventListener('change', (e) => {
        mobileTurboOptions.style.display = e.target.checked ? 'block' : 'none';
        
        if (e.target.checked) {
            disableOtherModes('mobileturbo');
            headlessToggle.checked = false; // Headed mode recommended
            headlessToggle.disabled = false;
            threadsInput.value = 1;
            threadsInput.disabled = true;
            updateMobileTurboTotal();
            addLog('🚀 Mobile TURBO Mode enabled - multiple browsers via USB Tethering!', 'info');
            
            // Check phone status
            checkPhoneStatus('mobileTurboStatus');
        } else {
            threadsInput.disabled = false;
        }
    });
}

// Mobile TURBO Total Calculator
function updateMobileTurboTotal() {
    const browserCount = parseInt(document.getElementById('mobileTurboBrowserCount')?.value || 3);
    const tabCount = parseInt(document.getElementById('mobileTurboTabCount')?.value || 5);
    const total = browserCount * tabCount;
    const totalSpan = document.getElementById('mobileTurboTotalCalc');
    if (totalSpan) {
        totalSpan.textContent = total;
    }
}

// Add listeners for browser/tab count changes
document.getElementById('mobileTurboBrowserCount')?.addEventListener('input', updateMobileTurboTotal);
document.getElementById('mobileTurboTabCount')?.addEventListener('input', updateMobileTurboTotal);

// Check phone status function
function checkPhoneStatus(statusElementId) {
    const statusElement = document.getElementById(statusElementId);
    if (statusElement) {
        statusElement.textContent = 'Checking...';
        statusElement.style.color = '#a0aec0';
    }
    
    fetch('/api/phone-status').then(r => r.json()).then(data => {
        if (statusElement) {
            if (data.connected && data.deviceInfo) {
                const info = data.deviceInfo;
                statusElement.innerHTML = `✅ ${info.model} (${info.carrier}) - IP: ${info.currentIP}`;
                statusElement.style.color = '#48bb78';
            } else {
                statusElement.textContent = '❌ Not connected';
                statusElement.style.color = '#e53e3e';
            }
        }
    }).catch(() => {
        if (statusElement) {
            statusElement.textContent = '⚠️ Check failed';
            statusElement.style.color = '#ed8936';
        }
    });
}

// VPN Toggle Handler
if (vpnToggle) {
    vpnToggle.addEventListener('change', (e) => {
        vpnOptions.style.display = e.target.checked ? 'block' : 'none';
        
        if (e.target.checked) {
            disableOtherModes('vpn');
            headlessToggle.checked = false;
            headlessToggle.disabled = true;
            threadsInput.value = 1;
            threadsInput.disabled = true;
            addLog('🛡️ VPN Mode enabled - using Planet VPN extension', 'info');
        } else {
            headlessToggle.disabled = false;
            threadsInput.disabled = false;
        }
    });
}

// Start Button Click
startBtn.addEventListener('click', async () => {
    if (!hasCsv) return;

    const formData = new FormData();
    formData.append('csv', csvInput.files[0]);
    if (proxyInput.files.length > 0) {
        formData.append('proxies', proxyInput.files[0]);
    }

    startBtn.disabled = true;
    startBtn.textContent = "Uploading...";
    addLog('Uploading files...', 'system');

    try {
        // Step 1: Upload Files
        const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const uploadData = await uploadRes.json();

        if (!uploadData.success) {
            throw new Error(uploadData.error);
        }

        // Step 2: Start Job
        const useVPN = document.getElementById('useVPN')?.checked || false;
        const useMobile = document.getElementById('useMobile')?.checked || false;
        const useMobileTurbo = document.getElementById('useMobileTurbo')?.checked || false;
        const useMultiPhone = document.getElementById('useMultiPhone')?.checked || false;
        const useWebProxy = document.getElementById('useWebProxy')?.checked || false;
        const multiPhoneMode = document.getElementById('multiPhoneMode')?.value || 'roundrobin';
        
        const settings = {
            domain: document.getElementById('domain').value,
            cycles: document.getElementById('cycles').value,
            threads: document.getElementById('threads').value,
            headless: document.getElementById('headless').checked.toString(),
            useVPN: useVPN.toString(),
            useMobile: useMobile.toString(),
            useMobileTurbo: useMobileTurbo.toString(),
            useMultiPhone: useMultiPhone.toString(),
            useWebProxy: useWebProxy.toString(),
            multiPhoneParallel: (multiPhoneMode === 'parallel').toString(),
            vpnRotateEvery: document.getElementById('vpnRotateEvery')?.value || '10',
            mobileRotateEvery: document.getElementById('mobileRotateEvery')?.value || '10',
            mobileTurboRotateEvery: document.getElementById('mobileTurboRotateEvery')?.value || '10',
            mobileTurboBrowserCount: document.getElementById('mobileTurboBrowserCount')?.value || '3',
            mobileTurboTabCount: document.getElementById('mobileTurboTabCount')?.value || '5',
            multiPhoneRotateEvery: document.getElementById('multiPhoneRotateEvery')?.value || '10',
            webProxyRotateEvery: document.getElementById('webProxyRotateEvery')?.value || '10',
            webProxyBrowserCount: document.getElementById('webProxyBrowserCount')?.value || '3',
            webProxyTabCount: document.getElementById('webProxyTabCount')?.value || '5'
        };

        const startRes = await fetch('/api/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                csvPath: uploadData.csvPath,
                proxyPath: uploadData.proxyPath,
                settings: settings
            })
        });

        const startData = await startRes.json();
        if (startData.success) {
            setRunningState(true);
        }

    } catch (error) {
        console.error(error);
        addLog(`Error: ${error.message}`, 'error');
        startBtn.disabled = false;
        startBtn.textContent = "Start Traffic";
    }
});

stopBtn.addEventListener('click', async () => {
    await fetch('/api/stop', { method: 'POST' });
    setRunningState(false);
});

// Socket Events
socket.on('connect', () => {
    document.getElementById('connectionStatus').textContent = 'Connected';
    document.getElementById('connectionStatus').style.color = 'var(--success)';
});

socket.on('disconnect', () => {
    document.getElementById('connectionStatus').textContent = 'Disconnected';
    document.getElementById('connectionStatus').style.color = 'var(--danger)';
});

socket.on('status', (data) => {
    if (data.message) {
        addLog(data.message, 'system');
    }
    if (data.state === 'stopped') {
        setRunningState(false);
    }
});

socket.on('progress', (data) => {
    if (data.processed !== undefined) document.getElementById('statProcessed').textContent = data.processed;
    if (data.activeThreads !== undefined) document.getElementById('statThreads').textContent = data.activeThreads;
    if (data.workingProxies !== undefined) {
        document.getElementById('statProxies').textContent = `${data.workingProxies}/${data.totalProxies}`;
    }

    if (data.progress !== undefined) {
        progressBar.style.width = `${data.progress}%`;
        progressText.textContent = `${Math.round(data.progress)}%`;
    }

    if (data.log) {
        addLog(data.log, 'info');
    }
});

function setRunningState(isRunning) {
    if (isRunning) {
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        configForm.querySelectorAll('input, select').forEach(el => el.disabled = true);
    } else {
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        startBtn.disabled = false;
        startBtn.textContent = "Start Traffic";
        configForm.querySelectorAll('input, select').forEach(el => el.disabled = false);
    }
}

function addLog(msg, type = 'info') {
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    activityLogs.insertBefore(div, activityLogs.firstChild);

    // Keep max 50 logs
    if (activityLogs.children.length > 50) {
        activityLogs.removeChild(activityLogs.lastChild);
    }
}

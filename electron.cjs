const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let serverProcess;

function createWindow() {
  const win = new BrowserWindow({ 
    width: 1200, 
    height: 800, 
    autoHideMenuBar: true,
  });

  const attemptLoad = () => {
    win.loadURL('http://localhost:3000').catch(() => setTimeout(attemptLoad, 500));
  };
  
  setTimeout(attemptLoad, 1000);
}

app.whenReady().then(() => {
  const serverPath = path.join(__dirname, 'server.js');
  serverProcess = spawn('node', [serverPath], { 
    env: { ...process.env, NODE_ENV: 'production' } 
  });
  createWindow();
});

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { if (serverProcess) serverProcess.kill(); });

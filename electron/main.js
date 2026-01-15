const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 450, // Kích thước giống điện thoại để đẹp
    height: 800,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  // Trong quá trình dev thì load url, khi build thì load file
  // Ở đây tôi hướng dẫn cách đơn giản nhất cho dev
  win.loadURL('http://localhost:5173'); 
}

app.whenReady().then(createWindow);
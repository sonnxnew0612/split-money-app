// electron-main.js (Đã fix lỗi 412 Cache Avatar)
const { app, BrowserWindow, session } = require("electron");
const path = require("path");

// --- THÊM DÒNG NÀY: Ép Electron tắt hoàn toàn Cache HTTP khi ở chế độ DEV ---
if (!app.isPackaged) {
  app.commandLine.appendSwitch("disable-http-cache");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
    },
    autoHideMenuBar: true,
  });

  const startUrl = "http://localhost:5173";

  if (!app.isPackaged) {
    console.log("Dang chay Mode DEV -> Load URL: " + startUrl);

    // --- THÊM ĐOẠN NÀY: Xóa sạch cache tồn đọng của phiên làm việc trước ---
    session.defaultSession.clearCache().then(() => {
      console.log("Đã dọn sạch Cache của Electron!");
      win.loadURL(startUrl);
    });

    // win.webContents.openDevTools();
  } else {
    console.log("Dang chay Mode PRODUCTION -> Load File index.html");
    win.loadFile(path.join(__dirname, "dist/index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// electron-main.js (Đã sửa lỗi load nhầm file cũ)
const { app, BrowserWindow } = require("electron");
const path = require("path");

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

  // URL của Vite dev server
  const startUrl = "http://localhost:5173";

  // SỬA QUAN TRỌNG: Dùng app.isPackaged để kiểm tra môi trường
  // !app.isPackaged = True khi đang chạy npm run electron:dev
  // app.isPackaged = True khi đã đóng gói thành file .exe
  if (!app.isPackaged) {
    console.log("Dang chay Mode DEV -> Load URL: " + startUrl);
    win.loadURL(startUrl);

    // Mở DevTools để bạn dễ debug (tùy chọn, có thể comment lại nếu không thích)
    // win.webContents.openDevTools();
  } else {
    console.log("Dang chay Mode PRODUCTION -> Load File index.html");
    // Khi build ra file exe thì load file html đã đóng gói
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

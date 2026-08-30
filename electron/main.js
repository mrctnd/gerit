import fs from 'node:fs';
import path from 'node:path';
import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  Notification,
  session,
} from 'electron';

const APP_ID = 'com.gerit.desktop';
const APP_NAME = 'Gerit';
const userDataPath = process.env.GERIT_USER_DATA_PATH?.trim()
  || path.join(app.getPath('appData'), APP_NAME);

fs.mkdirSync(userDataPath, { recursive: true });
app.setPath('userData', userDataPath);

const gotSingleInstanceLock = app.requestSingleInstanceLock();
console.log(`Gerit tek uygulama kilidi: ${gotSingleInstanceLock ? 'alındı' : 'başka süreçte'}`);

let mainWindow;
let runtime;
let shuttingDown = false;
let appOrigin;

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.setName(APP_NAME);
  app.setAppUserModelId(APP_ID);

  app.on('second-instance', () => {
    showMainWindow();
  });

  app.whenReady().then(startDesktopApp).catch((error) => {
    console.error('Gerit masaüstü başlangıç hatası:', error);
    dialog.showErrorBox('Gerit başlatılamadı', error.message);
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && runtime) {
      createMainWindow(runtime.url);
    } else {
      showMainWindow();
    }
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('before-quit', (event) => {
    if (!runtime || shuttingDown) return;
    event.preventDefault();
    shuttingDown = true;
    runtime.close()
      .catch((error) => console.error('Gerit kapatılırken hata oluştu:', error.message))
      .finally(() => {
        runtime = null;
        app.quit();
      });
  });
}

async function startDesktopApp() {
  process.env.NODE_ENV = 'production';
  process.env.GERIT_DESKTOP = '1';
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '0';
  process.env.DATABASE_PATH = path.join(app.getPath('userData'), 'data', 'tasks.sqlite3');

  const { startGeritServer } = await import('../src/server-runtime.js');
  runtime = await startGeritServer({
    host: '127.0.0.1',
    port: 0,
    reminderPublisher: showDesktopNotification,
  });
  appOrigin = new URL(runtime.url).origin;

  secureSession();
  Menu.setApplicationMenu(null);
  createMainWindow(runtime.url);
}

function createMainWindow(url) {
  const icon = path.join(app.getAppPath(), 'public', 'brand', 'gerit-mark.png');
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 760,
    minHeight: 560,
    show: false,
    title: APP_NAME,
    icon,
    autoHideMenuBar: true,
    backgroundColor: '#f4f5f0',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (new URL(targetUrl).origin !== appOrigin) event.preventDefault();
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
  mainWindow.loadURL(url);
}

function secureSession() {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    let allowed = false;
    try {
      allowed = new URL(details.url).origin === appOrigin;
    } catch {
      allowed = false;
    }
    callback({ cancel: !allowed });
  });
}

async function showDesktopNotification({ title, message, route }) {
  if (!Notification.isSupported()) return false;
  const notification = new Notification({
    title,
    body: message,
    icon: path.join(app.getAppPath(), 'public', 'brand', 'gerit-mark.png'),
    actions: [{ type: 'button', text: 'Aç' }],
  });
  const openTarget = () => showMainWindow(route);
  notification.on('click', openTarget);
  notification.on('action', openTarget);
  notification.show();
  return true;
}

function showMainWindow(route) {
  if (!mainWindow) return;
  if (route && String(route).startsWith('/') && !String(route).startsWith('//')) {
    const target = new URL(String(route), appOrigin);
    if (target.origin === appOrigin) mainWindow.loadURL(target.href);
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

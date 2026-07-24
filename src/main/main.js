import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  shell,
} from "electron";
import log from "electron-log";
import unhandled from "electron-unhandled";
import windowStateKeeper from "electron-window-state";
import * as fs from "fs-extra";
import { debounce } from "lodash-es";
import * as path from "path";
import config from "./config";
import * as excel from "./excel.js";
import extractors from "./extractors";
import i18n from "./i18n.js";
import * as update from "./update.js";
import { maskAuthkey, userDataPath } from "./utils.js";

let win = null;

function createWindow() {
  const windowState = windowStateKeeper({
    defaultWidth: 1000,
    defaultHeight: 550,
  });

  const saveState = debounce(windowState.saveState, 500);

  const win = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload/index.js"),
    },
  });

  win.on("resize", () => saveState(win));
  win.on("move", () => saveState(win));
  win.setMenuBarVisibility(false);

  if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    // win.webContents.openDevTools({ mode: "undocked", activate: true });
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  return win;
}

// Initialize the electron-log bridge
log.initialize();
log.addLevel("vue", 5);

// Global Runtime Error Interceptor
unhandled({
  showDialog: false,
  logger: (error) => {
    log.error(maskAuthkey(error.stack || error));
  },
});

// Single Instance handling setup
if (app.requestSingleInstanceLock()) {
  // App initialization engine loop
  app.whenReady().then(async () => {
    log.debug("Loading Application backend...");

    fs.mkdirSync(userDataPath, { recursive: true });

    // Create windows
    win = createWindow();

    // Initialize configurations
    await config.initialize();

    // Load I18N
    i18n.load(config.lang);
  });

  /* Setup ipcMain */
  ipcMain.on("LOG", (event, ...data) => {
    log.vue(...data);
  });

  ipcMain.handle("RELAUNCH", () => {
    app.relaunch();
    app.exit(0);
  });

  ipcMain.handle("CONFIG_DATA", () => {
    return config.data;
  });

  ipcMain.handle("I18N_DATA", () => {
    return i18n.data;
  });

  ipcMain.handle("GAME_IDS", () => {
    return extractors.gameIds;
  });

  ipcMain.handle("I18N_LOCALE_NAMES", () => {
    return i18n.localeNames;
  });

  ipcMain.handle("OPEN_EXTERNAL", async (event, url) => {
    // Ensure only web links are opened
    if (url.startsWith("https://") || url.startsWith("http://")) {
      await shell.openExternal(url);
    }
  });

  ipcMain.handle("SELECT_GAME_PATH", async (event) => {
    const filePaths = dialog.showOpenDialogSync({
      title: i18n.log.selectGamePath,
      properties: ["openDirectory"],
    });

    if (filePaths && filePaths.length > 0) {
      return { success: true, value: filePaths[0] };
    }
    return { success: false, value: null };
  });

  ipcMain.handle("SAVE_CONFIG", async (event, newConfig) => {
    try {
      // Update & save the config
      config.update(newConfig);
      await config.save();
      // Reload i18n
      i18n.load(config.lang);
    } catch (err) {
      return { success: false, value: err.message };
    }
    return { success: true, value: null };
  });

  ipcMain.handle("CHECK_FOR_UPDATES", async () => {
    return await update.checkForUpdates();
  });

  /* Game specificed */
  ipcMain.handle("UIDS", () => {
    return extractors.UIDs();
  });

  ipcMain.handle("REMOVE_UID", () => {
    return extractors.removeUID();
  });

  ipcMain.handle("READ_DATA", async (event) => {
    return extractors.data();
  });

  ipcMain.handle("IMPORT_UIGF", async (event, version) => {
    try {
      const filePaths = dialog.showOpenDialogSync({
        defaultPath: app.getPath("downloads"),
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (filePaths && filePaths.length) {
        const filePath = filePaths[0];
        const data = await fs.readFile(filePath, "utf8");

        await extractors.importUIGF(version, JSON.parse(data));
        return { success: true, value: null };
      }
      return { success: false, value: null };
    } catch (error) {
      log.error(error);
      return { success: false, value: error.message };
    }
  });

  ipcMain.handle("EXPORT_UIGF", async (event, version) => {
    const filePath = dialog.showSaveDialogSync({
      defaultPath: path.join(app.getPath("downloads")),
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!filePath) {
      return { success: false, value: null };
    }

    try {
      const result = await extractors.exportUIGF();

      await fs.ensureFile(filePath);
      await fs.writeFile(filePath, JSON.stringify(result, null, "\t"));
      return { success: true, value: null };
    } catch (err) {
      log.error(err);
      return { success: false, value: err.message };
    }
  });

  ipcMain.handle("FETCH_DATA", async (event, url) => {
    try {
      const gen = extractors.fetchData(url);
      let result = await gen.next();

      while (!result.done) {
        const message = result.value;

        log.debug("Hint:", message.message);
        event.sender.send("UPDATE_HINT", message.message);
        result = await gen.next();
      }
      await config.save();
      return { success: true, value: null };
    } catch (err) {
      log.error(err);
      return { success: false, value: err.message };
    }
  });

  ipcMain.handle("COPY_URL", async (event) => {
    try {
      const url = await extractors.getUrl();
      clipboard.writeText(url);
      return { success: true, value: null };
    } catch (err) {
      return { success: false, value: err.message };
    }
  });

  ipcMain.handle("SAVE_EXCEL", async (event) => {
    const data = extractors.excel();
    try {
      excel.save(data.sheets, data.filename);
    } catch (error) {
      return { success: false, value: error.message };
    }
    return { success: true, value: null };
  });

  /* Setup app */
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
      log.debug("Focused minimized window.");
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on("will-quit", (e) => {});

  app.on("quit", () => {});
} else {
  app.quit();
}

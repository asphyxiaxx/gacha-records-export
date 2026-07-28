import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  config: () => ipcRenderer.invoke("CONFIG_DATA"),
  i18n: () => ipcRenderer.invoke("I18N_DATA"),
  gameIds: () => ipcRenderer.invoke("GAME_IDS"),
  localeNames: () => ipcRenderer.invoke("I18N_LOCALE_NAMES"),
  gameUIDs: (type) => ipcRenderer.invoke("GAME_UIDS", type),

  /** */
  log: (...data) => ipcRenderer.send("LOG", ...data),
  checkForUpdates: () => ipcRenderer.invoke("CHECK_FOR_UPDATES"),
  relaunch: () => ipcRenderer.invoke("RELAUNCH"),
  saveConfig: (config) => ipcRenderer.invoke("SAVE_CONFIG", config),
  openExternal: (url) => ipcRenderer.invoke("OPEN_EXTERNAL", url),
  selectGamePath: () => ipcRenderer.invoke("SELECT_GAME_PATH"),
  importData: (type) => ipcRenderer.invoke("IMPORT_DATA", type),
  exportData: (type, data) => ipcRenderer.invoke("EXPORT_DATA", type, data),

  /* Game specificed */
  UIDs: () => ipcRenderer.invoke("UIDS"),
  removeUID: () => ipcRenderer.invoke("REMOVE_UID"),
  readData: () => ipcRenderer.invoke("READ_DATA"),
  fetchData: (url) => ipcRenderer.invoke("FETCH_DATA", url),
  copyUrl: () => ipcRenderer.invoke("COPY_URL"),
  saveExcel: () => ipcRenderer.invoke("SAVE_EXCEL"),

  /** */
  onReceiveHint: (callback) => {
    ipcRenderer.on("UPDATE_HINT", (event, ...args) => callback(...args));
  },
});

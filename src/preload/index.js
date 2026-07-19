import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  /** */
  log: (...data) => ipcRenderer.send("LOG", ...data),
  checkForUpdates: () => ipcRenderer.invoke("CHECK_FOR_UPDATES"),
  relaunch: () => ipcRenderer.invoke("RELAUNCH"),
  config: () => ipcRenderer.invoke("CONFIG_DATA"),
  i18n: () => ipcRenderer.invoke("I18N_DATA"),
  gameIds: () => ipcRenderer.invoke("GAME_IDS"),
  localeNames: () => ipcRenderer.invoke("I18N_LOCALE_NAMES"),
  saveConfig: (config) => ipcRenderer.invoke("SAVE_CONFIG", config),
  openExternal: (url) => ipcRenderer.invoke("OPEN_EXTERNAL", url),
  selectGamePath: () => ipcRenderer.invoke("SELECT_GAME_PATH"),

  /* Game specificed */
  UIDs: () => ipcRenderer.invoke("UIDS"),
  removeUID: () => ipcRenderer.invoke("REMOVE_UID"),
  readData: () => ipcRenderer.invoke("READ_DATA"),
  importUIGF: () => ipcRenderer.invoke("IMPORT_UIGF"),
  exportUIGF: () => ipcRenderer.invoke("EXPORT_UIGF"),
  fetchData: (url) => ipcRenderer.invoke("FETCH_DATA", url),
  copyUrl: () => ipcRenderer.invoke("COPY_URL"),
  saveExcel: () => ipcRenderer.invoke("SAVE_EXCEL"),

  /** */
  onReceiveHint: (callback) => {
    ipcRenderer.on("UPDATE_HINT", (event, ...args) => callback(...args));
  },
});

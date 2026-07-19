import log from "electron-log";
import i18n from "./i18n.js";
import { readJSON, saveJSON } from "./utils.js";
import extractors from "./extractors";
import Ajv2020 from "ajv/dist/2020.js";

const FILENAME = "config.json";

const validateConfigJson = new Ajv2020({ strict: false }).compile({
  type: "object",
  properties: {
    currentGameId: { type: "string" },
    lang: { type: "string" },
    games: {
      type: "object",
      patternProperties: { ".*": { type: "object" } },
    },
  },
  required: [],
});

class ConfigManager {
  lang = i18n.currentLocale;
  currentGameId = "genshin";

  get data() {
    return {
      lang: this.lang,
      currentGameId: this.currentGameId,
      games: extractors.exportConfigs(),
    };
  }

  update(payload) {
    if (payload && validateConfigJson(payload)) {
      const { games, ...config } = payload;
      this.lang = config.lang;
      this.currentGameId = config.currentGameId;
      extractors.importConfigs(games);
    }
  }

  async initialize() {
    log.debug(`Loading configs from ${FILENAME}...`);

    try {
      const payload = await readJSON(FILENAME);
      this.update(payload);
      log.debug("Configs initialized");
    } catch (e) {
      log.warn(`Could not load ${FILENAME}, initializing with defaults.`);
    }
  }

  async save() {
    log.debug(`Saving configs to ${FILENAME}...`);
    const data = this.data
    await saveJSON(FILENAME, data);
  }
}

const config = new ConfigManager();

export default config;

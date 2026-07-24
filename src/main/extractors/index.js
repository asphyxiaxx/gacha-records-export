import Ajv2020 from "ajv/dist/2020.js";
import { name as appName, version as appVersion } from "../../../package.json";
import UIGF41Schema from "../../uigf_schema/uigf4_1.json";
import config from "../config";

import genshinExtr from "./genshin.js";
import starrailExtr from "./starrail.js";
import wuwaExtr from "./wuwa.js";

const validateUIGF41 = new Ajv2020({ strict: false }).compile(UIGF41Schema);

class ExtractorsManager {
  #games = {
    [genshinExtr.id]: genshinExtr,
    [starrailExtr.id]: starrailExtr,
    [wuwaExtr.id]: wuwaExtr,
  };
  #uigfs = {
    [genshinExtr.UIGFKey]: genshinExtr,
    [starrailExtr.UIGFKey]: starrailExtr,
  };

  get gameIds() {
    return Object.keys(this.#games);
  }

  importConfigs(configs) {
    if (configs) {
      for (const [gameId, game] of Object.entries(this.#games)) {
        if (Object.hasOwn(configs, gameId)) {
          game.importConfig(configs[gameId]);
        }
      }
    }
  }

  exportConfigs() {
    const configs = {};
    for (const [gameId, game] of Object.entries(this.#games)) {
      configs[gameId] = game.exportConfig();
    }
    return configs;
  }

  UIDs() {
    const extr = this.#getExtractor();
    return extr.UIDs();
  }

  excel() {
    const extr = this.#getExtractor();
    return extr.excel();
  }

  data() {
    const extr = this.#getExtractor();
    return extr.data();
  }

  removeUID() {
    const extr = this.#getExtractor();
    return extr.removeUID();
  }

  async getUrl() {
    const extr = this.#getExtractor();
    return await extr.getUrl();
  }

  async *fetchData(url = null) {
    const extr = this.#getExtractor();
    return yield* extr.fetchData(url);
  }

  async importUIGF(version, data) {
    if (!validateUIGF41(data)) {
      throw new Error("Invalid UIGF v4.1 data file");
    }

    for (const [key, extr] of Object.entries(this.#uigfs)) {
      if (Object.hasOwn(data, key)) {
        await extr.importUIGF41(data[key]);
      }
    }
  }

  async exportUIGF(version) {
    const result = {
      info: {
        export_timestamp: Math.round(Date.now() / 1000),
        export_app: `${appName}`,
        export_app_version: `v${appVersion}`,
        version: "v4.1",
      },
    };

    for (const extr of Object.values(this.#uigfs)) {
      result[extr.UIGFKey] = await extr.exportUIGF41();
    }
    return result;
  }

  #getExtractor() {
    const gameId = config.currentGameId;
    const extr = this.#games[gameId];
    if (!extr) {
      throw new Error(`Unknown game id '${gameId}'`);
    }
    return extr;
  }
}

const extractors = new ExtractorsManager();

export default extractors;

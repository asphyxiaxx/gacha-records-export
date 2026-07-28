import Ajv2020 from "ajv/dist/2020.js";
import { name as appName, version as appVersion } from "../../../package.json";
import UIGF41Schema from "../../uigf_schema/uigf4_1.json";
import config from "../config";

import genshinExtr from "./genshin.js";
import starrailExtr from "./starrail.js";
import zzzExtr from "./zzz.js";
import wuwaExtr from "./wuwa.js";

function mapToJSONType(type) {
  switch (type.toUpperCase()) {
    case "TEXT":
    case "VARCHAR":
    case "CHAR":
      return "string";
    case "INTEGER":
    case "BIGINT":
      return "integer";
    case "REAL":
    case "FLOAT":
    case "DOUBLE":
    case "NUMBER":
      return "number";
    case "BOOLEAN":
      return "boolean";
    default:
      return "string";
  }
}

function createAjvSchema(tableSchema) {
  if (!tableSchema) throw new Error();

  const schema = {
    type: "object",
    properties: {},
    additionalProperties: false,
    required: [],
  };
  const properties = schema.properties;
  const required = schema.required;

  for (const [key, dataType] of Object.entries(tableSchema)) {
    properties[key] = { type: mapToJSONType(dataType) };
    required.push(key);
  }
  return schema;
}

class ExtractorsManager {
  #games = [genshinExtr, starrailExtr, zzzExtr, wuwaExtr];
  #validateNative = undefined;
  #validateUIGF41 = new Ajv2020({ strict: false }).compile(UIGF41Schema);

  constructor() {
    const schema = {
      type: "object",
      properties: {},
      additionalProperties: false,
    };
    const properties = schema.properties;

    for (const game of this.#games) {
      properties[game.id] = {
        type: "array",
        items: createAjvSchema(game.tableSchema),
      };
    }
    this.#validateNative = new Ajv2020({ strict: false }).compile(schema);
  }

  get gameIds() {
    return this.#games.map((extr) => extr.id);
  }

  importConfigs(configs) {
    if (configs) {
      for (const game of this.#games) {
        if (Object.hasOwn(configs, game.id)) {
          game.importConfig(configs[game.id]);
        }
      }
    }
  }

  exportConfigs() {
    const configs = {};
    for (const game of this.#games) {
      configs[game.id] = game.exportConfig();
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

  gameUIDs(type) {
    const result = {};
    let key;

    if (type === "UIGFv4.1") {
      key = "UIGFKey";
    } else if (type === "Native") {
      key = "id";
    } else {
      throw new Error(`Invalid type: ${type}`);
    }

    for (const extr of this.#games) {
      if (extr[key]) {
        result[extr.id] = extr.UIDs();
      }
    }
    return result;
  }

  async importData(type, data) {
    if (type === "UIGFv4.1") {
      if (!this.#validateUIGF41(data)) {
        throw new Error("Invalid UIGFv4.1 data file");
      }
      for (const extr of this.#games) {
        if (extr.UIGFKey && Object.hasOwn(data, extr.UIGFKey)) {
          await extr.importUIGF41(data[extr.UIGFKey]);
        }
      }
    } else if (type === "Native") {
      if (!this.#validateNative(data)) {
        throw new Error("Invalid Native data file");
      }
      for (const extr of this.#games) {
        if (Object.hasOwn(data, extr.id)) {
          extr.importNative(data[extr.id]);
        }
      }
    } else {
      throw new Error(`Invalid type: ${type}`);
    }
  }

  async exportData(type, gameUIDs) {
    let results;

    if (type === "UIGFv4.1") {
      results = {
        info: {
          export_timestamp: Math.round(Date.now() / 1000),
          export_app: `${appName}`,
          export_app_version: `v${appVersion}`,
          version: "v4.1",
        },
      };
      for (const extr of this.#games) {
        if (extr.UIGFKey && Object.hasOwn(gameUIDs, extr.id)) {
          results[extr.UIGFKey] = await extr.exportUIGF41(gameUIDs[extr.id]);
        }
      }
    } else if (type === "Native") {
      results = {};
      for (const extr of this.#games) {
        if (Object.hasOwn(gameUIDs, extr.id)) {
          results[extr.id] = await extr.exportNative(gameUIDs[extr.id]);
        }
      }
    } else {
      throw new Error(`Invalid type: ${type}`);
    }
    return results;
  }

  #getExtractor() {
    const gameId = config.currentGameId;
    const extr = this.#games.find((game) => game.id === gameId);
    if (!extr) {
      throw new Error(`Unknown game id '${gameId}'`);
    }
    return extr;
  }
}

const extractors = new ExtractorsManager();

export default extractors;

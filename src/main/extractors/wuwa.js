import { dialog } from "electron";
import log from "electron-log";
import * as fs from "fs-extra";
import * as path from "path";
import { URL, URLSearchParams } from "url";
import i18n from "../i18n.js";
import { parseText, sleep } from "../utils.js";
import BaseExtractor from "./base.js";
import { SentinelMessage } from "./message.js";

const API_CN = "https://gmserver-api.aki-game2.com";
const API_SEA = "https://gmserver-api.aki-game2.net";

const GACHA_TYPES = ["1", "2", "3", "4", "5", "6", "7"];

const WEAPON_TYPE_NAMES = new Set([
  // English
  "Weapon",
  "weapon",
  // Chinese (Simplified & Traditional) & Japanese
  "武器",
  // Korean
  "무기",
  // Spanish
  "Arma",
  "arma",
  // French
  "Arme",
  "arme",
  // German
  "Waffe",
  "waffe",
  // Russian
  "Оружие",
  "оружие",
  // Thai
  "อาวุธ",
  // Vietnamese
  "Vũ Khí",
  "Vũ khí",
  "vũ khí",
  // Indonesian / Malay
  "Senjata",
  "senjata",
]);

const RESONATOR_TYPE_NAMES = new Set([
  // English, German, Indonesian, Vietnamese (In-game)
  "Resonator",
  "resonator",
  // Chinese (Simplified)
  "共鸣者",
  // Chinese (Traditional) & Japanese
  "共鳴者",
  // Korean
  "공명자",
  // Spanish
  "Resonador",
  "resonador",
  // French
  "Résonateur",
  "résonateur",
  // Russian
  "Резонатор",
  "резонатор",
  // Thai
  "เรโซเนเตอร์",
  // Vietnamese (Alternative translation)
  "Nhà Cộng Hưởng",
  "Nhà cộng hưởng",
]);

function getApi(url) {
  const host = url.host;
  if (host.includes("aki-gm-resources.aki-game.com")) {
    return API_CN;
  }
  return API_SEA;
}

function getApiLang(lang) {
  const lookup = {
    "en-us": "en",
    "zh-cn": "zh-cn",
  };
  return lookup[lang] ?? lookup["en-us"];
}

function decryptWuwaLog(buffer) {
  // Check for 3-byte header [0x00, 0x54, 0x50] ('\x00TP')
  let offset = 0;
  if (
    buffer.length >= 3 &&
    buffer[0] === 0x00 &&
    buffer[1] === 0x54 &&
    buffer[2] === 0x50
  ) {
    offset = 3;
  }

  const body = buffer.subarray(offset);
  const decrypted = new Uint8Array(body.length);

  // XOR each byte
  // Odd -> 0xA5, Even -> 0xEF
  for (let i = 0; i < body.length; i++) {
    const byte = body[i];
    const key = byte % 2 !== 0 ? 0xa5 : 0xef;
    decrypted[i] = byte ^ key;
  }

  return decrypted;
}

function parseResourceType(value) {
  if (WEAPON_TYPE_NAMES.has(value)) {
    return "weapon";
  } else if (RESONATOR_TYPE_NAMES.has(value)) {
    return "resonator";
  }
  return "unknown";
}

class WutheringWavesExtractor extends BaseExtractor {
  id = "wuwa";

  /** SQL */
  tableSchema = {
    uid: "TEXT",
    type: "TEXT",
    lang: "TEXT",
    name: "TEXT",
    count: "INTEGER",
    resourceType: "TEXT",
    resourceTypeNorm: "TEXT",
    qualityLevel: "INTEGER",
    timestamp: "INTEGER",
    fetchTimestamp: "INTEGER",
  };

  /** Configurations */
  #gamePath = null;

  importConfig(config) {
    super.importConfig(config);
    this.#gamePath = config.gamePath;
  }

  exportConfig() {
    return {
      ...super.exportConfig(),
      gamePath: this.#gamePath,
    };
  }

  excel() {
    const uid = this.currentUID;
    if (!uid) return null;

    const typeNames = i18n.games.wuwa.types;
    const excel = i18n.games.wuwa.excel;
    const sheets = [];
    const columns = [
      {
        key: "time",
        width: 32,
        header: excel.header.time,
        style: { numFmt: "[$-x-sysdate]dddd, mmmm dd, yyyy" },
      },
      { key: "name", width: 24, header: excel.header.name },
      { key: "type", width: 8, header: excel.header.type },
      { key: "rank", width: 8, header: excel.header.rank },
      { key: "total", width: 8, header: excel.header.total },
      { key: "pity", width: 8, header: excel.header.pity },
      { key: "remark", width: 8, header: excel.header.remark },
    ];

    GACHA_TYPES.forEach((type) => {
      const name = typeNames[type] ?? type;
      const rows = [];
      const rowFormats = [];
      const items = this._data({ uid, type });

      if (items && items.length) {
        let lastRank5 = 0;

        items.forEach((item, index) => {
          const remark = "";
          rows.push([
            item.timestamp / 86400000 + 25569,
            item.name,
            item.resourceType,
            item.qualityLevel,
            index,
            index - lastRank5,
            remark,
          ]);
          if (item.qualityLevel === 5) {
            rowFormats.push({ color: "ffbd6932", bold: true });
            lastRank5 = index;
          } else if (item.qualityLevel === 4) {
            rowFormats.push({ color: "ffa256e1", bold: true });
          } else {
            rowFormats.push({ color: "ff8e8e8e", bold: false });
          }
        });
      }
      sheets.push({ name, columns, rows, rowFormats });
    });

    return { uid: uid, sheets: sheets, filename: excel.filePrefix };
  }

  data() {
    const uid = this.currentUID;
    if (!uid) return null;

    const orderKey = [
      "resonator5",
      "weapon5",
      "resonator4",
      "weapon4",
      "weapon3",
    ];
    const orderStat = ["star5", "star4", "star3"];
    const summary = [];
    const fetchTimestamps = [];

    GACHA_TYPES.forEach((type) => {
      const items = this._data({ uid, type });
      if (!items || items.length === 0) return;

      fetchTimestamps.push(...items.map((item) => item.fetchTimestamp));

      // Calculate dates
      const timestamps = items.map((item) => item.timestamp);
      const startDate = Math.min(...timestamps);
      const endDate = Math.max(...timestamps);

      // Calculate Rarity Counts & Pull Statistics (Pity Tracking)
      const counts = {}; // Rarity Counts { key: { color, selected, value } }
      const stats = {}; // Rank Counts { key: { value } }
      const history = []; // 5 stars history

      let end = 0;
      let totalRank5 = 0;
      let lastRank5 = -1;
      let pullsRank5 = 0;

      items.forEach((item, index) => {
        const resourceType = item.resourceTypeNorm;
        const qualityLevel = item.qualityLevel;
        let keyCount;
        let keyStat;
        let colorCount;
        let colorStat;

        switch (qualityLevel) {
          case 3:
            colorCount = "#73c0de";
            colorStat = "#73c0de";
            break;

          case 4:
            colorCount = resourceType === "resonator" ? "#5470c6" : "#91cc75";
            colorStat = "#a517bb";
            break;

          case 5:
            colorCount = resourceType === "resonator" ? "#fac858" : "#ee6666";
            colorStat = "#fac858";

            const pulls = end - lastRank5 + 1;
            totalRank5++;
            pullsRank5 += pulls;
            lastRank5 = index;
            history.push({ name: item.name, value: pulls, time: item.time });
            break;

          default:
            break;
        }

        end = index;
        keyCount = `${resourceType}${qualityLevel}`;
        keyStat = `star${qualityLevel}`;

        counts[keyCount] ??= {
          name: keyCount,
          color: colorCount,
          selected: true,
          value: 0,
        };
        counts[keyCount].value++;

        stats[keyStat] ??= { name: keyStat, color: colorStat, value: 0 };
        stats[keyStat].value++;
      });

      summary.push({
        type: type,
        // For chart
        counts: orderKey
          .filter((key) => counts[key])
          .map((key) => {
            const count = counts[key];
            if (key === "weapon3" && history.length > 0) {
              count.selected = false;
            }
            return count;
          }),
        // For detail
        startDate: startDate,
        endDate: endDate,
        history: history,
        average: parseInt((pullsRank5 / totalRank5) * 100) / 100,
        last: end - lastRank5,
        total: end + 1,
        stats: orderStat.filter((key) => stats[key]).map((key) => stats[key]),
      });
    });

    return {
      uid: uid,
      time: Math.max(...fetchTimestamps),
      summary: summary,
    };
  }

  removeUID() {
    if (this.currentUID) {
      this._deleteLog({ uid: this.currentUID });
      this.currentUID = "";
    }
  }

  async getUrl() {
    const text = i18n.games.wuwa.log;

    if (!this.#gamePath && !this.#selectGamePath()) {
      throw new Error(text.file.notFound);
    }

    const filepath = path.join(
      this.#gamePath,
      "Client",
      "Saved",
      "Logs",
      "Client.log",
    );

    let buffer;
    try {
      buffer = await fs.readFile(filepath);
    } catch (e) {
      log.warn(`Failed to read log file: ${e}`);
      throw new Error(text.file.notFound);
    }

    //
    const decryptedBuffer = decryptWuwaLog(buffer);
    const data = new TextDecoder().decode(decryptedBuffer);

    //
    const pattern =
      /https:\/\/aki-gm-resources[a-zA-Z0-9-]*\.aki-game\.(net|com)\/aki\/gacha\/index\.html#\/record\?[^\s"']+/g;
    const m = data.match(pattern);

    if (m) {
      return m[m.length - 1];
    }
    throw new Error(text.url.notFound);
  }

  async *fetchData(url = null) {
    const text = i18n.games.wuwa.log;
    const typeNames = i18n.games.wuwa.types;
    const extractedUrl = new URL(url ?? (await this.getUrl()));
    const params = new URLSearchParams(
      extractedUrl.hash.slice(extractedUrl.hash.indexOf("?") + 1),
    );

    if (
      !(
        params.get("svr_id") &&
        params.get("player_id") &&
        params.get("lang") &&
        params.get("record_id") &&
        params.get("resources_id")
      )
    ) {
      throw new Error(text.url.lackAuth);
    }

    // Start
    const uid = params.get("player_id");
    const fetchTimestamp = Date.now();
    const api = getApi(extractedUrl);
    const finalUrl = new URL("/gacha/record/query", api);
    const apiLang = getApiLang(i18n.currentLocale);

    const payload = {
      playerId: uid,
      cardPoolId: params.get("resources_id"),
      cardPoolType: 0,
      serverId: params.get("svr_id"),
      languageCode: apiLang,
      recordId: params.get("record_id"),
    };

    for (const type of GACHA_TYPES) {
      payload["cardPoolType"] = parseInt(type);

      const typeName = typeNames[type] ?? type;
      const list = yield* this.#fetchPage(typeName, finalUrl, payload);

      const items = list.reverse().map((item) => {
        const timestamp = new Date(item.time).getTime();
        return {
          uid: uid,
          type: type,
          lang: apiLang,
          name: item.name,
          count: item.count,
          resourceType: item.resourceType,
          resourceTypeNorm: parseResourceType(item.resourceType),
          qualityLevel: item.qualityLevel,
          timestamp: timestamp,
          fetchTimestamp: fetchTimestamp,
        };
      });

      this.#save(uid, type, items);
      await sleep(1);
    }
    this.currentUID = uid;
  }

  /** Internal */

  #selectGamePath() {
    const filePaths = dialog.showOpenDialogSync({
      title: i18n.log.selectGamePath,
      properties: ["openDirectory"],
    });

    if (filePaths && filePaths.length > 0) {
      this.#gamePath = filePaths[0];
      return true;
    }
    return false;
  }

  #save(uid, type, items) {
    if (items && items.length > 0) {
      const groups = { uid, type };
      const deletes = { timestamp: items[0].timestamp };
      this._saveLog(groups, deletes, items);
    }
  }

  async *#fetchPage(name, url, payload) {
    const text = i18n.games.wuwa.log;
    const page = 1;
    let retries = 5;

    yield new SentinelMessage(parseText(text.fetch.current, { name }));

    while (true) {
      let result;

      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          timeout: 15 * 1000,
        });
        result = await resp.json();
      } catch (e) {
        log.warn(`Failed to fetch gacha logs: ${e}`);

        if (!retries--) {
          throw new Error(parseText(text.fetch.retryFailed, { name }));
        }

        yield new SentinelMessage(
          parseText(text.fetch.retry, { name, count: 5 - retries }),
        );

        await sleep(5);
      }

      if (result.code !== 0) {
        const message = result.message;
        throw new Error(message);
      }

      /**
       * dataList = [
       *  {
       *   "cardPoolType": "Resonators Accurate Modulation",
       *   "resourceId": 21030023,
       *   "qualityLevel": 3,
       *   "resourceType": "Weapon",
       *   "name": "Originite: Type III",
       *   "count": 1,
       *   "time": "2026-07-20 08:57:57"
       *   },
       * ];
       */
      const dataList = result?.data;

      if (Array.isArray(dataList)) {
        return dataList;
      }
      throw new Error();
    }
  }
}

const wutheringWavesExtractor = new WutheringWavesExtractor();

export default wutheringWavesExtractor;

import { app } from "electron";
import log from "electron-log";
import * as fs from "fs-extra";
import { glob } from "glob";
import * as path from "path";
import { URL } from "url";
import i18n from "../i18n.js";
import { formatTimestamp, parseText, sleep } from "../utils.js";
import BaseExtractor from "./base.js";
import { SentinelMessage } from "./message.js";

const API_CN = "https://public-operation-hk4e.mihoyo.com";
const API_SEA = "https://public-operation-hk4e-sg.hoyoverse.com";

const GACHA_TYPES = ["301", "302", "200", "100", "400", "500"];

const WEAPON_TYPE_NAMES = new Set([
  "武器",
  "Weapon",
  "무기",
  "Arma",
  "Arme",
  "Оружие",
  "อาวุธ",
  "Vũ Khí",
  "Waffe",
  "Senjata",
]);
const CHARACTER_TYPE_NAMES = new Set([
  "角色",
  "Character",
  "캐릭터",
  "キャラクター",
  "Personaje",
  "Personnage",
  "Персонажи",
  "ตัวละคร",
  "Nhân Vật",
  "Figur",
  "Karakter",
  "Personagem",
]);

function getApiLang(lang) {
  const lookup = {
    "en-us": "en",
    "fr-fr": "fr",
    "de-de": "de",
    "es-es": "es",
    "pt-pt": "pt",
    "ru-ru": "ru",
    "ja-jp": "ja",
    "ko-kr": "ko",
    "th-th": "th",
    "vi-vn": "vi",
    "id-id": "id",
    "zh-cn": "zh-cn",
    "zh-tw": "zh-tw",
    "tr-tr": "tr",
    "it-it": "it",
  };
  return lookup[lang] ?? lookup["en-us"];
}

function getGenshinLang(lang) {
  const lookup = {
    chs: "zh-cn",
    cht: "zh-tw",
    de: "de-de",
    en: "en-us",
    es: "es-es",
    fr: "fr-fr",
    id: "id-id",
    jp: "ja-jp",
    kr: "ko-kr",
    pt: "pt-pt",
    ru: "ru-ru",
    th: "th-th",
    vi: "vi-vi",
  };
  return lookup[lang] ?? lookup["en"];
}

function getApi(url) {
  const host = url.host;
  if (
    host.includes("webstatic-sea") ||
    host.includes("hk4e-api-os") ||
    host.includes("hoyoverse.com")
  ) {
    return API_SEA;
  }
  return API_CN;
}

function parseItemType(value) {
  if (WEAPON_TYPE_NAMES.has(value)) {
    return "weapon";
  } else if (CHARACTER_TYPE_NAMES.has(value)) {
    return "chara";
  }
  return "unknown";
}

async function readCloudLog() {
  const filepath = path.join(
    app.getPath("home"),
    "AppData",
    "Local",
    "miHoYo",
    "GenshinImpactCloudGame",
    "config",
    "logs",
    "MiHoYoSDK.log",
  );

  let data;
  try {
    data = await fs.readFile(filepath, "utf8");
  } catch (e) {
    log.warn(`Failed to read log file: ${e}`);
    return null;
  }

  const m = data.match(
    /https.+?auth_appid=webview_gacha.+?authkey=.+?game_biz=hk4e_\w+/g / g,
  );
  return m ? m[m.length - 1] : null;
}

async function readLocalSEALog() {
  const filepath = path.join(
    app.getPath("home"),
    "AppData",
    "LocalLow",
    "miHoYo",
    "Genshin Impact",
    "output_log.txt",
  );
  return readLocalLog(filepath);
}

async function readLocalCNLog() {
  const filepath = path.join(
    app.getPath("home"),
    "AppData",
    "LocalLow",
    "miHoYo",
    "原神",
    "output_log.txt",
  );
  return readLocalLog(filepath);
}

async function readLocalLog(filepath) {
  let data, m;

  try {
    data = await fs.readFile(filepath, "utf8");
  } catch (e) {
    log.warn(`Failed to read log file: ${e}`);
    return null;
  }

  m = data.match(/\w:\/.+(GenshinImpact_Data|YuanShen_Data)/);
  if (!m) return null;

  const pattern = path
    .join(m[0], "webCaches{/,/*/}Cache/Cache_Data/data_2")
    .replace(/\\/g, "/");

  let logfiles;
  try {
    logfiles = await glob(pattern, {
      stat: true,
      withFileTypes: true,
      nodir: true,
      windowsPathsNoEscape: true,
    });
  } catch (e) {
    log.warn("Cache file lookup failed:", e);
    return null;
  }

  if (!logfiles || logfiles.length === 0) return null;

  let newestLog = logfiles[0];

  for (let i = 1; i < logfiles.length; i++) {
    if (logfiles[i].mtimeMs > newestLog.mtimeMs) {
      newestLog = logfiles[i];
    }
  }

  const logfile = newestLog.fullpath();
  try {
    data = await fs.readFile(logfile, "utf8");
  } catch (e) {
    log.error(`Failed to read cache file at ${logfile}:`, e);
    throw new Error(i18n.log.file.readFailed);
  }

  m = data.match(
    /https.+?auth_appid=webview_gacha.+?authkey=.+?game_biz=hk4e_\w+/g,
  );
  return m ? m[m.length - 1] : null;
}

class GenshinExtractor extends BaseExtractor {
  id = "genshin";

  /** SQL */
  tableSchema = {
    uid: "TEXT",
    type: "TEXT",
    typeAlt: "TEXT",
    lang: "TEXT",
    id: "TEXT",
    name: "TEXT",
    itemType: "TEXT",
    itemTypeNorm: "TEXT",
    rankType: "TEXT",
    timestamp: "INTEGER",
    fetchTimestamp: "INTEGER",
  };

  /** UIGF */
  UIGFKey = "hk4e";
  #UIGFItemIdsMap = null;
  #UIGFItemNamesMap = null;

  /** Configurations */
  #logType = 0;
  #fetchFullHistory = false;
  #hideNovice = true;

  importConfig(config) {
    super.importConfig(config);
    this.#logType = config.logType;
    this.#fetchFullHistory = config.fetchFullHistory;
    this.#hideNovice = config.hideNovice;
  }

  exportConfig() {
    return {
      ...super.exportConfig(),
      logType: this.#logType,
      fetchFullHistory: this.#fetchFullHistory,
      hideNovice: this.#hideNovice,
    };
  }

  excel() {
    const uid = this.currentUID;
    if (!uid) return null;

    const gachaType = i18n.games.genshin.gachaType;
    const excel = i18n.games.genshin.excel;
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
      const name = gachaType[type] ?? type;
      const rows = [];
      const rowFormats = [];
      const items = this._data({ uid, type });

      if (items && items.length) {
        let lastRank5 = 0;

        items.forEach((item, index) => {
          const remark = item.typeAlt === "400" ? excel.wish2 : "";
          rows.push([
            item.timestamp / 86400000 + 25569,
            item.name,
            item.itemType,
            parseInt(item.rankType),
            index,
            index - lastRank5,
            remark,
          ]);
          if (item.rankType === "5") {
            rowFormats.push({ color: "ffbd6932", bold: true });
            lastRank5 = index;
          } else if (item.rankType === "4") {
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

    const orderKey = ["chara5", "weapon5", "chara4", "weapon4", "weapon3"];
    const orderStat = ["star5", "star4", "star3"];
    const summary = [];
    const fetchTimestamps = [];

    GACHA_TYPES.forEach((type) => {
      if (this.#hideNovice && type == "100") return;

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
        const itemType = item.itemTypeNorm;
        const rankType = item.rankType;
        let keyCount;
        let keyStat;
        let colorCount;
        let colorStat;

        switch (rankType) {
          case "3":
            colorCount = "#73c0de";
            colorStat = "#73c0de";
            break;

          case "4":
            colorCount = itemType === "chara" ? "#5470c6" : "#91cc75";
            colorStat = "#a517bb";
            break;

          case "5":
            colorCount = itemType === "chara" ? "#fac858" : "#ee6666";
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
        keyCount = `${itemType}${rankType}`;
        keyStat = `star${rankType}`;

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
    const logType = this.#logType;
    let strategies;

    if (logType === 0) {
      // Auto
      strategies = [readLocalSEALog, readLocalCNLog, readCloudLog];
    } else if (logType === 1) {
      // CN
      strategies = [readLocalCNLog];
    } else if (logType === 2) {
      // Global
      strategies = [readLocalSEALog];
    } else if (logType === 3) {
      // Cloud
      strategies = [readCloudLog];
    } else {
      throw new Error("");
    }

    for (const strategy of strategies) {
      const url = await strategy();
      if (url) {
        return url;
      }
    }

    throw new Error(i18n.log.file.notFound);
  }

  async *fetchData(url = null) {
    const text = i18n.log;
    const game = i18n.games[this.id] ?? {};
    const gachaType = game.gachaType ?? {};
    const fetchFull = this.#fetchFullHistory;

    // Extract url from local
    const extractedUrl = new URL(url ?? (await this.getUrl()));
    const authkey = extractedUrl.searchParams.get("authkey");
    if (!authkey) throw new Error(text.url.incorrect);

    // Setup
    let uid = 0;
    const fetchTimestamp = Date.now();
    const api = getApi(extractedUrl);
    const finalUrl = new URL(`gacha_info/api/getGachaLog`, api);
    const searchParams = finalUrl.searchParams;
    const apiLang = getApiLang(i18n.currentLocale);

    finalUrl.search = extractedUrl.search;
    searchParams.set("size", "20");
    searchParams.set("lang", apiLang);

    for (const type of GACHA_TYPES) {
      const typeName = gachaType[type] ?? type;
      const items = [];
      let page = 1;
      let endId = null;

      searchParams.set("gacha_type", type);

      while (true) {
        const list = yield* this.#fetchPage(typeName, finalUrl, page, endId);
        if (!list || !list.length) break;

        if (!uid) {
          uid = list[0].uid;
          if (!uid) {
            throw new Error();
          }
        }

        items.push(
          ...list.map((item) => {
            return {
              uid: uid,
              type: type,
              typeAlt: item.gacha_type,
              lang: item.lang,
              id: item.id,
              name: item.name,
              itemType: item.item_type,
              itemTypeNorm: parseItemType(item.item_type),
              rankType: item.rank_type,
              timestamp: new Date(item.time).getTime(),
              fetchTimestamp: fetchTimestamp,
            };
          }),
        );
        endId = BigInt(items[items.length - 1].id);
        page++;

        if (!fetchFull) {
          const match = this._findLast({ uid, type, id: endId.toString() });
          if (match) break;
        }
        await sleep(0.5);
      }

      if (items.length) {
        items.reverse();
        this.#save(uid, type, items);
      }
      await sleep(2);
    }

    this.currentUID = uid;
  }

  async importUIGF41(payload) {
    if (!payload) return;

    await this.#initUIGFLookupMaps();

    const lang = i18n.currentLocale;
    const itemIds = this.#UIGFItemIdsMap.get(lang) ?? {};

    const parseItemName = (item) => {
      return itemIds[item.item_id] ?? item.name;
    };

    for (const data of payload) {
      const uid = data.uid;
      const timezone = data.timezone;

      const items = data.list.map((item, index) => {
        const time = new Date(item.time.replace(" ", "T") + "Z").getTime();
        const timestamp = time - timezone * 60 * 60 * 1000;

        return {
          uid: uid,
          type: item.uigf_gacha_type,
          typeAlt: item.gacha_type,
          lang: lang,
          id: item.id,
          name: parseItemName(item),
          itemType: item.item_type,
          itemTypeNorm: parseItemType(item.item_type),
          rankType: item.rank_type,
          timestamp: timestamp,
          fetchTimestamp: Date.now(),
        };
      });

      items.sort((a, b) => {
        const idA = BigInt(a.id);
        const idB = BigInt(b.id);
        return idA < idB ? -1 : idA > idB ? 1 : 0;
      });

      const gachaType = new Set(items.map((value) => value.type));

      gachaType.forEach((type) => {
        this.#save(
          uid,
          type,
          items.filter((item) => item.type == type),
        );
      });
    }
  }

  async exportUIGF41() {
    await this.#initUIGFLookupMaps();

    const uids = this.UIDs();
    const timezone = 8;

    const lang = i18n.currentLocale;
    const targetItemIdsMap = this.#UIGFItemIdsMap.get(lang) ?? {};

    const getItemIdName = (item) => {
      // Get the dictionary for the item's original language
      const sourceItemNamesMap = this.#UIGFItemNamesMap.get(item.lang);
      // Find the ID, fallback to "" if not found
      const itemId = sourceItemNamesMap?.[item.name] ?? "";
      // Find the translated name in the target export language
      const name = targetItemIdsMap[itemId] ?? item.name;

      return { item_id: String(itemId), name: name };
    };

    return uids.map((uid) => {
      const items = this._data({ uid });
      const list = items.map((item) => {
        return {
          ...getItemIdName(item),
          uigf_gacha_type: item.type,
          gacha_type: item.typeAlt,
          time: formatTimestamp(item.timestamp),
          item_type: item.itemType,
          rank_type: item.rankType,
          id: item.id,
        };
      });

      return { uid, timezone, lang, list };
    });
  }

  /** */

  #save(uid, type, items) {
    if (items && items.length > 0) {
      const groups = { uid, type };
      const deletes = {
        "CAST(id AS INTEGER)": BigInt(items[0].id),
      };
      this._saveLog(groups, deletes, items);
    }
  }

  async *#fetchPage(name, url, page, endId) {
    const text = i18n.log;

    if (page % 10 === 0) {
      yield new SentinelMessage(parseText(text.fetch.interval, { name, page }));
      await sleep(2);
    }
    yield new SentinelMessage(parseText(text.fetch.current, { name, page }));

    url.searchParams.set("page", page.toString());
    if (endId) {
      url.searchParams.set("end_id", endId.toString());
    } else {
      url.searchParams.delete("end_id");
    }

    let retries = 5;

    while (true) {
      let result;

      try {
        const resp = await fetch(url, { timeout: 15 * 1000 });
        result = await resp.json();
      } catch (e) {
        if (!retries--) {
          throw new Error(parseText(text.fetch.retryFailed, { name, page }));
        }
        yield new SentinelMessage(
          parseText(text.fetch.retry, { name, page, count: 5 - retries }),
        );
        await sleep(5);
      }

      if (result.retcode !== 0) {
        const message = result.message;
        if (message === "authkey timeout") {
          throw new Error(i18n.log.fetch.authTimeout);
        }
        throw new Error(message);
      }

      /**
       * dataList = [
       *  {
       *    uid: "123456789",
       *    gacha_type: "200",
       *    item_id: "",
       *    count: "1",
       *    time: "2000-01-01 00:00:00",
       *    name: "弹弓",
       *    lang: "zh-cn",
       *    item_type: "武器",
       *    rank_type: "3",
       *    id: "1781669160000079390",
       *    op_gacha_type: "200",
       *  },
       *];
       */
      const dataList = result?.data?.list;

      if (Array.isArray(dataList)) {
        return dataList;
      }
      throw new Error();
    }
  }

  async #initUIGFLookupMaps() {
    if (this.#UIGFItemIdsMap && this.#UIGFItemNamesMap) return;

    const dict = await this._readUIGFDict();
    const itemIdsMap = new Map();
    const itemNamesMap = new Map();

    for (const [lang, items] of Object.entries(dict)) {
      const genshinLang = getGenshinLang(lang);

      // Save the standard { "name": id } data
      itemNamesMap.set(genshinLang, items);

      // Reverse and save the { id: "name" } data
      const reversedItems = {};
      for (const [id, name] of Object.entries(items)) {
        reversedItems[name] = id;
      }
      itemIdsMap.set(genshinLang, reversedItems);
    }

    // Save both to the class properties
    this.#UIGFItemIdsMap = itemIdsMap;
    this.#UIGFItemNamesMap = itemNamesMap;
  }
}

const extractor = new GenshinExtractor();

export default extractor;

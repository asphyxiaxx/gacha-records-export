// import fetch from "electron-fetch";
import log from "electron-log";
import config from "../config";
import { createDb, hash, readFile, saveFile } from "../utils.js";

async function request(url) {
  return await fetch(url, { timeout: 15 * 1000 });
}

class BaseExtractor {
  id = null;

  /** SQL */
  tableSchema = null;
  tableName = "pulls";
  #db = null;

  /** UIGF */
  UIGFKey = null;

  /** configuration */
  currentUID = "";

  get db() {
    if (!this.#db) {
      const incColumn = ["rowid", "INTEGER PRIMARY KEY AUTOINCREMENT"];
      const columns = [incColumn, ...Object.entries(this.tableSchema)]
        .map(([column, type]) => `${column} ${type}`)
        .join(", ");
      this.#db = createDb(`gacha-logs_${this.id}.db`);
      this.#db.exec(
        `CREATE TABLE IF NOT EXISTS ${this.tableName} (${columns});`,
      );
    }
    return this.#db;
  }

  importConfig(config) {
    this.currentUID = config.currentUID;
  }

  exportConfig() {
    return {
      currentUID: this.currentUID,
    };
  }

  UIDs() {
    return this.db
      .prepare(`SELECT DISTINCT uid FROM ${this.tableName}`)
      .all()
      .map((row) => row.uid);
  }

  excel() {
    throw new Error(`[${this.name}] excel() must be implemented.`);
  }

  data() {
    throw new Error(`[${this.name}] data() must be implemented.`);
  }

  removeUID() {
    throw new Error(`[${this.name}] removeUID() must be implemented.`);
  }

  async getUrl() {
    throw new Error(`[${this.name}] getUrl() must be implemented.`);
  }

  async *fetchData(url = null) {
    throw new Error(`[${this.name}] fetchData() must be implemented.`);
  }

  async importUIGF41() {
    throw new Error(`[${this.name}] importUIGF41() must be implemented.`);
  }

  async exportUIGF41() {
    throw new Error(`[${this.name}] exportUIGF41() must be implemented.`);
  }

  /** Internal */

  _data(groups = null) {
    let where = "";
    let values = [];

    if (groups) {
      const keys = Object.keys(groups);

      if (keys.length) {
        where = `WHERE ${keys.map((key) => `${key} = ?`).join(" AND ")}`;
        values = Object.values(groups);
      }
    }

    return this.db
      .prepare(`SELECT * FROM ${this.tableName} ${where} ORDER BY rowid ASC`)
      .all(...values);
  }

  _findLast(groups = null) {
    let where = "";
    let values = [];

    if (groups) {
      const keys = Object.keys(groups);

      if (keys.length) {
        where = `WHERE ${keys.map((key) => `${key} = ?`).join(" AND ")}`;
        values = Object.values(groups);
      }
    }

    return this.db
      .prepare(
        `SELECT * FROM ${this.tableName} ${where} ORDER BY rowid DESC LIMIT 1`,
      )
      .get(...values);
  }

  _deleteLog(groups = null) {
    const db = this.db;

    let where = "";
    let values = [];

    if (groups) {
      const keys = Object.keys(groups);

      if (keys.length) {
        where = `WHERE ${keys.map((key) => `${key} = ?`).join(" AND ")}`;
        values = Object.values(groups);

        return this.db
          .prepare(`DELETE FROM ${this.tableName} ${where}`)
          .run(...values);
      }
    }
  }

  _saveLog(groups = null, deletes = null, items = null) {
    const db = this.db;
    const transaction = db.transaction(() => {
      if (deletes && Object.keys(deletes).length > 0) {
        const groupKeys = groups ? Object.keys(groups) : [];
        const groupValues = groups ? Object.values(groups) : [];

        const deleteKeys = Object.keys(deletes);
        const deleteValues = Object.values(deletes);

        const whereClauses = [
          ...groupKeys.map((key) => `${key} = ?`),
          ...deleteKeys.map((key) => `${key} >= ?`),
        ];

        db.prepare(
          `DELETE FROM ${this.tableName} WHERE ${whereClauses.join(" AND ")}`,
        ).run(...groupValues, ...deleteValues);
      }

      if (items && items.length > 0) {
        const columns = Object.keys(items[0]);
        const insertStmt = db.prepare(
          `INSERT INTO ${this.tableName} (${columns.join(", ")})
          VALUES (${columns.map((k) => `@${k}`).join(", ")})`,
        );

        for (const item of items) {
          insertStmt.run(item);
        }
      }
    });
    transaction();
  }

  async _readUIGFDict(gameId, lang) {
    const filename = `uigf_${gameId}_${lang}.json`;

    try {
      // Get the locally saved MD5 and data
      const fileData = await readFile(filename);
      let localData = null;

      if (fileData) {
        // Fetch the latest MD5 hash from the UIGF API
        const md5Url = `https://api.uigf.org/md5/${gameId}`;
        const md5Resp = await request(md5Url);

        if (md5Resp.ok) {
          const md5Data = await md5Resp.json();

          // Compare our local hash to the API's 'all' hash
          if (hash(fileData, "md5") === md5Data[lang]) {
            localData = JSON.parse(fileData);
          }
        }
      }

      if (!localData) {
        const dataUrl = `https://api.uigf.org/dict/${gameId}/${lang}.json`;
        const dataResp = await request(dataUrl);

        if (!dataResp.ok) {
          throw new Error("Failed to fetch dict data");
        }

        const dataText = await dataResp.text();

        // Save file locally
        await saveFile(filename, dataText);

        localData = await JSON.parse(dataText);
      }

      return localData;
    } catch (error) {
      throw error;
      // log.error("UIGF API Error:", error); return null;
    }
  }
}

export default BaseExtractor;

import { createDb } from "../utils.js";

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
    if (this.currentUID) {
      this._deleteLog({ uid: this.currentUID });
      this.currentUID = "";
    }
  }

  async getUrl() {
    throw new Error(`[${this.name}] getUrl() must be implemented.`);
  }

  async *fetchData(url = null) {
    throw new Error(`[${this.name}] fetchData() must be implemented.`);
  }

  importNative(payload) {
    throw new Error(`[${this.name}] importNative() must be implemented.`);
  }

  exportNative(uids) {
    const results = [];
    for (const uid of uids) {
      results.push(...this._data({ uid }).map(({ rowid, ...rest }) => rest));
    }
    return results;
  }

  async importUIGF41(payload) {
    throw new Error(`[${this.name}] importUIGF41() must be implemented.`);
  }

  async exportUIGF41(uids) {
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
    if (groups) {
      const keys = Object.keys(groups);

      if (keys.length) {
        const where = `WHERE ${keys.map((key) => `${key} = ?`).join(" AND ")}`;
        const values = Object.values(groups);

        return this.db
          .prepare(`DELETE FROM ${this.tableName} ${where}`)
          .run(...values);
      }
    }
  }

  _saveLog(groups = null, deletes = null, items = null) {
    const db = this.db;

    db.exec("BEGIN TRANSACTION");
    try {
      if (deletes && Object.keys(deletes).length > 0) {
        const groupKeys = groups ? Object.keys(groups) : [];
        const groupValues = groups ? Object.values(groups) : [];

        const deleteKeys = Object.keys(deletes);
        const deleteValues = Object.values(deletes);

        const whereClauses = [
          ...groupKeys.map((key) => `${key} = ?`),
          ...deleteKeys.map((key) => `${key} >= ?`),
        ];

        if (whereClauses.length > 0) {
          db.prepare(
            `DELETE FROM ${this.tableName} WHERE ${whereClauses.join(" AND ")}`,
          ).run(...groupValues, ...deleteValues);
        }
      }

      if (items && items.length > 0) {
        const columns = Object.keys(items[0]);
        const insertStmt = db.prepare(
          `INSERT INTO ${this.tableName} (${columns.join(", ")}) VALUES (${columns.map((k) => `:${k}`).join(", ")})`,
        );

        for (const item of items) {
          insertStmt.run(item);
        }
      }

      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}

export default BaseExtractor;

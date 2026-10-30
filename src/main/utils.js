import * as crypto from "crypto";
import { app } from "electron";
import * as fs from "fs-extra";
import { DatabaseSync } from "node:sqlite";
import * as path from "path";
import { pipeline } from "stream/promises";

const userDataPath = !app.isPackaged
  ? path.resolve(__dirname, "..", "..", "userData")
  : path.resolve(app.getPath("userData"), "userData");

function assign(target, source, schema) {
  for (let [key, def] of Object.entries(schema)) {
    let validator;
    if (typeof def === "string") {
      validator = (val) => (typeof val === def ? val : undefined);
    } else {
      validator = def;
    }

    const val = validator(source[key]);
    if (val !== undefined) {
      target[key] = val;
    }
  }
  return target;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);

  // Helper to ensure single digits get a leading zero (e.g., '5' becomes '05')
  const pad = (num) => num.toString().padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // Months are 0-indexed in JS, so we add 1
  const day = pad(date.getDate());

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function convertUTC(timestamp, fromOffset) {
  const toOffset = 8;
  const hoursDifference = toOffset - fromOffset;
  return timestamp + hoursDifference * 60 * 60 * 1000;
}

function createDb(name) {
  const filepath = path.join(userDataPath, name);
  return new DatabaseSync(filepath);
}

async function readdir(dirpath) {
  const filepath = path.join(userDataPath, dirpath);
  return fs.readdir(filepath);
}

async function readFile(name) {
  const filepath = path.join(userDataPath, name);
  try {
    return await fs.readFile(filepath, "utf-8");
  } catch (e) {
    return null;
  }
}

async function saveFile(name, data) {
  const filepath = path.join(userDataPath, name);
  await fs.outputFile(filepath, data);
}

async function readJSON(name) {
  const filepath = path.join(userDataPath, name);
  try {
    return await fs.readJSON(filepath);
  } catch (e) {
    return null;
  }
}

async function saveJSON(name, data) {
  const filepath = path.join(userDataPath, name);
  await fs.outputJSON(filepath, data, { spaces: 2 });
}

function hash(data, type = "sha256") {
  return crypto.createHash(type).update(data).digest("hex");
}

async function download(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Unexpected response [${response.status} ${response.statusText}]`,
    );
  }
  if (!response.body) {
    throw new Error("Response body is empty. Nothing to download.");
  }
  await pipeline(response.body, fs.createWriteStream(filePath));
}

function sleep(seconds = 1) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

function maskAuthkey(text = "") {
  if (text) {
    return text.replace(/authkey=[^&]+&/g, "authkey=***&");
  }
  return text;
}

function parseText(text, data) {
  return text.replace(/(\${.+?})/g, function (...args) {
    const key = args[0].slice(2, args[0].length - 1);
    return data[key] ? data[key] : args[0];
  });
}

function pad(num) {
  return `${num}`.padStart(2, "0");
}

function getTimeString() {
  const d = new Date();
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${YYYY}${MM}${DD}_${HH}${mm}${ss}`;
}

export {
  assign,
  convertUTC,
  createDb,
  download,
  formatTimestamp,
  getTimeString,
  hash,
  maskAuthkey,
  parseText,
  readdir,
  readFile,
  readJSON,
  saveFile,
  saveJSON,
  sleep,
  userDataPath,
};

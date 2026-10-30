import { hash, readFile, saveFile } from "./utils.js";

async function request(url) {
  return await fetch(url, { timeout: 15 * 1000 });
}

async function getUIGFDict(gameId, lang) {
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

export { getUIGFDict };

import { app } from "electron";
import log from "electron-log";
import * as semver from "semver";
import { build, version } from "../../package.json";

async function checkForUpdates() {
  if (!app.isPackaged) return { hasUpdate: false };

  const publish = build?.publish;
  if (!publish) return { hasUpdate: false };

  try {
    const url = `https://api.github.com/repos/${publish.owner}/${publish.repo}/releases/latest`;
    const headers = { "User-Agent": "Electron-App" };
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch release info from '${url}'`);
    }

    const data = await response.json();
    const latestVersion = data.tag_name.replace(/^v/, "");

    // GitHub's API provides the full release URL directly in data.html_url
    const releaseUrl =
      data.html_url ||
      `https://github.com/${publish.owner}/${publish.repo}/releases/tag/${data.tag_name}`;

    if (semver.gt(latestVersion, version)) {
      log.debug(`Update available, found new version: ${latestVersion}`);
      return {
        hasUpdate: true,
        latestVersion,
        releaseUrl,
      };
    } else {
      log.debug("Application is up to date.");
      return { hasUpdate: false };
    }
  } catch (error) {
    log.warn("Error checking for updates:", error);
    return { hasUpdate: false };
  }
}

export { checkForUpdates };

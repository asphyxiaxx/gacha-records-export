<template>
  <div v-if="ui" class="relative">
    <div class="flex justify-between">
      <div class="flex gap-2 mr-1">
        <el-button
          type="primary"
          class="!m-0 focus:outline-none"
          :icon="state.status === STATUS_INIT ? 'milk-tea' : 'refresh-right'"
          :disabled="disableLoad"
          :loading="state.status === STATUS_LOADING"
          @click="fetchData()"
          plain
        >
          {{ state.status === STATUS_INIT ? ui.button.load : ui.button.update }}
        </el-button>

        <el-button
          type="success"
          class="!m-0 focus:outline-none"
          icon="folder-opened"
          :disabled="!state.currentData"
          :loading="state.status === STATUS_LOADING"
          @click="saveExcel()"
          plain
        >
          {{ ui.button.excel }}
        </el-button>

        <el-select
          class="w-48"
          :placeholder="'Select Game'"
          :disabled="state.status === STATUS_LOADING"
          @change="changeGame"
          plain
          v-model="state.config.currentGameId"
        >
          <el-option
            v-for="gameId in state.gameIds"
            :key="gameId"
            :label="games[gameId] ? games[gameId].title : gameId"
            :value="gameId"
          ></el-option>
        </el-select>

        <el-select
          class="w-44"
          :model-value="selectedUID"
          :disabled="state.status === STATUS_LOADING"
          @change="changeUID"
        >
          <el-option
            v-for="item of currentUIDs"
            :key="item"
            :label="item ? item : ui.select.newAccount"
            :value="item"
          >
          </el-option>
        </el-select>

        <el-button
          v-if="state.currentData"
          type="danger"
          icon="Delete"
          plain
          @click="removeUID(selectedUID)"
        />

        <el-tooltip v-if="state.releaseUrl" :content="ui.hint.relaunchHint">
          <el-button
            @click="openExternal(state.releaseUrl)"
            type="success"
            icon="refresh"
            class="!m-0 focus:outline-none"
            >{{ ui.button.update }}</el-button
          >
        </el-tooltip>
      </div>

      <div class="flex gap-2 ml-1">
        <el-dropdown trigger="click" @command="handleCommand">
          <el-button class="focus:outline-none" plain type="info" icon="more">
            {{ ui.button.option }}
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="setting" icon="setting">
                {{ ui.button.setting }}
              </el-dropdown-item>

              <el-dropdown-item
                :disabled="state.status === STATUS_LOADING"
                command="url"
                icon="link"
              >
                {{ ui.button.url }}
              </el-dropdown-item>

              <el-dropdown-item command="copyUrl" icon="DocumentCopy">
                {{ ui.button.copyUrl }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <p class="text-gray-400 my-2 text-xs">
      {{ hint }}
    </p>

    <div
      v-if="summary"
      class="gap-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4"
    >
      <div class="mb-4" v-for="data in summary" :key="data.type">
        <p class="text-center text-gray-600 my-2">
          {{ gachaType[data.type] ?? data.type }}
        </p>
        <pie-chart
          :name="gachaType[data.type] ?? data.type"
          :i18n="state.i18n"
          :keys="keys"
          :data="data"
        >
        </pie-chart>
        <gacha-detail
          :name="gachaType[data.type] ?? data.type"
          :i18n="state.i18n"
          :game="game"
          :keys="keys"
          :data="data"
        >
        </gacha-detail>
      </div>
    </div>

    <Setting
      v-show="state.showSetting"
      :i18n="state.i18n"
      :config="state.config"
      @changeConfig="changeConfig"
      @loadData="loadData"
      @close="state.showSetting = false"
    >
    </Setting>

    <el-dialog
      :title="ui.urlDialog.title"
      v-model="state.showUrlDialog"
      width="90%"
      custom-class="max-w-md"
    >
      <p class="mb-4 text-gray-500">{{ ui.urlDialog.hint }}</p>
      <el-input
        type="textarea"
        :autosize="{ minRows: 4, maxRows: 6 }"
        :placeholder="ui.urlDialog.placeholder"
        v-model="state.inputUrl"
        spellcheck="false"
      >
      </el-input>

      <template #footer>
        <span class="dialog-footer">
          <el-button
            @click="state.showUrlDialog = false"
            class="focus:outline-none"
          >
            {{ ui.common.cancel }}
          </el-button>
          <el-button
            type="primary"
            @click="((state.showUrlDialog = false), fetchData(state.inputUrl))"
            class="focus:outline-none"
          >
            {{ ui.common.ok }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, onErrorCaptured, onMounted, reactive, toRaw } from "vue";
import { version } from "../../../package.json";
import GachaDetail from "./components/GachaDetail.vue";
import PieChart from "./components/PieChart.vue";
import Setting from "./components/Setting.vue";

const electron = window.electron;

const STATUS_INIT = "init";
const STATUS_LOADING = "loading";
const STATUS_LOADED = "loaded";
const STATUS_FAILED = "failed";

const state = reactive({
  gameIds: new Set(),
  i18n: {},
  config: {},
  releaseUrl: null,
  status: STATUS_INIT,
  hint: "Loading...",
  error: "",
  showSetting: false,
  showUrlDialog: false,

  // The active variables for currentGameId
  currentData: null,
  currentUIDs: new Set(),

  // Input
  inputUrl: "",
});

const ui = computed(() => state.i18n.ui);
const games = computed(() => state.i18n.games);
const game = computed(() => games.value?.[state.config.currentGameId] ?? {});
const keys = computed(() => game.value?.keys ?? {});
const gachaType = computed(() => game.value?.gachaType ?? {});

const selectedUID = computed(() => {
  return state.currentData
    ? state.currentData.uid
    : state.i18n.ui.select.newAccount;
});
const currentUIDs = computed(() => {
  return [...Array.from(state.currentUIDs), ""];
});

const summary = computed(() => {
  return state.currentData ? state.currentData.summary : null;
});

const hint = computed(() => {
  if (!state.i18n) return "Loading...";

  const hint = state.i18n.ui.hint;
  const colon = state.i18n.symbol.colon;

  switch (state.status) {
    case STATUS_LOADED:
      if (state.currentData) {
        const dateString = new Date(state.currentData.time).toLocaleString();
        return `${hint.lastUpdate}${colon}${dateString}`;
      }
      state.status = STATUS_INIT;

    case STATUS_INIT:
      return hint.init;

    case STATUS_LOADING:
      return state.hint;

    case STATUS_FAILED:
      return `${hint.failed} ${colon} ${state.error}`;

    default:
      throw new Error(`Unexpected status ${state.status}`);
  }
});

const disableLoad = computed(() => {
  const data = state.currentData;
  if (data) {
    return Date.now() - data.time < 1000 * 60;
  }
  return false;
});

/* --------------------------------------------------------- */

async function relaunch() {
  await electron.relaunch();
}

function openExternal(url) {
  electron.openExternal(url);
}

function handleCommand(type) {
  switch (type) {
    case "setting":
      state.showSetting = true;
      break;
    case "url":
      state.inputUrl = "";
      state.showUrlDialog = true;
      break;
    case "copyUrl":
      copyUrl();
      break;
  }
}

async function copyUrl() {
  const { success, value } = await electron.copyUrl();

  if (success) {
    ElMessage.success(ui.value.common.urlCopied);
  } else {
    ElMessage.error(value);
  }
}

async function changeGame() {
  state.status = STATUS_LOADING;

  await saveConfig();
  await loadGame();
}

async function changeConfig(config, reload = false) {
  state.config = config;

  await saveConfig();
  await loadConfig();
  if (reload) {
    await loadI18n();
  }
}

async function changeUID(uid = "") {
  state.config.games[state.config.currentGameId].currentUID = uid;

  saveConfig();
  loadGame();
}

async function removeUID(uid) {
  const common = state.i18n.ui.common;
  const deleteDialog = state.i18n.ui.deleteDialog;
  const hint = `${deleteDialog.hint1} ${uid}? ${deleteDialog.hint2}`;

  try {
    await ElMessageBox.confirm(hint, deleteDialog.title, {
      confirmButtonText: common.ok,
      cancelButtonText: common.cancel,
      type: "warning",
    });

    state.status = STATUS_LOADING;

    await electron.removeUID();
    await loadGame();

    ElMessage({
      type: "success",
      message: `UID ${uid} data has been removed.`,
    });
  } catch (error) {}
}

async function fetchData(url = null) {
  state.status = STATUS_LOADING;

  const { success, value } = await electron.fetchData(url);
  if (!success) {
    state.error = value;
    state.status = STATUS_FAILED;
  } else {
    await loadGame();
  }
}

async function saveConfig() {
  const config = toRaw(state.config);
  const { success, value } = await electron.saveConfig(config);

  if (!success) {
    console.error("Failed to save config:", value);
  }
}

async function saveExcel() {
  const { success, value } = await electron.saveExcel();
  if (!success) {
    ElMessage.error(`Failed to save excel: ${value}`);
  }
}

async function loadConfig() {
  state.config = await electron.config();
}

async function loadI18n() {
  const i18n = await electron.i18n();

  //
  state.i18n = i18n;

  // Update title
  document.title = `${i18n.ui.win.title} - v${version}`;

  // Update status
  if (!(state.status === STATUS_INIT || state.status === STATUS_LOADED)) {
    state.status = STATUS_INIT;
  }
}

async function loadGame() {
  state.status = STATUS_LOADING;
  state.currentData = null;

  await loadConfig();
  await loadData();
}

async function loadData() {
  state.status = STATUS_LOADING;

  const data = await electron.readData();
  const UIDs = await electron.UIDs();

  state.currentUIDs = new Set(UIDs);
  if (data) {
    state.currentData = data;
    state.status = STATUS_LOADED;
  } else {
    state.status = STATUS_INIT;
  }
}

async function checkForUpdates() {
  const result = await electron.checkForUpdates();
  if (result.hasUpdate) {
    state.releaseUrl = result.releaseUrl;
  }
}

onErrorCaptured((err, instance, info) => {
  state.error = err.message ? err : "An unexpected error occurred";
  state.status = STATUS_FAILED;

  return true;
});

onMounted(async () => {
  electron.onReceiveHint((hint) => {
    state.hint = hint;
  });

  state.gameIds = new Set(await electron.gameIds());

  checkForUpdates();

  await loadI18n();
  await loadGame();
});
</script>

<template>
  <div class="bg-white pt-2 pb-4 px-6 w-full h-full absolute inset-0">
    <div class="flex content-center items-center mb-4 justify-between">
      <h3 class="font-bold mt-4 mb-2">{{ setting.title }}</h3>
      <el-button
        icon="close"
        @click="closeSetting()"
        plain
        circle
        type="default"
        class="w-8 h-8 relative -right-4 -top-2 shadow-md focus:shadow-none focus:outline-none"
      ></el-button>
    </div>

    <el-form :model="settingForm" label-width="120px">
      <el-form-item :label="setting.language">
        <el-select @change="updateSetting(true)" v-model="settingForm.lang">
          <el-option
            v-for="(label, key) in state.localeNames"
            :key="key"
            :label="label"
            :value="key"
          ></el-option>
        </el-select>
        <p class="text-gray-400 text-xs m-1.5">{{ setting.languageHint }}</p>
      </el-form-item>

      <el-form-item :label="setting.DataLable">
        <div class="flex gap-2 mr-1 space-x-2">
          <el-button
            :loading="state.loadingData"
            class="!m-0 focus:outline-none"
            plain
            type="primary"
            @click="importData()"
          >
            {{ setting.DataImportButton }}
          </el-button>

          <el-button
            class="!m-0 focus:outline-none"
            plain
            type="success"
            :loading="state.loadingData"
            @click="loadExportData()"
          >
            {{ setting.DataExportButton }}
          </el-button>

          <el-select
            style="width: 190px"
            v-model="state.dataType"
            :disabled="state.loadingData"
          >
            <el-option
              v-for="type in supportedDataTypes"
              :key="type"
              :label="type"
              :value="type"
            />
          </el-select>
        </div>
        <p class="text-gray-400 text-xs m-1.5 leading-normal">
          {{ setting.UIGFHint }}
          <a
            class="cursor-pointer text-blue-400"
            @click="openLink('https://uigf.org/en/')"
          >
            {{ setting.UIGFLink }}
          </a>
        </p>
      </el-form-item>

      <el-dialog
        v-model="state.showDataDialog"
        title="Select UIDs to Export"
        width="400px"
      >
        <div v-loading="state.loadingData" class="min-h-[100px]">
          <div
            v-for="(uids, gameId) in state.GameUIDs"
            :key="gameId"
            class="mb-3"
          >
            <span class="font-bold text-gray-700 block mb-1">
              {{ games[gameId]?.title ?? gameId }}
            </span>

            <div v-if="uids.length > 0">
              <el-checkbox-group
                v-model="state.selectedGameUIDs[gameId]"
                class="flex flex-col space-y-1 pl-2"
              >
                <el-checkbox v-for="uid in uids" :key="uid" :value="uid">
                  {{ uid }}
                </el-checkbox>
              </el-checkbox-group>
            </div>
            <div v-else>
              <p class="text-sm text-gray-500">{{ setting.UIGFNoAccounts }}</p>
            </div>
          </div>
        </div>

        <template #footer>
          <el-button @click="state.showDataDialog = false">
            {{ common.cancel }}
          </el-button>
          <el-button
            type="primary"
            :disabled="!hasSelectedUIDs"
            @click="exportData()"
          >
            {{ common.ok }}
          </el-button>
        </template>
      </el-dialog>

      <!-- Game specified settings -->
      <el-collapse accordion>
        <el-collapse-item
          v-for="(gameSettings, gameId) in settingForm.games"
          :key="gameId"
          :name="gameId"
          :title="games[gameId]?.title ?? gameId"
        >
          <div class="p-2">
            <!-- Genshin Impact -->
            <template
              v-if="gameId === 'genshin'"
              v-for="s in [games.genshin.ui.setting]"
            >
              <!-- LogType -->
              <el-form-item :label="s.logType">
                <el-radio-group
                  @change="updateSetting()"
                  v-model.number="gameSettings.logType"
                >
                  <el-radio-button :value="0">
                    {{ s.auto }}
                  </el-radio-button>
                  <el-radio-button :value="1">
                    {{ s.cnServer }}
                  </el-radio-button>
                  <el-radio-button :value="2">
                    {{ s.seaServer }}
                  </el-radio-button>
                  <el-radio-button :value="3">
                    {{ s.cloudServer }}
                  </el-radio-button>
                </el-radio-group>
                <p class="text-gray-400 text-xs m-1.5">
                  {{ s.logTypeHint }}
                </p>
              </el-form-item>
              <!-- hideNovice -->
              <el-form-item :label="s.hideNovice">
                <el-switch
                  @change="updateSetting()"
                  v-model="gameSettings.hideNovice"
                >
                </el-switch>
              </el-form-item>
              <!-- fetchFullHistory -->
              <el-form-item :label="s.fetchFullHistory">
                <el-switch
                  @change="updateSetting()"
                  v-model="gameSettings.fetchFullHistory"
                >
                </el-switch>
                <p class="text-gray-400 text-xs m-1.5">
                  {{ s.fetchFullHistoryHint }}
                </p>
              </el-form-item>
            </template>

            <!-- Honkai: Star Rail -->
            <template
              v-else-if="gameId === 'starrail'"
              v-for="s in [games.starrail.ui.setting]"
            >
              <!-- LogType -->
              <el-form-item :label="s.logType">
                <el-radio-group
                  @change="updateSetting()"
                  v-model.number="gameSettings.logType"
                >
                  <el-radio-button :value="0">
                    {{ s.auto }}
                  </el-radio-button>
                  <el-radio-button :value="1">
                    {{ s.cnServer }}
                  </el-radio-button>
                  <el-radio-button :value="2">
                    {{ s.seaServer }}
                  </el-radio-button>
                </el-radio-group>
                <p class="text-gray-400 text-xs m-1.5">
                  {{ s.logTypeHint }}
                </p>
              </el-form-item>
              <!-- fetchFullHistory -->
              <el-form-item :label="s.fetchFullHistory">
                <el-switch
                  @change="updateSetting()"
                  v-model="gameSettings.fetchFullHistory"
                >
                </el-switch>
                <p class="text-gray-400 text-xs m-1.5">
                  {{ s.fetchFullHistoryHint }}
                </p>
              </el-form-item>
            </template>

            <!-- Zenless Zone Zero -->
            <template
              v-else-if="gameId === 'zzz'"
              v-for="s in [games.zzz.ui.setting]"
            >
              <!-- LogType -->
              <el-form-item :label="s.logType">
                <el-radio-group
                  @change="updateSetting()"
                  v-model.number="gameSettings.logType"
                >
                  <el-radio-button :value="0">
                    {{ s.auto }}
                  </el-radio-button>
                  <el-radio-button :value="1">
                    {{ s.cnServer }}
                  </el-radio-button>
                  <el-radio-button :value="2">
                    {{ s.seaServer }}
                  </el-radio-button>
                </el-radio-group>
                <p class="text-gray-400 text-xs m-1.5">
                  {{ s.logTypeHint }}
                </p>
              </el-form-item>
              <!-- fetchFullHistory -->
              <el-form-item :label="s.fetchFullHistory">
                <el-switch
                  @change="updateSetting()"
                  v-model="gameSettings.fetchFullHistory"
                >
                </el-switch>
                <p class="text-gray-400 text-xs m-1.5">
                  {{ s.fetchFullHistoryHint }}
                </p>
              </el-form-item>
            </template>

            <!-- Wuthering Waves -->
            <template
              v-else-if="gameId === 'wuwa'"
              v-for="s in [games.wuwa.ui.setting]"
            >
              <!-- selectGamePath -->
              <el-form-item :label="s.gamePath">
                <el-input
                  v-model="gameSettings.gamePath"
                  placeholder="Select game directory or executable..."
                  readonly
                >
                  <template #append>
                    <el-button
                      :icon="FolderOpened"
                      @click="selectGamePath(gameId)"
                    >
                      {{ s.browse }}
                    </el-button>
                  </template>
                </el-input>
              </el-form-item>
            </template>
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-form>

    <h3 class="font-bold mt-4 mb-2">{{ about.title }}</h3>
    <p class="text-gray-600 text-xs mt-1">{{ about.license }}</p>
    <p class="text-gray-600 text-xs mt-1 pb-6">
      Github:
      <a @click="openLink(homepage)" class="cursor-pointer text-blue-400">
        {{ homepage }}
      </a>
    </p>
  </div>
</template>

<style>
.el-form-item__label {
  line-height: normal !important;
  position: relative;
  top: 6px;
}

.el-form-item__content {
  flex-direction: column;
  align-items: start !important;
}

.el-form-item--default {
  margin-bottom: 14px !important;
}
</style>

<script setup>
import { FolderOpened } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { computed, onMounted, reactive, toRaw, watch } from "vue";
import { homepage } from "../../../../package.json";

const electron = window.electron;
const props = defineProps({
  i18n: Object,
  config: Object,
});
const emit = defineEmits(["close", "loadData", "changeConfig"]);

const supportedDataTypes = ["Native", "UIGFv4.1"];
const state = reactive({
  localeNames: {},
  showDataDialog: false,
  loadingData: false,
  dataType: supportedDataTypes[0],
  GameUIDs: {},
  selectedGameUIDs: {},
});
const settingForm = reactive({
  lang: null,
  games: {},
});

const setting = computed(() => props.i18n.ui.setting);
const common = computed(() => props.i18n.ui.common);
const about = computed(() => props.i18n.ui.about);
const games = computed(() => props.i18n.games);

const hasSelectedUIDs = computed(() => {
  return Object.values(state.selectedGameUIDs).some(
    (uids) => uids && uids.length > 0,
  );
});

async function importData() {
  state.loadingData = true;

  const type = state.dataType;
  const { success, value } = await electron.importData(type);

  if (success) {
    emit("loadData");
    ElMessage({ type: "success", message: setting.value.DataImportSuccessed });
  } else if (value) {
    ElMessage({ type: "error", message: value });
  }

  state.loadingData = false;
}

async function loadExportData() {
  state.loadingData = true;
  state.showDataDialog = true;

  try {
    const type = state.dataType;
    const UIGFUids = await electron.gameUIDs(type);

    state.GameUIDs = { ...UIGFUids };
    state.selectedGameUIDs = { ...UIGFUids };
  } catch (error) {
    console.error("Failed to fetch UIDs from backend:", error);
    state.showDataDialog = false;
  } finally {
    state.loadingData = false;
  }
}

async function exportData() {
  state.loadingData = true;

  const type = state.dataType;
  const data = toRaw(state.selectedGameUIDs);
  const { success, value } = await electron.exportData(type, data);

  if (success) {
    ElMessage({ type: "success", message: setting.value.DataExportSuccessed });
  } else if (value) {
    ElMessage({ type: "error", message: value });
  }
  state.loadingData = false;
}

async function selectGamePath(gameId) {
  const { success, value } = await electron.selectGamePath();

  if (success) {
    settingForm.games[gameId].gamePath = value;
    updateSetting();
    ElMessage({ type: "success", message: "Done" });
  } else if (value) {
    ElMessage({ type: "error", message: value });
  }
}

function updateSetting(refresh = false) {
  emit("changeConfig", toRaw(settingForm), refresh);
}

function closeSetting() {
  emit("close");
}

function openLink(url) {
  electron.openExternal(url);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepUpdate(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (isObject(value)) {
      deepUpdate((target[key] ??= {}), value);
    } else {
      target[key] = value;
    }
  }
}

function _deepUpdate(target, source) {
  for (const [key, value] of Object.entries(source)) {
    // Only proceed if the key already exists in the target
    if (Object.hasOwn(target, key)) {
      if (isObject(value)) {
        if (isObject(target[key])) {
          // Both are objects, recurse
          deepUpdate(target[key], value);
        }
      } else {
        // Value is a primitive, update directly
        target[key] = value;
      }
    }
  }
}

watch(
  () => props.config,
  (newConfig) => {
    if (!newConfig) return;
    deepUpdate(settingForm, toRaw(newConfig));
  },
  {
    deep: true, // detect changes in nested object too
    immediate: true, // ensures it runs once on load
  },
);

onMounted(async () => {
  state.localeNames = await electron.localeNames();
});
</script>

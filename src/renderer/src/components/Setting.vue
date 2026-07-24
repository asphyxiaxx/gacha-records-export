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

      <el-form-item :label="setting.UIGFLable">
        <div class="flex space-x-2">
          <el-button
            :loading="state.loadingUIGF"
            class="focus:outline-none"
            plain
            type="primary"
            @click="importUIGF()"
          >
            {{ setting.UIGFImportButton }}
          </el-button>
          <el-button
            :loading="state.loadingUIGF"
            class="focus:outline-none"
            plain
            type="success"
            @click="exportUIGF()"
          >
            {{ setting.UIGFExportButton }}
          </el-button>

          <!-- <el-select class="w-24" v-model="settingForm.uigfVersion">
            <el-option
              v-for="version in uigfSupportedVersions"
              :key="version"
              :label="'UIGFv' + version"
              :value="version"
            />
          </el-select>
          <el-checkbox
            v-if="settingForm.uigfVersion === uigfSupportedVersions[0]"
            v-model="settingForm.uigfAllAccounts"
          >
            {{ setting.UIGFAllAccounts }}
          </el-checkbox> -->
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
                  <el-radio-button :label="0">
                    {{ s.auto }}
                  </el-radio-button>
                  <el-radio-button :label="1">
                    {{ s.cnServer }}
                  </el-radio-button>
                  <el-radio-button :label="2">
                    {{ s.seaServer }}
                  </el-radio-button>
                  <el-radio-button :label="3">
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
                  <el-radio-button :label="0">
                    {{ s.auto }}
                  </el-radio-button>
                  <el-radio-button :label="1">
                    {{ s.cnServer }}
                  </el-radio-button>
                  <el-radio-button :label="2">
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
                  <el-radio-button :label="0">
                    {{ s.auto }}
                  </el-radio-button>
                  <el-radio-button :label="1">
                    {{ s.cnServer }}
                  </el-radio-button>
                  <el-radio-button :label="2">
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

const state = reactive({
  localeNames: {},
  loadingUIGF: false,
});
const settingForm = reactive({
  lang: null,
  games: {},
});

const setting = computed(() => props.i18n.ui.setting);
const about = computed(() => props.i18n.ui.about);
const games = computed(() => props.i18n.games);

async function importUIGF() {
  state.loadingUIGF = true;
  const { success, value } = await electron.importUIGF();

  if (success) {
    emit("loadData");
    ElMessage({ type: "success", message: setting.value.UIGFImportSuccessed });
  } else if (value) {
    ElMessage({ type: "error", message: value });
  }

  state.loadingUIGF = false;
}

async function exportUIGF() {
  state.loadingUIGF = true;
  const { success, value } = await electron.exportUIGF();

  if (success) {
    ElMessage({ type: "success", message: setting.value.UIGFExportSuccessed });
  } else if (value) {
    ElMessage({ type: "error", message: value });
  }

  state.loadingUIGF = false;
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

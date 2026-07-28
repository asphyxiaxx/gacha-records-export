# 原神祈愿记录导出工具

[English](https://github.com/asphyxiaxx/gacha-records-export/blob/main/README.md) | 中文

## 制作人员与致谢

本项目是基于 [@biuu](https://github.com/biuuu) 最初创建的 [genshin-wish-export](https://github.com/biuuu/genshin-wish-export) 的派生项目（fork）。

衷心感谢原作者及各位贡献者为本项目奠定了基础！

## 简介

一个使用 Electron 制作的小工具，需要在 Windows 64位操作系统上运行。

工具会在当前目录下的 `userData` 文件夹里保存数据，获取到新的记录时，会与本地数据合并后保存。

## 目前支持的游戏

- 原神
- 崩坏：星穹铁道
- 绝区零
- 鸣潮

## 目前支持的语言

- 英文

修改或添加 `src/i18n/` 目录下的 json 文件就可以翻译到对应的语言。如果觉得已有的翻译有不准确或可以改进的地方，可以随时修改发 Pull Request。

## 使用说明

1. 下载工具 - 下载地址: [Github](https://github.com/asphyxiaxx/gacha-records-export/releases/latest)

2. 打开游戏的祈愿历史记录

   ![祈愿历史记录](/docs/wish-history.png?v=1)

3. 点击工具的“加载数据”按钮

   ![加载数据](/docs/load-data.png?v=1)

   如果没出什么问题的话，你会看到正在读取数据的提示，最终效果如下图所示

   ![预览](/docs/preview.png?v=1)

如果需要导出多个账号的数据，在游戏切换的新账号，再打开祈愿历史记录，工具再点击“加载数据”按钮。

## License

[MIT](https://github.com/asphyxiaxx/gacha-records-export/blob/main/LICENSE)

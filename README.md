# Gacha Records Exporter

English | [中文](https://github.com/asphyxiaxx/gacha-records-export/blob/main/docs/README_CN.md)

## Credits & Acknowledgements

This project is a fork of [Original Project Name](https://github.com/biuuu/genshin-wish-export) originally created by [@original-owner](https://github.com/biuuu). 

Huge thanks to the original author and contributors for building the foundation of this project.

## Introduction

A tool made from Electron that runs on the Windows 64 bit operating system.

The tool will save the data in the `userData` folder in the current directory and will merge with the local data when a new gacha records history is obtained.

## Currently Supported Games

- Genshin Impact
- Wuthering Waves

## Other Languages

Modify or add the JSON file in the `src/i18n/` directory to translate into the appropriate language.

If you feel that the existing translation is inappropriate, you can send a pull request to modify it at any time.

## Usage (Genshin Impact)

1. Unzip after downloading the tool - [Download](https://github.com/asphyxiaxx/gacha-records-export/releases/latest/download/Gacha-Records-Export.zip)
2. Open the wish history of the game

    ![wish history](/docs/wish-history.png)

3. Click the tool's "Load data" button

    ![load data](/docs/load-data.png)

    If nothing goes wrong, you'll be prompted to read the data, and the final result will look like this

    <details>
    <summary>Expand the picture</summary>

    ![preview](/docs/preview.png)
    </details>

If you need to export the data of multiple accounts, then switch to the new account in the game, open the wish history, and click the "load data" button in the tool.

## Devlopment

```
# install node modules
yarn install

# develop
yarn dev

# Build a program that can run
yarn build
```

## License

[MIT](https://github.com/asphyxiaxx/gacha-records-export/blob/main/LICENSE)

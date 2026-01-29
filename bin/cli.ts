#!/usr/bin/env bun

import { Command } from "commander";
import pc from "picocolors";
// import {creat} from 'yocto-spinner'
import open from "open";
import path from "path";
import pkg from "../package.json" assert { type: "json" };
import yoctoSpinner from "yocto-spinner";
import { scanAssets, AssetScanner } from "../lib/scan";
import { startServer } from "../lib/server";

const version = pkg.version || "0.0.1";
const program = new Command();

program
  .name("asset-master")
  .description("A simple CLI tool example")
  .version(version);

program
  .command("scan")
  .description("Scan assets in the project")
  .argument("[dir]", "项目根目录", ".")
  .option("-p,--port <number>", "指定端口", "9000")
  .option("-o,--open", "扫描完成后自动打开浏览器", false)
  .action(async (dir, options) => {
    const rootDir = path.resolve(dir);
    console.log(
      `\n${pc.bgCyan(pc.black(" ASSET MASTER "))} ${pc.dim(`v${version}`)}\n`,
    );
    console.log(`${pc.blue("▶")} 目标目录: ${pc.white(rootDir)}\n`);

    const spinner = yoctoSpinner().start();
    // 3. 执行扫描，带进度反馈
    const scanner = new AssetScanner(rootDir, []);

    const scanResult = await scanner.scan((current, total, fileName) => {
      spinner.text = `正在扫描: ${pc.yellow(current)}/${pc.yellow(
        total,
      )} 个资产... 当前文件: ${pc.green(fileName)}`;
    });


    spinner.success(`
📊 项目统计:
- 总计资源: ${pc.cyan(scanResult.assets.length)} 个
- 冗余资源: ${pc.yellow(scanResult.assets.filter((a) => !a.isUsed).length)} 个
- 重复文件: ${pc.red(scanResult.stats.duplicateCount)} 组
- 可节省空间: ${pc.green((scanResult.stats.unusedSize / 1024 / 1024).toFixed(2) + " MB")}
`);

    // console.table(assets, ["id", "name", "relativePath", "size", "dimensions"]);

    const port = parseInt(options.port);
    const server = await startServer(port, rootDir, scanResult);

    const url = `http://localhost:${port}/dashboard/`;

    console.log(`\n${pc.bold("🚀 Dashboard 已就绪:")}`);
    console.log(`${pc.magenta(url)}`);
    console.log(pc.dim("\n按 Ctrl+C 停止服务\n"));

    // 4. 自动打开浏览器
    if (options.open) {
      await open(url);
    }
  });

program.parse(process.argv);

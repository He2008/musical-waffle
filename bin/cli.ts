#!/usr/bin/env bun

import { Command } from "commander";
import pc from "picocolors";
// import {creat} from 'yocto-spinner'
import open from "open";
import path from "path";
import pkg from "../package.json" assert { type: "json" };
import yoctoSpinner from "yocto-spinner";
import { scanAssets } from "../lib/scan";
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
    const assets = await scanAssets(rootDir, (current, total) => {
      spinner.text = `正在扫描: ${pc.yellow(current)}/${pc.yellow(total)} 个资产...`;
    });

    spinner.success(
      pc.green(
        `扫描成功！在项目中发现了 ${pc.bold(assets.length)} 个静态资产。`,
      ),
    );

    // console.table(assets, ["id", "name", "relativePath", "size", "dimensions"]);

    const port = parseInt(options.port);
    const server = await startServer(port, rootDir, assets);

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

#!/usr/bin/env bun

import { Command } from "commander";
import pc from "picocolors";
// import {creat} from 'yocto-spinner'
import open from "open";
import path from "path";
import pkg from "../package.json" assert { type: "json" };
import yoctoSpinner from "yocto-spinner";

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
  .action(async (dir, options) => {
    const rootDir = path.resolve(dir);
    console.log(
      `\n${pc.bgCyan(pc.black(" ASSET MASTER "))} ${pc.dim(`v${version}`)}\n`,
    );
    console.log(`${pc.blue("▶")} 目标目录: ${pc.white(rootDir)}\n`);

    const assets = async function () {
      // 模拟扫描过程
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([
            { name: "image1.png", size: "150KB" },
            { name: "script.js", size: "45KB" },
            { name: "style.css", size: "30KB" },
          ]);
        }, 1000);
      });
    };
    const spinner = yoctoSpinner().start();
    let a = await assets();
    //    console.log(a)
    spinner.success(
      `${pc.green("✔")} 扫描完成，发现 ${a.length} 个资源文件。\n`,
    );
    console.table(a);
    console.log(`\n${pc.blue("▶")} 启动本地服务器预览扫描结果...`);

        // 3. 启动服务
      const port = parseInt(options.port);
    //   const server =( await startServer(rootDir, assets, port);)

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

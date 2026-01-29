import { Glob } from "bun";
import { imageSize } from "image-size";
import path from "node:path";

export interface Asset {
  id: string;
  name: string;
  relativePath: string;
  size: number;
  dimensions: { width: number; height: number };
}

export interface AssetInfo {
  id: string;
  name: string;
  relativePath: string;
  absolutePath: string;
  ext: string;
  size: number;
  dimensions: { width: number; height: number };
  hash: string;
  isUsed: boolean;
  referenceCount: number;
}

// 扫描结果汇总
export interface ScanResult {
  assets: AssetInfo[];
  stats: {
    totalSize: number;
    unusedSize: number;
    duplicateCount: number;
  };
}

export class AssetScanner {
  private rootDir: string;
  private assetPattern = "**/*.{png,jpg,jpeg,gif,webp,svg}";
  private codePattern = "**/*.{js,ts,jsx,tsx,html,vue,scss,less,css}";
  private defaultIgnore = ["node_modules", "dist", ".git", ".vscode", "temp"];
  private customIgnore: string[] = [];

  constructor(rootDir: string, customIgnore: string[] = []) {
    this.rootDir = rootDir;
    this.customIgnore = [...this.defaultIgnore, ...customIgnore];
  }

  async scan(
    onProgress?: (current: number, total: number, fileName: string) => void,
  ): Promise<ScanResult> {
    // 1. 扫描源码
    const codeContentPoll = await this.buildCodePool();

    // 2. 扫描资产
    const assetGlob = new Glob(this.assetPattern);
    const allFiles = Array.from(
      assetGlob.scanSync({
        cwd: this.rootDir,
        absolute: false,
      }),
    );
    const assetsFiles = allFiles.filter((file) => !this.isIgnored(file));

    const total = assetsFiles.length;
    const assets: AssetInfo[] = [];
    const hashScanner = new Map<string, number>(); // 用于检测重复

    // 3.遍历资产文件
    for (let i = 0; i < total; i++) {
      const relPath = assetsFiles[i];
      if (!relPath) continue;
      const absPath = path.join(this.rootDir, relPath);
      const fileName = path.basename(relPath);

      onProgress && onProgress(i + 1, total, fileName);

      const file = Bun.file(absPath);
      const buffer = await file.arrayBuffer();
      const nodeBuffer = Buffer.from(buffer);

      // 哈希对比

      const hash = Bun.hash(nodeBuffer).toString(16);

      hashScanner.set(hash, (hashScanner.get(hash) || 0) + 1);

      // 尺寸获取
      let dimensions = { width: 0, height: 0 };
      try {
        dimensions = imageSize(nodeBuffer) as any;
      } catch (e) {}

      // 审计
      const nameWithoutExt = path.basename(relPath, path.extname(relPath));

      const isUsed =
        codeContentPoll.includes(fileName) ||
        codeContentPoll.includes(relPath) ||
        (nameWithoutExt.length > 3 && codeContentPoll.includes(nameWithoutExt));

      assets.push({
        id: crypto.randomUUID(),
        name: fileName,
        relativePath: relPath,
        absolutePath: absPath,
        ext: path.extname(relPath).toLowerCase(),
        size: file.size,
        dimensions,
        hash,
        isUsed,
        referenceCount: isUsed ? 1 : 0, // 以后可以通过更复杂的逻辑来计算引用次数
      });
    }

    // 4. 统计信息
    const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
    const unusedSize = assets
      .filter((asset) => !asset.isUsed)
      .reduce((sum, asset) => sum + asset.size, 0);
    const duplicateCount = Array.from(hashScanner.values()).filter(
      (count) => count > 1,
    ).length;

    return {
      assets,
      stats: {
        totalSize,
        unusedSize,
        duplicateCount,
      },
    };
  }

  private async buildCodePool(): Promise<string> {
    const codeGlob = new Glob(this.codePattern);
    const allFiles = Array.from(
      codeGlob.scanSync({
        cwd: this.rootDir,
        absolute: false,
      }),
    );
    const codeFiles = allFiles.filter((file) => !this.isIgnored(file));

    const contents = await Promise.all(
      codeFiles.map(async (fileRelPath) =>
        Bun.file(path.join(this.rootDir, fileRelPath)).text(),
      ),
    );
    return contents.join("\n---FILE-BOUNDARY---\n");
  }

  private isIgnored(filePath: string): boolean {
    const ignorePatterns = ["**/node_modules/**", "**/.git/**", "**/dist/**"];
    // 将路径统一转换为正斜杠进行匹配
    const normalizedPath = filePath.replace(/\\/g, "/");
    return this.customIgnore.some((dir) => {
      const pattern = new RegExp(`(^|/)${dir}(/|$)`);
      return pattern.test(normalizedPath);
    });
  }

  private async loadGitignore() {
  const gitignoreFile = Bun.file(path.join(this.rootDir, ".gitignore"));
  if (await gitignoreFile.exists()) {
    const content = await gitignoreFile.text();
    const rules = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')); // 过滤空行和注释
    
    this.customIgnore = [...new Set([...this.customIgnore, ...rules])];
  }
}
}


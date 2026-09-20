# 上传到 GitHub + 拿到手机能开的网址（3 步）

## 1. 建一个空仓库

github.com → 右上角 **+** → **New repository**

- **Repository name**：建议用英文，例如 `dilution-fridge`
- 可见性选 **Public**（免费版的 GitHub Pages 只支持公开仓库）
- 不要勾 "Add a README" / ".gitignore"（保持空库，避免冲突）

→ **Create repository**

## 2. 把这个文件夹里的内容传上去

在新仓库页面点 **uploading an existing file**（或 Add file → Upload files），
把**本文件夹里的全部内容**拖进去（不要拖外层文件夹）：

必须带上（缺一个站点就跑不起来）：

```
index.html      styles.css      styles/      src/      vendor/
```

建议一起带（文档与本地运行）：

```
README.md   CHANGELOG.md   PROVENANCE.md   PRD.md   SOURCES.md
tools/      docs/          data/           package.json   .gitignore
```

⚠️ `.gitignore` 是隐藏文件：拖入前在 Finder 按 **⌘⇧.** 显示隐藏文件，否则容易漏。

→ **Commit changes**

## 3. 打开 Pages，拿到网址

仓库 → **Settings** → 左侧 **Pages**

- **Source**：Deploy from a branch
- **Branch**：`main`，文件夹选 **/(root)**

→ **Save**，等 1 分钟左右，访问：

```
https://<你的用户名>.github.io/<仓库名>/
```

这个地址手机在任何网络下都能打开（不依赖你这台电脑，也不受 Wi-Fi 客户端隔离影响）。

想更像 App：用 iPhone 的 Safari 打开 → 分享 → **添加到主屏幕**。

## 本地跑（可选）

```bash
npm start           # 零依赖，Node ≥ 18；默认 http://127.0.0.1:8400/
python3 -m http.server 8400   # 或者任意静态服务器
```

⚠️ 不要直接双击 `index.html`：页面是原生 ES module，浏览器不允许 `file://` 下加载模块，必须走 http。

## 本次没有打包进来的东西

| 内容 | 原因 |
| --- | --- |
| `.git/` | 30MB 版本库，网页上传用不到 |
| `docs/verify/*.png` | 约 10MB 的开发自查截图，只影响仓库体积，不影响运行 |

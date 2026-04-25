# KidSpark

> KidSpark —— 点燃孩子的创作火花。AI 驱动的家庭童创素材库，让涂鸦、故事、录音变成动画与绘本。

这是一个为家长设计的本地素材管理工具，用于管理孩子的涂鸦、照片、故事录音和视频成品。

## 功能特点

- 素材导入：支持拖拽上传单个文件或整个文件夹
- 多格式支持：图片 (jpg/png/heic)、视频 (mp4/mov)、音频 (mp3/m4a)
- 自动分类：按年/月/日组织导入的素材
- 缩略图生成：自动为图片和视频生成缩略图
- 标签系统：为素材添加标签，通过标签筛选素材
- 搜索功能：按文件名或标签搜索素材
- AI 导出：三种导出方式为 AI 创作提供素材
- 本地优先：所有数据存储在本地，保护隐私

## 技术栈

- Electron：桌面应用框架
- React 18：前端界面
- TypeScript：类型安全
- Ant Design：UI 组件库
- SQLite：本地数据库
- Sharp：图像处理
- FFmpeg：视频处理
- Vite：构建工具

## 安装依赖

```bash
npm install
```

## 开发模式

同时启动 Vite 开发服务器和 Electron 应用：

```bash
npm run electron:dev
```

## 构建

构建前端和 Electron 主进程代码：

```bash
npm run build
```

## 运行构建后的应用

```bash
npm run electron
```

## 项目结构

```
.
├── electron/             # Electron 主进程代码
│   ├── main.ts          # 主进程入口
│   ├── preload.ts       # 预加载脚本
│   ├── database.ts      # SQLite 数据库操作
│   └── fileHandler.ts   # 文件处理
├── src/                 # React 渲染进程代码
│   ├── components/      # React 组件
│   │   └── AssetCard.tsx
│   ├── types/           # TypeScript 类型定义
│   ├── App.tsx          # 主应用组件
│   ├── main.tsx         # 渲染进程入口
│   └── index.css        # 样式
├── data/                # 数据存储目录（运行时创建）
│   ├── originals/       # 原始文件
│   ├── thumbnails/      # 缩略图
│   └── library.db       # SQLite 数据库
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.electron.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

## 使用说明

### 基础操作
1. 点击顶部「导入素材」按钮，选择需要导入的文件或文件夹
2. 素材会自动按日期组织到 `~/Documents/KidSpark/originals/` 目录
3. 在素材卡片上可以添加和移除标签
4. 在左侧标签列表中点击标签可筛选素材
5. 点击标签上的「×」可删除标签

### AI 导出功能
KidSpark 提供三种导出方式，方便将素材用于 AI 创作：

1. **复制文件路径到剪贴板**
   - 一键复制所有选中文件的路径
   - 可直接粘贴到 ComfyUI/Stable Diffusion 等 AI 工具中

2. **导出到指定文件夹**
   - 将素材文件复制到用户选择的文件夹
   - 保持原文件名

3. **生成 JSON 元数据**
   - 导出包含文件名、路径、标签、创建时间等完整信息的 JSON 文件
   - 用于批量处理和自动化工作流

### 搜索功能
- 使用顶部搜索框按文件名或标签搜索素材
- 搜索结果实时更新
- 支持与标签筛选同时使用

## 许可证

MIT

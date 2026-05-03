import { app, BrowserWindow, ipcMain, dialog, clipboard } from 'electron';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import {
  getAllAssets,
  getAssetsByTag,
  getAssetsByTags,
  getAssetsByType,
  getAllTags,
  getOrCreateTag,
  attachTagToAsset,
  detachTagFromAsset,
  searchTags,
  deleteTag,
  deleteAsset,
  searchAssets,
  updateAssetDescription,
  insertAiGeneration,
  getAiGenerationsByAssetId,
  getAiGenerationChain,
  getMainGenerationChain,
  getChildGenerations,
  deleteAiGeneration,
  setMainGeneration,
  unsetMainGeneration,
  getAppDataDir
} from './database';
import { importFiles } from './fileHandler';
import { importAiGenerationFile } from './fileHandler';
import {
  setWanXConfig,
  getWanXConfig,
  generateImage,
  generateVideo,
  getTaskStatus,
  waitForTaskCompletion,
  downloadToFile
} from './wanxiang';
import { Asset, AiGeneration, GenerationType } from '../src/types';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式下，dist 目录在 app 目录下
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('import-files', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'openDirectory', 'multiSelections'],
    filters: [
      { name: 'Media Files', extensions: ['jpg', 'jpeg', 'png', 'heic', 'webp', 'gif', 'mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'm4a', 'wav', 'flac', 'aac'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return [];
  }

  return importFiles(result.filePaths);
});

ipcMain.handle('get-all-assets', () => {
  return getAllAssets();
});

ipcMain.handle('get-assets-by-tag', (_event: Electron.IpcMainInvokeEvent, tagId: number) => {
  return getAssetsByTag(tagId);
});

ipcMain.handle('get-all-tags', () => {
  return getAllTags();
});

ipcMain.handle('add-tag-to-asset', (_event: Electron.IpcMainInvokeEvent, assetId: number, tagName: string) => {
  const tagId = getOrCreateTag(tagName);
  attachTagToAsset(assetId, tagId);
  return { success: true, tagId };
});

ipcMain.handle('remove-tag-from-asset', (_event: Electron.IpcMainInvokeEvent, assetId: number, tagId: number) => {
  detachTagFromAsset(assetId, tagId);
  return { success: true };
});

ipcMain.handle('search-tags', (_event: Electron.IpcMainInvokeEvent, query: string) => {
  return searchTags(query);
});

ipcMain.handle('delete-tag', (_event: Electron.IpcMainInvokeEvent, tagId: number) => {
  deleteTag(tagId);
  return { success: true };
});

ipcMain.handle('get-assets-by-tags', (_event: Electron.IpcMainInvokeEvent, tagIds: number[]) => {
  return getAssetsByTags(tagIds);
});

ipcMain.handle('delete-asset', (_event: Electron.IpcMainInvokeEvent, assetId: number) => {
  deleteAsset(assetId);
  return { success: true };
});

ipcMain.handle('search-assets', (_event: Electron.IpcMainInvokeEvent, query: string) => {
  return searchAssets(query);
});

ipcMain.handle('get-assets-by-type', (_event: Electron.IpcMainInvokeEvent, fileType: 'image' | 'video' | 'audio') => {
  return getAssetsByType(fileType);
});

ipcMain.handle('update-asset-description', (_event: Electron.IpcMainInvokeEvent, assetId: number, description: string) => {
  updateAssetDescription(assetId, description);
  return { success: true };
});

// AI 生成相关 IPC
ipcMain.handle('save-ai-generation', (_event: Electron.IpcMainInvokeEvent, generation: Omit<AiGeneration, 'id' | 'created_at'>) => {
  const id = insertAiGeneration(generation);
  return { success: true, id };
});

ipcMain.handle('get-ai-generations-by-asset', (_event: Electron.IpcMainInvokeEvent, assetId: number) => {
  return getAiGenerationsByAssetId(assetId);
});

ipcMain.handle('get-ai-generation-chain', (_event: Electron.IpcMainInvokeEvent, generationId: number) => {
  return getAiGenerationChain(generationId);
});

ipcMain.handle('get-main-generation-chain', (_event: Electron.IpcMainInvokeEvent, assetId: number, targetGenerationId?: number) => {
  return getMainGenerationChain(assetId, targetGenerationId);
});

ipcMain.handle('get-child-generations', (_event: Electron.IpcMainInvokeEvent, generationId: number) => {
  return getChildGenerations(generationId);
});

ipcMain.handle('delete-ai-generation', (_event: Electron.IpcMainInvokeEvent, generationId: number) => {
  deleteAiGeneration(generationId);
  return { success: true };
});

ipcMain.handle('set-main-generation', (_event: Electron.IpcMainInvokeEvent, generationId: number, originalAssetId: number) => {
  setMainGeneration(generationId, originalAssetId);
  return { success: true };
});

ipcMain.handle('unset-main-generation', (_event: Electron.IpcMainInvokeEvent, generationId: number) => {
  unsetMainGeneration(generationId);
  return { success: true };
});

// 导入AI生成内容（手动导入离线AI生成的文件）
ipcMain.handle('import-ai-generation', async (
  _event: Electron.IpcMainInvokeEvent,
  originalAssetId: number,
  parentGenerationId: number | null,
  generationType: string,
  prompt?: string
) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      title: '选择AI生成内容文件',
      filters: [
        { name: '图片/视频', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'avi', 'mkv', 'webm'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    const sourceFilePath = result.filePaths[0];
    const importResult = await importAiGenerationFile(
      originalAssetId,
      parentGenerationId,
      generationType,
      sourceFilePath,
      prompt
    );

    if (!importResult.success) {
      return { success: false, error: importResult.error };
    }

    const genId = insertAiGeneration(importResult.generation!);
    return { success: true, id: genId, generation: { ...importResult.generation, id: genId } };
  } catch (e) {
    console.error('Failed to import AI generation:', e);
    return { success: false, error: String(e) };
  }
});

// 配置阿里万相 API Key
ipcMain.handle('set-wanx-config', async (
  _event: Electron.IpcMainInvokeEvent,
  apiKey: string
) => {
  setWanXConfig({ apiKey });
  return { success: true };
});

ipcMain.handle('get-wanx-config', async () => {
  const config = getWanXConfig();
  return { success: true, hasApiKey: !!config.apiKey };
});

// 图生图
ipcMain.handle('wanx-generate-image', async (
  _event: Electron.IpcMainInvokeEvent,
  originalAssetId: number,
  imagePath: string,
  prompt?: string
) => {
  try {
    const task = await generateImage(imagePath, prompt);
    return { success: true, task_id: task.task_id, original_asset_id: originalAssetId };
  } catch (error: any) {
    console.error('阿里万相图生图失败:', error);
    return { success: false, error: error.message };
  }
});

// 图生视频
ipcMain.handle('wanx-generate-video', async (
  _event: Electron.IpcMainInvokeEvent,
  originalAssetId: number,
  parentGenerationId: number | null,
  imagePath: string,
  prompt?: string
) => {
  try {
    const task = await generateVideo(imagePath, prompt);
    return { success: true, task_id: task.task_id, original_asset_id: originalAssetId, parent_generation_id: parentGenerationId };
  } catch (error: any) {
    console.error('阿里万相图生视频失败:', error);
    return { success: false, error: error.message };
  }
});

// 查询任务状态
ipcMain.handle('wanx-get-task-status', async (
  _event: Electron.IpcMainInvokeEvent,
  taskId: string
) => {
  try {
    const result = await getTaskStatus(taskId);
    return { success: true, ...result };
  } catch (error: any) {
    console.error('查询任务状态失败:', error);
    return { success: false, error: error.message };
  }
});

// 等待任务完成并保存到本地
ipcMain.handle('wanx-complete-task', async (
  _event: Electron.IpcMainInvokeEvent,
  taskId: string,
  originalAssetId: number,
  parentGenerationId: number | null,
  generationType: GenerationType,
  prompt?: string
) => {
  try {
    const result = await waitForTaskCompletion(taskId);
    
    // 保存文件到本地
    const stat = fs.statSync(getAppDataDir());
    const dateDir = path.join(getAppDataDir(), 'ai_generations');
    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true });
    }

    const ext = generationType === 'video' ? '.mp4' : '.png';
    const fileName = `${Date.now()}${ext}`;
    const destPath = path.join(dateDir, fileName);
    await downloadToFile(result.url, destPath);

    // 生成缩略图
    let thumbnailPath: string | null = null;
    try {
      const thumbDir = path.join(getAppDataDir(), 'ai_thumbnails');
      if (!fs.existsSync(thumbDir)) {
        fs.mkdirSync(thumbDir, { recursive: true });
      }
      const thumbExt = '.jpg';
      const thumbDestPath = path.join(thumbDir, `${Date.now()}${thumbExt}`);
      
      if (generationType === 'video') {
        // 视频缩略图需要 ffmpeg，这里简单跳过或后续完善
      } else {
        await sharp(destPath)
          .resize(300, null, { withoutEnlargement: true })
          .toFile(thumbDestPath);
        thumbnailPath = thumbDestPath;
      }
    } catch (thumbErr) {
      console.error('缩略图生成失败:', thumbErr);
    }

    // 保存到数据库
    const generationData = {
      file_path: destPath,
      file_name: fileName,
      file_size: fs.statSync(destPath).size,
      thumbnail_path: thumbnailPath,
      original_asset_id: originalAssetId,
      parent_generation_id: parentGenerationId,
      generation_type: generationType,
      prompt: prompt || null
    };

    const genId = insertAiGeneration(generationData);
    return { success: true, generation: { ...generationData, id: genId, created_at: new Date().toISOString() } };
  } catch (error: any) {
    console.error('任务完成失败:', error);
    return { success: false, error: error.message };
  }
});

// AI 图片旋转功能
ipcMain.handle('save-rotated-image', async (_event: Electron.IpcMainInvokeEvent, filePath: string, rotation: number) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '文件不存在' };
    }

    const ext = path.extname(filePath);
    const tempPath = filePath.replace(ext, `_rotated_temp${ext}`);

    await sharp(filePath)
      .rotate(rotation)
      .toFile(tempPath);

    fs.copyFileSync(tempPath, filePath);
    fs.unlinkSync(tempPath);

    return { success: true };
  } catch (e) {
    console.error('Failed to rotate image:', e);
    return { success: false, error: String(e) };
  }
});

// AI 导出功能
ipcMain.handle('export-copy-paths', async (_event: Electron.IpcMainInvokeEvent, assetIds: number[]) => {
  try {
    const allAssets = getAllAssets();
    const selectedAssets = allAssets.filter(asset => assetIds.includes(asset.id));
    
    const paths = selectedAssets.map(asset => asset.file_path);
    clipboard.writeText(paths.join('\n'));
    
    return { success: true, count: paths.length };
  } catch (e) {
    console.error('Failed to copy paths:', e);
    return { success: false, error: String(e) };
  }
});

ipcMain.handle('export-to-folder', async (_event: Electron.IpcMainInvokeEvent, assetIds: number[]) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: '选择导出文件夹'
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    const destFolder = result.filePaths[0];
    const allAssets = getAllAssets();
    const selectedAssets = allAssets.filter(asset => assetIds.includes(asset.id));

    let copied = 0;
    for (const asset of selectedAssets) {
      try {
        const destPath = path.join(destFolder, asset.file_name);
        fs.copyFileSync(asset.file_path, destPath);
        copied++;
      } catch (e) {
        console.error(`Failed to copy file ${asset.file_name}:`, e);
      }
    }

    return { success: true, count: copied };
  } catch (e) {
    console.error('Failed to export to folder:', e);
    return { success: false, error: String(e) };
  }
});

ipcMain.handle('export-json-metadata', async (_event: Electron.IpcMainInvokeEvent, assetIds: number[]) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: '素材元数据.json',
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    const allAssets = getAllAssets();
    const selectedAssets = allAssets.filter(asset => assetIds.includes(asset.id));

    const metadata = selectedAssets.map(asset => ({
      id: asset.id,
      file_name: asset.file_name,
      file_path: asset.file_path,
      file_type: asset.file_type,
      file_size: asset.file_size,
      description: asset.description,
      tags: asset.tags || [],
      created_at: asset.created_at
    }));

    fs.writeFileSync(result.filePath, JSON.stringify(metadata, null, 2), 'utf-8');

    return { success: true, count: metadata.length, path: result.filePath };
  } catch (e) {
    console.error('Failed to export metadata:', e);
    return { success: false, error: String(e) };
  }
});

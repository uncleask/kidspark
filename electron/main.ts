import { app, BrowserWindow, ipcMain, dialog, clipboard } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  getAllAssets,
  getAssetsByTag,
  getAssetsByTags,
  getAllTags,
  getOrCreateTag,
  attachTagToAsset,
  detachTagFromAsset,
  searchTags,
  deleteTag,
  deleteAsset,
  searchAssets
} from './database';
import { importFiles } from './fileHandler';
import { Asset } from '../src/types';

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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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

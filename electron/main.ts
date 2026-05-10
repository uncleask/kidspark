import { app, BrowserWindow, ipcMain, dialog, clipboard, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import {
  getAllAssets,
  getAssetsByTag,
  getAssetsByTags,
  getAssetsByType,
  getAssetsByDateRange,
  getAllTags,
  getOrCreateTag,
  attachTagToAsset,
  detachTagFromAsset,
  searchTags,
  deleteTag,
  deleteAsset,
  searchAssets,
  updateAssetDescription,
  updateAssetThumbnail,
  updateAiGenerationThumbnail,
  insertAiGeneration,
  getAiGenerationsByAssetId,
  getAiGenerationChain,
  getMainGenerationChain,
  getChildGenerations,
  deleteAiGeneration,
  setMainGeneration,
  unsetMainGeneration,
  getAppDataDir,
  updateGenerationPrompt,
  updateAssetPrompt,
  upsertAiTask,
  getActiveAiTasks,
  getAllAiTasks,
  updateAiTaskStatus,
  setAiTaskTimeout,
  getActiveAiTaskCount,
  deleteCompletedAiTasks,
  insertAiGenerationParam,
  insertAssetImportSource
} from './database';
import { importFiles } from './fileHandler';
import { importAiGenerationFile } from './fileHandler';
import {
  generateImage,
  generateVideo,
  getTaskStatus,
  waitForTaskCompletion,
  downloadToFile
} from './wanxiang';
import {
  getAllModelConfigs,
  getModelConfigsByType,
  getDefaultModelConfig,
  upsertModelConfig,
  deleteModelConfig,
  setDefaultModel,
  ModelConfig
} from './database';
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

  // 关闭窗口前确认
  mainWindow.on('close', (event) => {
    event.preventDefault();
    dialog.showMessageBox(mainWindow!, {
      type: 'warning',
      title: '确认关闭',
      message: '确定要关闭软件吗？',
      detail: '关闭后未完成的AI任务将在后台继续运行。',
      buttons: ['取消', '确认关闭'],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    }).then((result) => {
      if (result.response === 1) {
        // 用户确认关闭，销毁窗口
        mainWindow?.destroy();
        app.quit();
      }
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  createApplicationMenu();

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

function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '导入素材',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu-import-files');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '全选', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '关闭', role: 'close' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 KidSpark',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: '关于 KidSpark',
              message: 'KidSpark',
              detail: 'AI 驱动的素材管理与创作工具\n版本: 1.0.0'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

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

// 仅选择多个文件（不包含目录）
ipcMain.handle('import-files-only', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
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

// 仅选择音频和视频文件
ipcMain.handle('import-audio-files', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio & Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg'] },
      { name: 'Audio Files', extensions: ['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg'] },
      { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
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

ipcMain.handle('get-app-data-dir', () => {
  return getAppDataDir();
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

ipcMain.handle('search-assets', (_event: Electron.IpcMainInvokeEvent, query: string, fileType?: 'image' | 'video' | 'audio') => {
  return searchAssets(query, fileType);
});

ipcMain.handle('get-assets-by-type', (_event: Electron.IpcMainInvokeEvent, fileType: 'image' | 'video' | 'audio') => {
  return getAssetsByType(fileType);
});

ipcMain.handle('get-assets-by-date-range', (_event: Electron.IpcMainInvokeEvent, startDate: string, endDate: string) => {
  return getAssetsByDateRange(startDate, endDate);
});

ipcMain.handle('update-asset-description', (_event: Electron.IpcMainInvokeEvent, assetId: number, description: string) => {
  updateAssetDescription(assetId, description);
  return { success: true };
});

ipcMain.handle('update-generation-prompt', (_event: Electron.IpcMainInvokeEvent, generationId: number, prompt: string) => {
  try {
    updateGenerationPrompt(generationId, prompt);
    return { success: true };
  } catch (error: any) {
    console.error('update-generation-prompt error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-asset-prompt', (_event: Electron.IpcMainInvokeEvent, assetId: number, prompt: string) => {
  updateAssetPrompt(assetId, prompt);
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

ipcMain.handle('set-main-generation', (_event: Electron.IpcMainInvokeEvent, generationId: number, originalAssetId: number, generationType: string) => {
  setMainGeneration(generationId, originalAssetId, generationType);
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

// ==================== 模型配置 IPC ====================

ipcMain.handle('get-all-model-configs', () => {
  return getAllModelConfigs();
});

ipcMain.handle('get-model-configs-by-type', (_event: Electron.IpcMainInvokeEvent, modelType: 'image' | 'video') => {
  return getModelConfigsByType(modelType);
});

ipcMain.handle('get-default-model-config', (_event: Electron.IpcMainInvokeEvent, modelType: 'image' | 'video') => {
  return getDefaultModelConfig(modelType);
});

ipcMain.handle('upsert-model-config', (_event: Electron.IpcMainInvokeEvent, config: Omit<ModelConfig, 'id' | 'created_at' | 'updated_at'>) => {
  const id = upsertModelConfig(config);
  return { success: true, id };
});

ipcMain.handle('delete-model-config', (_event: Electron.IpcMainInvokeEvent, modelId: string) => {
  deleteModelConfig(modelId);
  return { success: true };
});

ipcMain.handle('set-default-model', (_event: Electron.IpcMainInvokeEvent, modelId: string, modelType: 'image' | 'video') => {
  setDefaultModel(modelId, modelType);
  return { success: true };
});

// ==================== AI 生成 IPC ====================

// 图生图
ipcMain.handle('wanx-generate-image', async (
  _event: Electron.IpcMainInvokeEvent,
  originalAssetId: number,
  imagePath: string,
  prompt?: string,
  modelId?: string
) => {
  try {
    // 检查活跃任务数量
    const activeCount = getActiveAiTaskCount();
    if (activeCount >= 3) {
      return {
        success: false,
        error: '最多只能同时执行3个AI生成任务，请稍后再试',
        errorCode: 'TASK_LIMIT_REACHED'
      };
    }

    let modelConfig: ModelConfig | undefined;
    if (modelId) {
      const configs = getModelConfigsByType('image');
      modelConfig = configs.find(c => c.model_id === modelId);
    }
    const task = await generateImage(imagePath, prompt, modelConfig);
    
    // 检查任务是否创建成功
    if (task.status === 'FAILED') {
      return { 
        success: false, 
        error: task.error || '任务创建失败',
        errorCode: task.errorCode,
        requestId: task.requestId
      };
    }
    
    // 保存任务到数据库
    upsertAiTask({
      task_id: task.task_id,
      task_type: 'image',
      status: 'PENDING',
      original_asset_id: originalAssetId,
      prompt: prompt || null,
      model_id: modelId || null,
      request_id: task.requestId || null
    });
    
    return { success: true, task_id: task.task_id, original_asset_id: originalAssetId };
  } catch (error: any) {
    console.error('图生图失败:', error);
    return { success: false, error: error.message };
  }
});

// 图生视频
ipcMain.handle('wanx-generate-video', async (
  _event: Electron.IpcMainInvokeEvent,
  originalAssetId: number,
  parentGenerationId: number | null,
  imagePath: string,
  prompt?: string,
  modelId?: string,
  audioPath?: string
) => {
  try {
    // 检查活跃任务数量
    const activeCount = getActiveAiTaskCount();
    if (activeCount >= 3) {
      return {
        success: false,
        error: '最多只能同时执行3个AI生成任务，请稍后再试',
        errorCode: 'TASK_LIMIT_REACHED'
      };
    }

    let modelConfig: ModelConfig | undefined;
    if (modelId) {
      const configs = getModelConfigsByType('video');
      modelConfig = configs.find(c => c.model_id === modelId);
    }
    const task = await generateVideo(imagePath, prompt, modelConfig, audioPath);
    
    // 检查任务是否创建成功
    if (task.status === 'FAILED') {
      return { 
        success: false, 
        error: task.error || '任务创建失败',
        errorCode: task.errorCode,
        requestId: task.requestId
      };
    }
    
    // 保存任务到数据库
    upsertAiTask({
      task_id: task.task_id,
      task_type: 'video',
      status: 'PENDING',
      original_asset_id: originalAssetId,
      parent_generation_id: parentGenerationId,
      prompt: prompt || null,
      model_id: modelId || null,
      request_id: task.requestId || null
    });
    
    return { success: true, task_id: task.task_id, original_asset_id: originalAssetId, parent_generation_id: parentGenerationId };
  } catch (error: any) {
    console.error('图生视频失败:', error);
    return { success: false, error: error.message };
  }
});

// 查询任务状态
ipcMain.handle('wanx-get-task-status', async (
  _event: Electron.IpcMainInvokeEvent,
  taskId: string,
  modelId?: string
) => {
  try {
    let modelConfig: ModelConfig | undefined;
    if (modelId) {
      const allConfigs = getAllModelConfigs();
      modelConfig = allConfigs.find(c => c.model_id === modelId);
    }
    const result = await getTaskStatus(taskId, modelConfig);
    return { success: true, ...result };
  } catch (error: any) {
    console.error('查询任务状态失败:', error);
    return { success: false, error: error.message };
  }
});

// 已处理过的任务ID集合，防止重复保存
const completedTasks = new Set<string>();

// 等待任务完成并保存到本地
ipcMain.handle('wanx-complete-task', async (
  _event: Electron.IpcMainInvokeEvent,
  taskId: string,
  originalAssetId: number,
  parentGenerationId: number | null,
  generationType: GenerationType,
  prompt?: string,
  modelId?: string
) => {
  // 防止重复处理同一个任务
  if (completedTasks.has(taskId)) {
    console.log(`任务 ${taskId} 已处理过，跳过`);
    return { success: true, message: '任务已处理过' };
  }
  completedTasks.add(taskId);

  try {
    let modelConfig: ModelConfig | undefined;
    if (modelId) {
      const allConfigs = getAllModelConfigs();
      modelConfig = allConfigs.find(c => c.model_id === modelId);
    }
    const result = await waitForTaskCompletion(taskId, modelConfig);
    
    // 更新任务状态为成功
    updateAiTaskStatus(taskId, 'SUCCEEDED');
    
    // 保存文件到本地
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
    
    // 记录AI生成参数
    try {
      const modelConfig = modelId ? getAllModelConfigs().find(c => c.model_id === modelId) : undefined;
      insertAiGenerationParam({
        generation_id: genId,
        task_id: taskId,
        model_id: modelId || null,
        model_name: modelConfig?.model_name || null,
        parameters: modelConfig?.parameters || '{}',
        prompt: prompt || null,
        generation_type: generationType
      });
    } catch (paramErr) {
      console.error('记录AI生成参数失败:', paramErr);
    }
    
    return { success: true, generation: { ...generationData, id: genId, created_at: new Date().toISOString() } };
  } catch (error: any) {
    console.error('任务完成失败:', error);
    // 更新任务状态为失败
    updateAiTaskStatus(taskId, 'FAILED', error.message);
    return { success: false, error: error.message };
  }
});

// ==================== AI 任务持久化 IPC ====================

ipcMain.handle('upsert-ai-task', (_event: Electron.IpcMainInvokeEvent, task: any) => {
  try {
    const id = upsertAiTask(task);
    return { success: true, id };
  } catch (error: any) {
    console.error('保存AI任务失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-active-ai-tasks', () => {
  try {
    const tasks = getActiveAiTasks();
    return { success: true, tasks };
  } catch (error: any) {
    console.error('获取活跃AI任务失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-all-ai-tasks', (_event: Electron.IpcMainInvokeEvent, limit?: number) => {
  try {
    const tasks = getAllAiTasks(limit || 50);
    return { success: true, tasks };
  } catch (error: any) {
    console.error('获取AI任务失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-ai-task-status', (_event: Electron.IpcMainInvokeEvent, taskId: string, status: string, error?: string, errorCode?: string) => {
  try {
    updateAiTaskStatus(taskId, status, error, errorCode);
    return { success: true };
  } catch (error: any) {
    console.error('更新AI任务状态失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-ai-task-timeout', (_event: Electron.IpcMainInvokeEvent, taskId: string, isTimeout: boolean) => {
  try {
    setAiTaskTimeout(taskId, isTimeout);
    return { success: true };
  } catch (error: any) {
    console.error('设置AI任务超时失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-active-ai-task-count', () => {
  try {
    const count = getActiveAiTaskCount();
    return { success: true, count };
  } catch (error: any) {
    console.error('获取活跃AI任务数量失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-completed-ai-tasks', () => {
  try {
    deleteCompletedAiTasks();
    return { success: true };
  } catch (error: any) {
    console.error('删除已完成AI任务失败:', error);
    return { success: false, error: error.message };
  }
});

// AI 图片旋转功能
ipcMain.handle('save-rotated-image', async (_event: Electron.IpcMainInvokeEvent, filePath: string, rotation: number, assetId?: number, generationId?: number) => {
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

    // 重新生成缩略图
    const thumbDir = path.join(getAppDataDir(), 'thumbnails');
    const baseName = path.parse(filePath).name;
    const thumbPath = path.join(thumbDir, `${baseName}.jpg`);
    
    try {
      if (!fs.existsSync(thumbDir)) {
        fs.mkdirSync(thumbDir, { recursive: true });
      }
      await sharp(filePath)
        .resize(300, null, { withoutEnlargement: true })
        .toFile(thumbPath);
      
      // 更新数据库中的缩略图路径
      if (assetId) {
        updateAssetThumbnail(assetId, thumbPath);
      } else if (generationId) {
        updateAiGenerationThumbnail(generationId, thumbPath);
      }
    } catch (thumbErr) {
      console.error('缩略图重新生成失败:', thumbErr);
    }

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

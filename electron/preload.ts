import { contextBridge, ipcRenderer } from 'electron';
import { Asset, Tag, AiGeneration } from '../src/types';

contextBridge.exposeInMainWorld('electronAPI', {
  importFiles: () => ipcRenderer.invoke('import-files') as Promise<number[]>,
  getAllAssets: () => ipcRenderer.invoke('get-all-assets') as Promise<Asset[]>,
  getAssetsByTag: (tagId: number) => ipcRenderer.invoke('get-assets-by-tag', tagId) as Promise<Asset[]>,
  getAssetsByTags: (tagIds: number[]) => ipcRenderer.invoke('get-assets-by-tags', tagIds) as Promise<Asset[]>,
  getAllTags: () => ipcRenderer.invoke('get-all-tags') as Promise<Tag[]>,
  addTagToAsset: (assetId: number, tagName: string) =>
    ipcRenderer.invoke('add-tag-to-asset', assetId, tagName) as Promise<{ success: boolean; tagId: number }>,
  removeTagFromAsset: (assetId: number, tagId: number) =>
    ipcRenderer.invoke('remove-tag-from-asset', assetId, tagId) as Promise<{ success: boolean }>,
  searchTags: (query: string) => ipcRenderer.invoke('search-tags', query) as Promise<Tag[]>,
  deleteTag: (tagId: number) => ipcRenderer.invoke('delete-tag', tagId) as Promise<{ success: boolean }>,
  deleteAsset: (assetId: number) => ipcRenderer.invoke('delete-asset', assetId) as Promise<{ success: boolean }>,
  searchAssets: (query: string) => ipcRenderer.invoke('search-assets', query) as Promise<Asset[]>,
  getAssetsByType: (fileType: 'image' | 'video' | 'audio') => ipcRenderer.invoke('get-assets-by-type', fileType) as Promise<Asset[]>,
  updateAssetDescription: (assetId: number, description: string) =>
    ipcRenderer.invoke('update-asset-description', assetId, description) as Promise<{ success: boolean }>,
  updateAssetPrompt: (assetId: number, prompt: string) =>
    ipcRenderer.invoke('update-asset-prompt', assetId, prompt) as Promise<{ success: boolean }>,
  updateGenerationPrompt: (generationId: number, prompt: string) =>
    ipcRenderer.invoke('update-generation-prompt', generationId, prompt) as Promise<{ success: boolean }>,
  exportCopyPaths: (assetIds: number[]) => ipcRenderer.invoke('export-copy-paths', assetIds) as Promise<{ success: boolean; count?: number; error?: string }>,
  exportToFolder: (assetIds: number[]) => ipcRenderer.invoke('export-to-folder', assetIds) as Promise<{ success: boolean; canceled?: boolean; count?: number; error?: string }>,
  exportJsonMetadata: (assetIds: number[]) => ipcRenderer.invoke('export-json-metadata', assetIds) as Promise<{ success: boolean; canceled?: boolean; count?: number; path?: string; error?: string }>,
  saveRotatedImage: (filePath: string, rotation: number, assetId?: number, generationId?: number) =>
    ipcRenderer.invoke('save-rotated-image', filePath, rotation, assetId, generationId) as Promise<{ success: boolean; error?: string }>,

  // AI 生成相关
  saveAiGeneration: (generation: Omit<AiGeneration, 'id' | 'created_at'>) =>
    ipcRenderer.invoke('save-ai-generation', generation) as Promise<{ success: boolean; id: number }>,
  getAiGenerationsByAsset: (assetId: number) =>
    ipcRenderer.invoke('get-ai-generations-by-asset', assetId) as Promise<AiGeneration[]>,
  getAiGenerationChain: (generationId: number) =>
    ipcRenderer.invoke('get-ai-generation-chain', generationId) as Promise<any>,
  getMainGenerationChain: (assetId: number, targetGenerationId?: number) =>
    ipcRenderer.invoke('get-main-generation-chain', assetId, targetGenerationId) as Promise<{ originalAsset: any; chain: any[] } | null>,
  getChildGenerations: (generationId: number) =>
    ipcRenderer.invoke('get-child-generations', generationId) as Promise<any[]>,
  deleteAiGeneration: (generationId: number) =>
    ipcRenderer.invoke('delete-ai-generation', generationId) as Promise<{ success: boolean }>,
  setMainGeneration: (generationId: number, originalAssetId: number) =>
    ipcRenderer.invoke('set-main-generation', generationId, originalAssetId) as Promise<{ success: boolean }>,
  unsetMainGeneration: (generationId: number) =>
    ipcRenderer.invoke('unset-main-generation', generationId) as Promise<{ success: boolean }>,
  importAiGeneration: (
    originalAssetId: number,
    parentGenerationId: number | null,
    generationType: string,
    prompt?: string
  ) => ipcRenderer.invoke('import-ai-generation', originalAssetId, parentGenerationId, generationType, prompt) as Promise<{ success: boolean; id?: number; canceled?: boolean; error?: string; generation?: AiGeneration }>,
  // 模型配置
  getAllModelConfigs: () => ipcRenderer.invoke('get-all-model-configs') as Promise<any[]>,
  getModelConfigsByType: (modelType: 'image' | 'video') => ipcRenderer.invoke('get-model-configs-by-type', modelType) as Promise<any[]>,
  getDefaultModelConfig: (modelType: 'image' | 'video') => ipcRenderer.invoke('get-default-model-config', modelType) as Promise<any | undefined>,
  upsertModelConfig: (config: any) => ipcRenderer.invoke('upsert-model-config', config) as Promise<{ success: boolean; id: number }>,
  deleteModelConfig: (modelId: string) => ipcRenderer.invoke('delete-model-config', modelId) as Promise<{ success: boolean }>,
  setDefaultModel: (modelId: string, modelType: 'image' | 'video') => ipcRenderer.invoke('set-default-model', modelId, modelType) as Promise<{ success: boolean }>,

  // AI 生成
  wanxGenerateImage: (originalAssetId: number, imagePath: string, prompt?: string, modelId?: string) => 
    ipcRenderer.invoke('wanx-generate-image', originalAssetId, imagePath, prompt, modelId) as Promise<{ success: boolean; task_id?: string; error?: string }>,
  wanxGenerateVideo: (originalAssetId: number, parentGenerationId: number | null, imagePath: string, prompt?: string, modelId?: string) => 
    ipcRenderer.invoke('wanx-generate-video', originalAssetId, parentGenerationId, imagePath, prompt, modelId) as Promise<{ success: boolean; task_id?: string; error?: string }>,
  wanxGetTaskStatus: (taskId: string, modelId?: string) => 
    ipcRenderer.invoke('wanx-get-task-status', taskId, modelId) as Promise<{ success: boolean; status?: string; url?: string; error?: string }>,
  wanxCompleteTask: (
    taskId: string,
    originalAssetId: number,
    parentGenerationId: number | null,
    generationType: string,
    prompt?: string,
    modelId?: string
  ) => ipcRenderer.invoke('wanx-complete-task', taskId, originalAssetId, parentGenerationId, generationType, prompt, modelId) as Promise<{ success: boolean; generation?: AiGeneration; error?: string }>,
  getAppDataDir: () => ipcRenderer.invoke('get-app-data-dir') as Promise<string>
});

declare global {
  interface Window {
    electronAPI: {
      importFiles: () => Promise<number[]>;
      getAllAssets: () => Promise<Asset[]>;
      getAssetsByTag: (tagId: number) => Promise<Asset[]>;
      getAssetsByTags: (tagIds: number[]) => Promise<Asset[]>;
      getAllTags: () => Promise<Tag[]>;
      addTagToAsset: (assetId: number, tagName: string) => Promise<{ success: boolean; tagId: number }>;
      removeTagFromAsset: (assetId: number, tagId: number) => Promise<{ success: boolean }>;
      searchTags: (query: string) => Promise<Tag[]>;
      deleteTag: (tagId: number) => Promise<{ success: boolean }>;
      deleteAsset: (assetId: number) => Promise<{ success: boolean }>;
      searchAssets: (query: string) => Promise<Asset[]>;
      getAssetsByType: (fileType: 'image' | 'video' | 'audio') => Promise<Asset[]>;
      updateAssetDescription: (assetId: number, description: string) => Promise<{ success: boolean }>;
      updateAssetPrompt: (assetId: number, prompt: string) => Promise<{ success: boolean }>;
      updateGenerationPrompt: (generationId: number, prompt: string) => Promise<{ success: boolean }>;
      exportCopyPaths: (assetIds: number[]) => Promise<{ success: boolean; count?: number; error?: string }>;
      exportToFolder: (assetIds: number[]) => Promise<{ success: boolean; canceled?: boolean; count?: number; error?: string }>;
      exportJsonMetadata: (assetIds: number[]) => Promise<{ success: boolean; canceled?: boolean; count?: number; path?: string; error?: string }>;
      saveRotatedImage: (filePath: string, rotation: number, assetId?: number, generationId?: number) => Promise<{ success: boolean; error?: string }>;

      saveAiGeneration: (generation: Omit<AiGeneration, 'id' | 'created_at'>) => Promise<{ success: boolean; id: number }>;
      getAiGenerationsByAsset: (assetId: number) => Promise<AiGeneration[]>;
      getAiGenerationChain: (generationId: number) => Promise<any>;
      getMainGenerationChain: (assetId: number, targetGenerationId?: number) => Promise<{ originalAsset: any; chain: any[] } | null>;
      getChildGenerations: (generationId: number) => Promise<any[]>;
      deleteAiGeneration: (generationId: number) => Promise<{ success: boolean }>,
      setMainGeneration: (generationId: number, originalAssetId: number) => Promise<{ success: boolean }>,
      unsetMainGeneration: (generationId: number) => Promise<{ success: boolean }>,
      importAiGeneration: (
        originalAssetId: number,
        parentGenerationId: number | null,
        generationType: string,
        prompt?: string
      ) => Promise<{ success: boolean; id?: number; canceled?: boolean; error?: string; generation?: AiGeneration }>,
      getAllModelConfigs: () => Promise<any[]>,
      getModelConfigsByType: (modelType: 'image' | 'video') => Promise<any[]>,
      getDefaultModelConfig: (modelType: 'image' | 'video') => Promise<any | undefined>,
      upsertModelConfig: (config: any) => Promise<{ success: boolean; id: number }>,
      deleteModelConfig: (modelId: string) => Promise<{ success: boolean }>,
      setDefaultModel: (modelId: string, modelType: 'image' | 'video') => Promise<{ success: boolean }>,

      wanxGenerateImage: (originalAssetId: number, imagePath: string, prompt?: string, modelId?: string) => 
        Promise<{ success: boolean; task_id?: string; error?: string }>,
      wanxGenerateVideo: (originalAssetId: number, parentGenerationId: number | null, imagePath: string, prompt?: string, modelId?: string) => 
        Promise<{ success: boolean; task_id?: string; error?: string }>,
      wanxGetTaskStatus: (taskId: string, modelId?: string) => 
        Promise<{ success: boolean; status?: string; url?: string; error?: string }>,
      wanxCompleteTask: (
        taskId: string,
        originalAssetId: number,
        parentGenerationId: number | null,
        generationType: string,
        prompt?: string,
        modelId?: string
      ) => Promise<{ success: boolean; generation?: AiGeneration; error?: string }>,
      getAppDataDir: () => Promise<string>,
    };
  }
}

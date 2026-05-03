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
  exportCopyPaths: (assetIds: number[]) => ipcRenderer.invoke('export-copy-paths', assetIds) as Promise<{ success: boolean; count?: number; error?: string }>,
  exportToFolder: (assetIds: number[]) => ipcRenderer.invoke('export-to-folder', assetIds) as Promise<{ success: boolean; canceled?: boolean; count?: number; error?: string }>,
  exportJsonMetadata: (assetIds: number[]) => ipcRenderer.invoke('export-json-metadata', assetIds) as Promise<{ success: boolean; canceled?: boolean; count?: number; path?: string; error?: string }>,
  saveRotatedImage: (filePath: string, rotation: number) =>
    ipcRenderer.invoke('save-rotated-image', filePath, rotation) as Promise<{ success: boolean; error?: string }>,

  // AI 生成相关
  saveAiGeneration: (generation: Omit<AiGeneration, 'id' | 'created_at'>) =>
    ipcRenderer.invoke('save-ai-generation', generation) as Promise<{ success: boolean; id: number }>,
  getAiGenerationsByAsset: (assetId: number) =>
    ipcRenderer.invoke('get-ai-generations-by-asset', assetId) as Promise<AiGeneration[]>,
  getAiGenerationChain: (generationId: number) =>
    ipcRenderer.invoke('get-ai-generation-chain', generationId) as Promise<any>,
  deleteAiGeneration: (generationId: number) =>
    ipcRenderer.invoke('delete-ai-generation', generationId) as Promise<{ success: boolean }>,
  importAiGeneration: (
    originalAssetId: number,
    parentGenerationId: number | null,
    generationType: string,
    prompt?: string
  ) => ipcRenderer.invoke('import-ai-generation', originalAssetId, parentGenerationId, generationType, prompt) as Promise<{ success: boolean; id?: number; canceled?: boolean; error?: string; generation?: AiGeneration }>,
  setWanXConfig: (apiKey: string) => ipcRenderer.invoke('set-wanx-config', apiKey) as Promise<{ success: boolean }>,
  getWanXConfig: () => ipcRenderer.invoke('get-wanx-config') as Promise<{ success: boolean; hasApiKey: boolean }>,
  wanxGenerateImage: (originalAssetId: number, imagePath: string, prompt?: string) => 
    ipcRenderer.invoke('wanx-generate-image', originalAssetId, imagePath, prompt) as Promise<{ success: boolean; task_id?: string; error?: string }>,
  wanxGenerateVideo: (originalAssetId: number, parentGenerationId: number | null, imagePath: string, prompt?: string) => 
    ipcRenderer.invoke('wanx-generate-video', originalAssetId, parentGenerationId, imagePath, prompt) as Promise<{ success: boolean; task_id?: string; error?: string }>,
  wanxGetTaskStatus: (taskId: string) => 
    ipcRenderer.invoke('wanx-get-task-status', taskId) as Promise<{ success: boolean; status?: string; url?: string; error?: string }>,
  wanxCompleteTask: (
    taskId: string,
    originalAssetId: number,
    parentGenerationId: number | null,
    generationType: string,
    prompt?: string
  ) => ipcRenderer.invoke('wanx-complete-task', taskId, originalAssetId, parentGenerationId, generationType, prompt) as Promise<{ success: boolean; generation?: AiGeneration; error?: string }>
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
      exportCopyPaths: (assetIds: number[]) => Promise<{ success: boolean; count?: number; error?: string }>;
      exportToFolder: (assetIds: number[]) => Promise<{ success: boolean; canceled?: boolean; count?: number; error?: string }>;
      exportJsonMetadata: (assetIds: number[]) => Promise<{ success: boolean; canceled?: boolean; count?: number; path?: string; error?: string }>;
      saveRotatedImage: (filePath: string, rotation: number) => Promise<{ success: boolean; error?: string }>;

      saveAiGeneration: (generation: Omit<AiGeneration, 'id' | 'created_at'>) => Promise<{ success: boolean; id: number }>;
      getAiGenerationsByAsset: (assetId: number) => Promise<AiGeneration[]>;
      getAiGenerationChain: (generationId: number) => Promise<any>;
      deleteAiGeneration: (generationId: number) => Promise<{ success: boolean }>,
      importAiGeneration: (
        originalAssetId: number,
        parentGenerationId: number | null,
        generationType: string,
        prompt?: string
      ) => Promise<{ success: boolean; id?: number; canceled?: boolean; error?: string; generation?: AiGeneration }>,
      setWanXConfig: (apiKey: string) => Promise<{ success: boolean }>,
      getWanXConfig: () => Promise<{ success: boolean; hasApiKey: boolean }>,
      wanxGenerateImage: (originalAssetId: number, imagePath: string, prompt?: string) => 
        Promise<{ success: boolean; task_id?: string; error?: string }>,
      wanxGenerateVideo: (originalAssetId: number, parentGenerationId: number | null, imagePath: string, prompt?: string) => 
        Promise<{ success: boolean; task_id?: string; error?: string }>,
      wanxGetTaskStatus: (taskId: string) => 
        Promise<{ success: boolean; status?: string; url?: string; error?: string }>,
      wanxCompleteTask: (
        taskId: string,
        originalAssetId: number,
        parentGenerationId: number | null,
        generationType: string,
        prompt?: string
      ) => Promise<{ success: boolean; generation?: AiGeneration; error?: string }>,
    };
  }
}

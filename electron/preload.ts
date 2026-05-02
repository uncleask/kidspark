import { contextBridge, ipcRenderer } from 'electron';
import { Asset, Tag } from '../src/types';

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
  exportCopyPaths: (assetIds: number[]) => ipcRenderer.invoke('export-copy-paths', assetIds) as Promise<{ success: boolean; count?: number; error?: string }>,
  exportToFolder: (assetIds: number[]) => ipcRenderer.invoke('export-to-folder', assetIds) as Promise<{ success: boolean; canceled?: boolean; count?: number; error?: string }>,
  exportJsonMetadata: (assetIds: number[]) => ipcRenderer.invoke('export-json-metadata', assetIds) as Promise<{ success: boolean; canceled?: boolean; count?: number; path?: string; error?: string }>,
  saveRotatedImage: (filePath: string, rotation: number) =>
    ipcRenderer.invoke('save-rotated-image', filePath, rotation) as Promise<{ success: boolean; error?: string }>
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
      exportCopyPaths: (assetIds: number[]) => Promise<{ success: boolean; count?: number; error?: string }>;
      exportToFolder: (assetIds: number[]) => Promise<{ success: boolean; canceled?: boolean; count?: number; error?: string }>;
      exportJsonMetadata: (assetIds: number[]) => Promise<{ success: boolean; canceled?: boolean; count?: number; path?: string; error?: string }>;
      saveRotatedImage: (filePath: string, rotation: number) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

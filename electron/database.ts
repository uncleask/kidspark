import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { Asset, Tag, AiGeneration, GenerationType } from '../src/types';

// 获取用户文档目录
const DOCUMENTS_DIR = path.join(os.homedir(), 'Documents');
const APP_DATA_DIR = path.join(DOCUMENTS_DIR, 'KidSpark');
const DB_PATH = path.join(APP_DATA_DIR, 'library.db');

export const getAppDataDir = () => APP_DATA_DIR;

export function initDatabase() {
  if (!fs.existsSync(APP_DATA_DIR)) {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL UNIQUE,
      file_type TEXT NOT NULL CHECK(file_type IN ('image', 'video', 'audio')),
      thumbnail_path TEXT,
      file_size INTEGER NOT NULL,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag_name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS asset_tags (
      asset_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (asset_id, tag_id),
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    -- AI 生成内容表
    CREATE TABLE IF NOT EXISTS ai_generations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_asset_id INTEGER NOT NULL,
      parent_generation_id INTEGER,
      generation_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      thumbnail_path TEXT,
      prompt TEXT,
      is_deleted INTEGER DEFAULT 0,
      is_main INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (original_asset_id) REFERENCES assets(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_generation_id) REFERENCES ai_generations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(tag_name);
    CREATE INDEX IF NOT EXISTS idx_ai_generations_asset_id ON ai_generations(original_asset_id);
    CREATE INDEX IF NOT EXISTS idx_ai_generations_parent_id ON ai_generations(parent_generation_id);
  `);

  // 迁移：为旧数据库添加缺失字段
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(ai_generations)`).all() as any[];
    const columns = tableInfo.map(col => col.name);
    if (!columns.includes('is_deleted')) {
      db.exec(`ALTER TABLE ai_generations ADD COLUMN is_deleted INTEGER DEFAULT 0`);
    }
    if (!columns.includes('is_main')) {
      db.exec(`ALTER TABLE ai_generations ADD COLUMN is_main INTEGER DEFAULT 0`);
    }
  } catch (e) {
    console.error('Database migration failed:', e);
  }

  // 迁移：重建 ai_generations 表以移除旧的 CHECK 约束
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(ai_generations)`).all() as any[];
    const hasCheckConstraint = tableInfo.some((col: any) => col.name === 'generation_type' && col.dflt_value !== null);
    const hasIsDeleted = tableInfo.some((col: any) => col.name === 'is_deleted');
    // 如果缺少 is_deleted 字段，说明是旧表结构，需要重建
    if (!hasIsDeleted) {
      const oldData = db.prepare(`SELECT * FROM ai_generations`).all();
      db.exec(`
        DROP TABLE ai_generations;
        CREATE TABLE ai_generations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          original_asset_id INTEGER NOT NULL,
          parent_generation_id INTEGER,
          generation_type TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          thumbnail_path TEXT,
          prompt TEXT,
          is_deleted INTEGER DEFAULT 0,
          is_main INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (original_asset_id) REFERENCES assets(id) ON DELETE CASCADE,
          FOREIGN KEY (parent_generation_id) REFERENCES ai_generations(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_ai_generations_asset_id ON ai_generations(original_asset_id);
        CREATE INDEX idx_ai_generations_parent_id ON ai_generations(parent_generation_id);
      `);
      if (oldData && (oldData as any[]).length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO ai_generations (id, original_asset_id, parent_generation_id, generation_type, file_path, file_name, file_size, thumbnail_path, prompt, is_deleted, is_main, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const row of oldData as any[]) {
          insertStmt.run(
            row.id, row.original_asset_id, row.parent_generation_id, row.generation_type,
            row.file_path, row.file_name, row.file_size, row.thumbnail_path, row.prompt,
            row.is_deleted || 0, row.is_main || 0, row.created_at
          );
        }
      }
    }
  } catch (e) {
    console.error('Database table rebuild failed:', e);
  }

  return db;
}

const db = initDatabase();

export function insertAsset(asset: Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'tags'>): number {
  const stmt = db.prepare(`
    INSERT INTO assets (file_name, file_path, file_type, thumbnail_path, file_size, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(asset.file_name, asset.file_path, asset.file_type, asset.thumbnail_path, asset.file_size, asset.description || '');
  return result.lastInsertRowid as number;
}

export function getAllAssets(): Asset[] {
  const stmt = db.prepare(`
    SELECT a.*, GROUP_CONCAT(t.id || ':' || t.tag_name) as tags_str,
      EXISTS(SELECT 1 FROM ai_generations ag WHERE ag.original_asset_id = a.id AND ag.generation_type IN ('colored', 'adapted') AND ag.is_deleted = 0) as has_colored,
      EXISTS(SELECT 1 FROM ai_generations ag WHERE ag.original_asset_id = a.id AND ag.generation_type = 'video' AND ag.is_deleted = 0) as has_video
    FROM assets a
    LEFT JOIN asset_tags at ON a.id = at.asset_id
    LEFT JOIN tags t ON at.tag_id = t.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `);
  const rows = stmt.all() as any[];
  return rows.map(row => ({
    ...row,
    has_colored: !!row.has_colored,
    has_video: !!row.has_video,
    tags: row.tags_str ? row.tags_str.split(',').map((t: string) => {
      const [id, tag_name] = t.split(':');
      return { id: parseInt(id), tag_name };
    }) : []
  }));
}

export function getAssetsByTag(tagId: number): Asset[] {
  const stmt = db.prepare(`
    SELECT a.*, GROUP_CONCAT(t.id || ':' || t.tag_name) as tags_str,
      EXISTS(SELECT 1 FROM ai_generations ag WHERE ag.original_asset_id = a.id AND ag.generation_type IN ('colored', 'adapted') AND ag.is_deleted = 0) as has_colored,
      EXISTS(SELECT 1 FROM ai_generations ag WHERE ag.original_asset_id = a.id AND ag.generation_type = 'video' AND ag.is_deleted = 0) as has_video
    FROM assets a
    INNER JOIN asset_tags at ON a.id = at.asset_id
    LEFT JOIN asset_tags at2 ON a.id = at2.asset_id
    LEFT JOIN tags t ON at2.tag_id = t.id
    WHERE at.tag_id = ?
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `);
  const rows = stmt.all(tagId) as any[];
  return rows.map(row => ({
    ...row,
    has_colored: !!row.has_colored,
    has_video: !!row.has_video,
    tags: row.tags_str ? row.tags_str.split(',').map((t: string) => {
      const [id, tag_name] = t.split(':');
      return { id: parseInt(id), tag_name };
    }) : []
  }));
}

export function getAllTags(): Tag[] {
  const stmt = db.prepare('SELECT * FROM tags ORDER BY tag_name');
  return stmt.all() as Tag[];
}

export function insertTag(tagName: string): number {
  const stmt = db.prepare('INSERT INTO tags (tag_name) VALUES (?)');
  const result = stmt.run(tagName);
  return result.lastInsertRowid as number;
}

export function getOrCreateTag(tagName: string): number {
  const existing = db.prepare('SELECT id FROM tags WHERE tag_name = ?').get(tagName) as Tag | undefined;
  if (existing) {
    return existing.id;
  }
  return insertTag(tagName);
}

export function attachTagToAsset(assetId: number, tagId: number) {
  const stmt = db.prepare('INSERT OR IGNORE INTO asset_tags (asset_id, tag_id) VALUES (?, ?)');
  stmt.run(assetId, tagId);
}

export function detachTagFromAsset(assetId: number, tagId: number) {
  const stmt = db.prepare('DELETE FROM asset_tags WHERE asset_id = ? AND tag_id = ?');
  stmt.run(assetId, tagId);
}

export function searchTags(query: string): Tag[] {
  const stmt = db.prepare('SELECT * FROM tags WHERE tag_name LIKE ? ORDER BY tag_name');
  return stmt.all(`%${query}%`) as Tag[];
}

export function deleteTag(tagId: number) {
  // 先删除关联记录
  const deleteLinksStmt = db.prepare('DELETE FROM asset_tags WHERE tag_id = ?');
  deleteLinksStmt.run(tagId);
  // 再删除标签本身
  const stmt = db.prepare('DELETE FROM tags WHERE id = ?');
  stmt.run(tagId);
}

export function deleteAsset(assetId: number) {
  // 先获取素材信息，用于删除物理文件
  const assetStmt = db.prepare('SELECT file_path, thumbnail_path FROM assets WHERE id = ?');
  const asset = assetStmt.get(assetId) as { file_path: string; thumbnail_path: string | null } | undefined;

  // 获取关联的 AI 生成记录，用于删除物理文件
  const generationsStmt = db.prepare('SELECT file_path, thumbnail_path FROM ai_generations WHERE original_asset_id = ?');
  const generations = generationsStmt.all(assetId) as { file_path: string; thumbnail_path: string | null }[];

  // 删除 AI 生成记录的物理文件
  for (const gen of generations) {
    try {
      if (fs.existsSync(gen.file_path)) {
        fs.unlinkSync(gen.file_path);
      }
      if (gen.thumbnail_path && fs.existsSync(gen.thumbnail_path)) {
        fs.unlinkSync(gen.thumbnail_path);
      }
    } catch (e) {
      console.error('Failed to delete generation file:', e);
    }
  }

  // 删除素材的物理文件
  if (asset) {
    try {
      if (fs.existsSync(asset.file_path)) {
        fs.unlinkSync(asset.file_path);
      }
      if (asset.thumbnail_path && fs.existsSync(asset.thumbnail_path)) {
        fs.unlinkSync(asset.thumbnail_path);
      }
    } catch (e) {
      console.error('Failed to delete asset file:', e);
    }
  }

  // 删除数据库记录
  const deleteGenerationsStmt = db.prepare('DELETE FROM ai_generations WHERE original_asset_id = ?');
  deleteGenerationsStmt.run(assetId);
  const deleteTagsStmt = db.prepare('DELETE FROM asset_tags WHERE asset_id = ?');
  deleteTagsStmt.run(assetId);
  const stmt = db.prepare('DELETE FROM assets WHERE id = ?');
  stmt.run(assetId);
}

export function updateAssetDescription(assetId: number, description: string) {
  const stmt = db.prepare('UPDATE assets SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(description, assetId);
}

export function updateAssetThumbnail(assetId: number, thumbnailPath: string | null) {
  const stmt = db.prepare('UPDATE assets SET thumbnail_path = ? WHERE id = ?');
  stmt.run(thumbnailPath, assetId);
}

export function updateAiGenerationThumbnail(generationId: number, thumbnailPath: string | null) {
  const stmt = db.prepare('UPDATE ai_generations SET thumbnail_path = ? WHERE id = ?');
  stmt.run(thumbnailPath, generationId);
}

export function getAssetsByTags(tagIds: number[]): Asset[] {
  if (tagIds.length === 0) {
    return getAllAssets();
  }

  const placeholders = tagIds.map(() => '?').join(',');
  // 使用子查询确保只统计 asset_tags 中的标签数量
  const stmt = db.prepare(`
    SELECT a.*, GROUP_CONCAT(DISTINCT t.id || ':' || t.tag_name) as tags_str,
      EXISTS(SELECT 1 FROM ai_generations ag WHERE ag.original_asset_id = a.id AND ag.generation_type IN ('colored', 'adapted') AND ag.is_deleted = 0) as has_colored,
      EXISTS(SELECT 1 FROM ai_generations ag WHERE ag.original_asset_id = a.id AND ag.generation_type = 'video' AND ag.is_deleted = 0) as has_video
    FROM assets a
    INNER JOIN (
      SELECT asset_id
      FROM asset_tags
      WHERE tag_id IN (${placeholders})
      GROUP BY asset_id
      HAVING COUNT(DISTINCT tag_id) = ${tagIds.length}
    ) matched ON a.id = matched.asset_id
    LEFT JOIN asset_tags at ON a.id = at.asset_id
    LEFT JOIN tags t ON at.tag_id = t.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `);
  const rows = stmt.all(...tagIds) as any[];
  return rows.map(row => ({
    ...row,
    has_colored: !!row.has_colored,
    has_video: !!row.has_video,
    tags: row.tags_str ? row.tags_str.split(',').map((t: string) => {
      const [id, tag_name] = t.split(':');
      return { id: parseInt(id), tag_name };
    }) : []
  }));
}

/**
 * 搜索素材（按文件名、标签和描述搜索）
 */
export function searchAssets(query: string): Asset[] {
  const normalizedQuery = query.toLowerCase();
  const stmt = db.prepare(`
    SELECT DISTINCT a.*, GROUP_CONCAT(t.id || ':' || t.tag_name) as tags_str,
      EXISTS(SELECT 1 FROM ai_generations ag WHERE ag.original_asset_id = a.id AND ag.generation_type IN ('colored', 'adapted') AND ag.is_deleted = 0) as has_colored,
      EXISTS(SELECT 1 FROM ai_generations ag WHERE ag.original_asset_id = a.id AND ag.generation_type = 'video' AND ag.is_deleted = 0) as has_video
    FROM assets a
    LEFT JOIN asset_tags at ON a.id = at.asset_id
    LEFT JOIN tags t ON at.tag_id = t.id
    WHERE LOWER(a.file_name) LIKE ? OR LOWER(t.tag_name) LIKE ? OR LOWER(a.description) LIKE ?
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `);
  const rows = stmt.all(`%${normalizedQuery}%`, `%${normalizedQuery}%`, `%${normalizedQuery}%`) as any[];
  return rows.map(row => ({
    ...row,
    has_colored: !!row.has_colored,
    has_video: !!row.has_video,
    tags: row.tags_str ? row.tags_str.split(',').map((t: string) => {
      const [id, tag_name] = t.split(':');
      return { id: parseInt(id), tag_name };
    }) : []
  }));
}

export function getAssetsByType(fileType: 'image' | 'video' | 'audio'): Asset[] {
  const stmt = db.prepare(`
    SELECT a.*, GROUP_CONCAT(t.id || ':' || t.tag_name) as tags_str,
      EXISTS(SELECT 1 FROM ai_generations ag WHERE ag.original_asset_id = a.id AND ag.generation_type IN ('colored', 'adapted') AND ag.is_deleted = 0) as has_colored,
      EXISTS(SELECT 1 FROM ai_generations ag WHERE ag.original_asset_id = a.id AND ag.generation_type = 'video' AND ag.is_deleted = 0) as has_video
    FROM assets a
    LEFT JOIN asset_tags at ON a.id = at.asset_id
    LEFT JOIN tags t ON at.tag_id = t.id
    WHERE a.file_type = ?
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `);
  const rows = stmt.all(fileType) as any[];
  return rows.map(row => ({
    ...row,
    has_colored: !!row.has_colored,
    has_video: !!row.has_video,
    tags: row.tags_str ? row.tags_str.split(',').map((t: string) => {
      const [id, tag_name] = t.split(':');
      return { id: parseInt(id), tag_name };
    }) : []
  }));
}

/**
 * 检查文件是否已存在于数据库中
 */
export function checkAssetExists(filePath: string): boolean {
  const stmt = db.prepare('SELECT id FROM assets WHERE file_path = ?');
  const result = stmt.get(filePath);
  return !!result;
}

export function checkAssetExistsByName(fileName: string): boolean {
  const stmt = db.prepare('SELECT id FROM assets WHERE file_name = ?');
  const result = stmt.get(fileName);
  return !!result;
}

// ==================== AI 生成相关功能 ====================

/**
 * 插入 AI 生成内容
 */
export function insertAiGeneration(generation: Omit<AiGeneration, 'id' | 'created_at'>): number {
  const stmt = db.prepare(`
    INSERT INTO ai_generations (original_asset_id, parent_generation_id, generation_type, file_path, file_name, file_size, thumbnail_path, prompt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    generation.original_asset_id,
    generation.parent_generation_id,
    generation.generation_type,
    generation.file_path,
    generation.file_name,
    generation.file_size,
    generation.thumbnail_path || null,
    generation.prompt || null
  );
  return result.lastInsertRowid as number;
}

/**
 * 获取单个原始素材的所有 AI 生成内容
 */
export function getAiGenerationsByAssetId(assetId: number): AiGeneration[] {
  const stmt = db.prepare(`
    SELECT * FROM ai_generations
    WHERE original_asset_id = ? AND is_deleted = 0
    ORDER BY created_at DESC
  `);
  return stmt.all(assetId) as AiGeneration[];
}

/**
 * 获取从原始素材到指定生成版本的完整主线链
 * 沿着 parent_generation_id 向上追溯到原始素材，再向下获取主线子版本
 */
export function getMainGenerationChain(assetId: number, targetGenerationId?: number): {
  originalAsset: Asset;
  chain: AiGeneration[];
} | null {
  // 获取原始素材
  const assetStmt = db.prepare(`
    SELECT a.*, GROUP_CONCAT(t.id || ':' || t.tag_name) as tags_str
    FROM assets a
    LEFT JOIN asset_tags at ON a.id = at.asset_id
    LEFT JOIN tags t ON at.tag_id = t.id
    WHERE a.id = ?
    GROUP BY a.id
  `);
  const assetRow = assetStmt.get(assetId) as any;
  if (!assetRow) return null;

  const originalAsset = {
    ...assetRow,
    tags: assetRow.tags_str ? assetRow.tags_str.split(',').map((t: string) => {
      const [id, tag_name] = t.split(':');
      return { id: parseInt(id), tag_name };
    }) : []
  };

  // 获取所有未删除的生成版本
  const allGenStmt = db.prepare(`
    SELECT * FROM ai_generations
    WHERE original_asset_id = ? AND is_deleted = 0
    ORDER BY created_at ASC
  `);
  const allGenerations = allGenStmt.all(assetId) as AiGeneration[];

  // 构建主线链：从原始素材开始，沿着 is_main=1 的节点串联
  const chain: AiGeneration[] = [];

  // 找到第一级主线（parent_generation_id 为 null 且 is_main=1）
  let current = allGenerations.find(g => g.parent_generation_id === null && g.is_main === 1);

  // 如果没有第一级主线，找任意第一级
  if (!current) {
    current = allGenerations.find(g => g.parent_generation_id === null);
  }

  while (current) {
    chain.push(current);
    // 找下一级主线（parent 是当前节点且 is_main=1）
    const next = allGenerations.find(g => g.parent_generation_id === current!.id && g.is_main === 1);
    current = next;
  }

  return { originalAsset, chain };
}

/**
 * 获取某个生成版本的所有子版本（包括非主线）
 */
export function getChildGenerations(generationId: number): AiGeneration[] {
  const stmt = db.prepare(`
    SELECT * FROM ai_generations
    WHERE parent_generation_id = ? AND is_deleted = 0
    ORDER BY created_at DESC
  `);
  return stmt.all(generationId) as AiGeneration[];
}

/**
 * 获取 AI 生成内容及其关联链（包含原始素材信息）
 * @deprecated 使用 getMainGenerationChain 替代
 */
export function getAiGenerationChain(generationId: number): {
  generation: AiGeneration;
  originalAsset: Asset;
  parentGeneration?: AiGeneration;
  childGenerations: AiGeneration[];
} | null {
  const generationStmt = db.prepare('SELECT * FROM ai_generations WHERE id = ?');
  const generation = generationStmt.get(generationId) as AiGeneration | undefined;

  if (!generation) {
    return null;
  }

  // 获取原始素材（带标签）
  const assetStmt = db.prepare(`
    SELECT a.*, GROUP_CONCAT(t.id || ':' || t.tag_name) as tags_str
    FROM assets a
    LEFT JOIN asset_tags at ON a.id = at.asset_id
    LEFT JOIN tags t ON at.tag_id = t.id
    WHERE a.id = ?
    GROUP BY a.id
  `);
  const assetRow = assetStmt.get(generation.original_asset_id) as any;
  const originalAsset = {
    ...assetRow,
    tags: assetRow.tags_str ? assetRow.tags_str.split(',').map((t: string) => {
      const [id, tag_name] = t.split(':');
      return { id: parseInt(id), tag_name };
    }) : []
  };

  // 获取父版本（如果有）
  let parentGeneration: AiGeneration | undefined;
  if (generation.parent_generation_id) {
    parentGeneration = generationStmt.get(generation.parent_generation_id) as AiGeneration | undefined;
  }

  // 获取子版本
  const childStmt = db.prepare('SELECT * FROM ai_generations WHERE parent_generation_id = ? ORDER BY created_at');
  const childGenerations = childStmt.all(generationId) as AiGeneration[];

  return {
    generation,
    originalAsset,
    parentGeneration,
    childGenerations
  };
}

/**
 * 软删除某个 AI 生成内容（标记为已删除，不实际删除文件）
 */
export function deleteAiGeneration(generationId: number) {
  const stmt = db.prepare('UPDATE ai_generations SET is_deleted = 1 WHERE id = ?');
  stmt.run(generationId);
}

/**
 * 设置某个 AI 生成内容为主线
 */
export function setMainGeneration(generationId: number, originalAssetId: number) {
  const dbTransaction = db.transaction(() => {
    const clearStmt = db.prepare('UPDATE ai_generations SET is_main = 0 WHERE original_asset_id = ?');
    clearStmt.run(originalAssetId);
    const setStmt = db.prepare('UPDATE ai_generations SET is_main = 1 WHERE id = ?');
    setStmt.run(generationId);
  });
  dbTransaction();
}

/**
 * 取消主线状态
 */
export function unsetMainGeneration(generationId: number) {
  const stmt = db.prepare('UPDATE ai_generations SET is_main = 0 WHERE id = ?');
  stmt.run(generationId);
}



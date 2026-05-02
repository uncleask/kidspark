import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { Asset, Tag } from '../src/types';

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

    CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(tag_name);
  `);

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
    SELECT a.*, GROUP_CONCAT(t.id || ':' || t.tag_name) as tags_str
    FROM assets a
    LEFT JOIN asset_tags at ON a.id = at.asset_id
    LEFT JOIN tags t ON at.tag_id = t.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `);
  const rows = stmt.all() as any[];
  return rows.map(row => ({
    ...row,
    tags: row.tags_str ? row.tags_str.split(',').map((t: string) => {
      const [id, tag_name] = t.split(':');
      return { id: parseInt(id), tag_name };
    }) : []
  }));
}

export function getAssetsByTag(tagId: number): Asset[] {
  const stmt = db.prepare(`
    SELECT a.*, GROUP_CONCAT(t.id || ':' || t.tag_name) as tags_str
    FROM assets a
    INNER JOIN asset_tags at ON a.id = at.asset_id
    INNER JOIN tags t ON at.tag_id = t.id
    WHERE at.tag_id = ?
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `);
  const rows = stmt.all(tagId) as any[];
  return rows.map(row => ({
    ...row,
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
  const stmt = db.prepare('DELETE FROM tags WHERE id = ?');
  stmt.run(tagId);
}

export function deleteAsset(assetId: number) {
  const stmt = db.prepare('DELETE FROM assets WHERE id = ?');
  stmt.run(assetId);
}

export function updateAssetDescription(assetId: number, description: string) {
  const stmt = db.prepare('UPDATE assets SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(description, assetId);
}

export function getAssetsByTags(tagIds: number[]): Asset[] {
  if (tagIds.length === 0) {
    return getAllAssets();
  }

  const placeholders = tagIds.map(() => '?').join(',');
  const stmt = db.prepare(`
    SELECT a.*, GROUP_CONCAT(t.id || ':' || t.tag_name) as tags_str
    FROM assets a
    INNER JOIN asset_tags at ON a.id = at.asset_id
    INNER JOIN tags t ON at.tag_id = t.id
    WHERE at.tag_id IN (${placeholders})
    GROUP BY a.id
    HAVING COUNT(DISTINCT at.tag_id) = ${tagIds.length}
    ORDER BY a.created_at DESC
  `);
  const rows = stmt.all(...tagIds) as any[];
  return rows.map(row => ({
    ...row,
    tags: row.tags_str ? row.tags_str.split(',').map((t: string) => {
      const [id, tag_name] = t.split(':');
      return { id: parseInt(id), tag_name };
    }) : []
  }));
}

/**
 * 搜索素材（按文件名、标签和描述搜索）
 * @param searchQuery 搜索关键词
 */
export function searchAssets(searchQuery: string): Asset[] {
  const normalizedQuery = searchQuery.toLowerCase();
  const stmt = db.prepare(`
    SELECT DISTINCT a.*, GROUP_CONCAT(t.id || ':' || t.tag_name) as tags_str
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
    tags: row.tags_str ? row.tags_str.split(',').map((t: string) => {
      const [id, tag_name] = t.split(':');
      return { id: parseInt(id), tag_name };
    }) : []
  }));
}

export function getAssetsByType(fileType: 'image' | 'video' | 'audio'): Asset[] {
  const stmt = db.prepare(`
    SELECT a.*, GROUP_CONCAT(t.id || ':' || t.tag_name) as tags_str
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
    tags: row.tags_str ? row.tags_str.split(',').map((t: string) => {
      const [id, tag_name] = t.split(':');
      return { id: parseInt(id), tag_name };
    }) : []
  }));
}

/**
 * 检查文件是否已存在于数据库中
 * @param filePath 文件路径
 */
export function checkAssetExists(filePath: string): boolean {
  const stmt = db.prepare('SELECT id FROM assets WHERE file_path = ?');
  const result = stmt.get(filePath);
  return !!result;
}

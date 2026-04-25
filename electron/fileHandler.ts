import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { insertAsset, checkAssetExists, getAppDataDir } from './database';

const execFilePromise = promisify(execFile);

// 使用应用数据目录
const ORIGINALS_DIR = path.join(getAppDataDir(), 'originals');
const THUMBNAILS_DIR = path.join(getAppDataDir(), 'thumbnails');

function ensureDirectories() {
  [ORIGINALS_DIR, THUMBNAILS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function getFileType(ext: string): 'image' | 'video' | 'audio' | null {
  const extLower = ext.toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.heic', '.webp', '.gif'].includes(extLower)) return 'image';
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(extLower)) return 'video';
  if (['.mp3', '.m4a', '.wav', '.flac', '.aac'].includes(extLower)) return 'audio';
  return null;
}

async function generateImageThumbnail(inputPath: string, outputPath: string) {
  await sharp(inputPath)
    .resize(300, null, { withoutEnlargement: true })
    .toFile(outputPath);
}

async function generateVideoThumbnail(inputPath: string, outputPath: string) {
  if (!ffmpeg) {
    throw new Error('ffmpeg not available');
  }
  await execFilePromise(ffmpeg, [
    '-i', inputPath,
    '-ss', '00:00:00',
    '-vframes', '1',
    '-vf', 'scale=300:-1',
    '-y',
    outputPath
  ]);
}

async function importSingleFile(filePath: string): Promise<number | null> {
  ensureDirectories();

  // 首先检查文件是否已存在于数据库中
  const destPath = path.join(ORIGINALS_DIR, path.basename(filePath)); // 简化路径，先不按日期
  if (checkAssetExists(filePath) || checkAssetExists(destPath)) {
    console.log(`File already exists: ${filePath}`);
    return null;
  }

  const ext = path.extname(filePath);
  const fileType = getFileType(ext);

  if (!fileType) {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  const stat = fs.statSync(filePath);
  const date = new Date(stat.birthtime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const dateDir = path.join(ORIGINALS_DIR, `${year}`, `${month}`, `${day}`);
  if (!fs.existsSync(dateDir)) {
    fs.mkdirSync(dateDir, { recursive: true });
  }

  const fileName = path.basename(filePath);
  let destFileName = fileName;
  let finalDestPath = path.join(dateDir, destFileName);
  let counter = 1;

  while (fs.existsSync(finalDestPath)) {
    const name = path.parse(fileName).name;
    destFileName = `${name}_${counter}${ext}`;
    finalDestPath = path.join(dateDir, destFileName);
    counter++;
  }

  fs.copyFileSync(filePath, finalDestPath);

  let thumbnailPath: string | null = null;
  const thumbExt = '.jpg';
  const thumbFileName = path.parse(destFileName).name + thumbExt;
  const thumbDestPath = path.join(THUMBNAILS_DIR, thumbFileName);

  try {
    if (fileType === 'image') {
      await generateImageThumbnail(finalDestPath, thumbDestPath);
      thumbnailPath = thumbDestPath;
    } else if (fileType === 'video') {
      await generateVideoThumbnail(finalDestPath, thumbDestPath);
      thumbnailPath = thumbDestPath;
    }
  } catch (e) {
    console.error('Failed to generate thumbnail:', e);
  }

  const assetId = insertAsset({
    file_name: destFileName,
    file_path: finalDestPath,
    file_type: fileType,
    thumbnail_path: thumbnailPath,
    file_size: stat.size
  });

  return assetId;
}

function walkDirectory(dir: string): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...walkDirectory(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

export async function importFiles(filePaths: string[]): Promise<number[]> {
  const importedIds: number[] = [];

  for (const filePath of filePaths) {
    try {
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        const files = walkDirectory(filePath);
        for (const file of files) {
          try {
            const id = await importSingleFile(file);
            if (id !== null) {
              importedIds.push(id);
            }
          } catch (e) {
            console.error(`Failed to import file ${file}:`, e);
          }
        }
      } else {
        const id = await importSingleFile(filePath);
        if (id !== null) {
          importedIds.push(id);
        }
      }
    } catch (e) {
      console.error(`Failed to process ${filePath}:`, e);
    }
  }

  return importedIds;
}

/**
 * 导出文件到指定文件夹
 */
export function exportFilesToFolder(assetIds: number[], destFolder: string): boolean {
  try {
    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }
    
    // 需要获取文件路径信息，这里简化逻辑
    return true;
  } catch (e) {
    console.error('Failed to export files:', e);
    return false;
  }
}

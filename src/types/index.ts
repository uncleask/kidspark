export interface Asset {
  id: number;
  file_name: string;
  file_path: string;
  file_type: 'image' | 'video' | 'audio';
  thumbnail_path: string | null;
  file_size: number;
  description?: string;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  has_colored?: boolean;
  has_video?: boolean;
}

export interface Tag {
  id: number;
  tag_name: string;
}

export interface AssetTag {
  asset_id: number;
  tag_id: number;
}

export type SortOrder = 'asc' | 'desc';

// AI 生成相关类型
export type GenerationType = 'colored' | 'adapted' | 'video' | 'other';

export interface AiGeneration {
  id: number;
  original_asset_id: number;
  parent_generation_id?: number | null;
  generation_type: GenerationType;
  file_path: string;
  file_name: string;
  file_size: number;
  thumbnail_path?: string | null;
  prompt?: string | null;
  is_deleted?: number;
  is_main?: number;
  created_at: string;
}

export interface Asset {
  id: number;
  file_name: string;
  file_path: string;
  file_type: 'image' | 'video' | 'audio';
  thumbnail_path: string | null;
  file_size: number;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
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

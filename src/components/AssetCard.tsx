import React, { useState } from 'react';
import { Card, Tag as AntTag, Input, Tooltip, message, Typography, Space, Checkbox } from 'antd';
import {
  VideoCameraOutlined,
  AudioOutlined,
  FileImageOutlined,
  PlusOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { Asset } from '../types';

const { Text } = Typography;

interface AssetCardProps {
  asset: Asset;
  onTagUpdated: () => void;
  onClick: () => void;
  isSelected: boolean;
  onSelect: (assetId: number, checked: boolean) => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, onTagUpdated, onClick, isSelected, onSelect }) => {
  const [tagInput, setTagInput] = useState('');

  const getFileIcon = () => {
    switch (asset.file_type) {
      case 'image':
        return <FileImageOutlined />;
      case 'video':
        return <VideoCameraOutlined />;
      case 'audio':
        return <AudioOutlined />;
      default:
        return <FileImageOutlined />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAddTag = async () => {
    if (!tagInput.trim()) return;

    try {
      await window.electronAPI.addTagToAsset(asset.id, tagInput.trim());
      message.success('标签已添加');
      setTagInput('');
      onTagUpdated();
    } catch (error) {
      console.error('Failed to add tag:', error);
      message.error('添加标签失败');
    }
  };

  const handleRemoveTag = async (tagId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await window.electronAPI.removeTagFromAsset(asset.id, tagId);
      message.success('标签已移除');
      onTagUpdated();
    } catch (error) {
      console.error('Failed to remove tag:', error);
      message.error('移除标签失败');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(asset.id, !isSelected);
  };

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{ border: isSelected ? '2px solid #1890ff' : undefined }}
      cover={
        <div
          style={{
            height: 180,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f0f0f0',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* 选择复选框 */}
          <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}>
            <Checkbox
              checked={isSelected}
              onClick={handleSelect}
            />
          </div>
          
          {asset.thumbnail_path ? (
            <>
              <img
                alt={asset.file_name}
                src={`file://${asset.thumbnail_path}`}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
              {asset.file_type === 'video' && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '48px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    textShadow: '0 0 10px rgba(0,0,0,0.5)',
                    zIndex: 1
                  }}
                >
                  <PlayCircleOutlined />
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 48, color: '#999' }}>{getFileIcon()}</div>
          )}
        </div>
      }
    >
      <Card.Meta
        title={
          <Tooltip title={asset.file_name}>
            <Text ellipsis style={{ display: 'block' }}>{asset.file_name}</Text>
          </Tooltip>
        }
        description={
          <div onClick={(e) => e.stopPropagation()}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatFileSize(asset.file_size)}
            </Text>
            <div style={{ marginTop: 8, minHeight: 32 }}>
              <Space wrap size={[4, 4]}>
                {asset.tags?.map(tag => (
                  <AntTag
                    key={tag.id}
                    closable
                    onClose={(e) => handleRemoveTag(tag.id, e)}
                    style={{ marginBottom: 0 }}
                  >
                    {tag.tag_name}
                  </AntTag>
                ))}
              </Space>
            </div>
            <Input
              placeholder="添加标签"
              size="small"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              onPressEnter={handleAddTag}
              suffix={<PlusOutlined onClick={handleAddTag} style={{ cursor: 'pointer' }} />}
              style={{ marginTop: 8 }}
            />
          </div>
        }
      />
    </Card>
  );
};

export default AssetCard;

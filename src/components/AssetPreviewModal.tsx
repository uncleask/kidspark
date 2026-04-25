import React from 'react';
import { Modal, Button, Tag as AntTag, Input, Space, message } from 'antd';
import { VideoCameraOutlined, AudioOutlined, DeleteOutlined } from '@ant-design/icons';
import { Asset, Tag } from '../types';

interface AssetPreviewModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onTagUpdated: () => void;
  onDeleteAsset: (assetId: number) => Promise<void>;
}

const AssetPreviewModal: React.FC<AssetPreviewModalProps> = ({
  asset,
  isOpen,
  onClose,
  onTagUpdated,
  onDeleteAsset
}) => {
  const [tagInput, setTagInput] = React.useState('');

  if (!asset) {
    return null;
  }

  const handleAddTag = async () => {
    if (!tagInput.trim() || !asset) return;

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

  const handleRemoveTag = async (tagId: number) => {
    if (!asset) return;

    try {
      await window.electronAPI.removeTagFromAsset(asset.id, tagId);
      message.success('标签已移除');
      onTagUpdated();
    } catch (error) {
      console.error('Failed to remove tag:', error);
      message.error('移除标签失败');
    }
  };

  const handleDeleteAsset = async () => {
    if (!asset) return;

    try {
      await onDeleteAsset(asset.id);
      message.success('素材已删除');
      onClose();
    } catch (error) {
      console.error('Failed to delete asset:', error);
      message.error('删除素材失败');
    }
  };

  const renderPreviewContent = () => {
    switch (asset.file_type) {
      case 'image':
        return (
          <img
            src={`file://${asset.file_path}`}
            alt={asset.file_name}
            style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto' }}
          />
        );
      case 'video':
        return (
          <video
            src={`file://${asset.file_path}`}
            controls
            style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto' }}
          />
        );
      case 'audio':
        return (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <AudioOutlined style={{ fontSize: '64px', color: '#1890ff', marginBottom: '16px' }} />
            <div>
              <audio
                src={`file://${asset.file_path}`}
                controls
                style={{ width: '100%', maxWidth: '400px' }}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      title={asset.file_name}
      open={isOpen}
      onCancel={onClose}
      width="80%"
      footer={[
        <Button key="delete" danger icon={<DeleteOutlined />} onClick={handleDeleteAsset}>
          删除素材
        </Button>,
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
    >
      <div style={{ marginBottom: '16px' }}>
        {renderPreviewContent()}
      </div>
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
        <Space wrap size={[8, 8]} style={{ marginBottom: '16px' }}>
          {asset.tags?.map(tag => (
            <AntTag
              key={tag.id}
              closable
              onClose={() => handleRemoveTag(tag.id)}
            >
              {tag.tag_name}
            </AntTag>
          ))}
        </Space>
        <Input
          placeholder="添加标签"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onPressEnter={handleAddTag}
          addonAfter={
            <Button type="primary" size="small" onClick={handleAddTag}>
              添加
            </Button>
          }
        />
      </div>
    </Modal>
  );
};

export default AssetPreviewModal;

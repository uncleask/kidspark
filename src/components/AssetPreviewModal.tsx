import React, { useState } from 'react';
import { Modal, Button, Tag as AntTag, Input, Space, message, Tooltip } from 'antd';
import { DeleteOutlined, UndoOutlined, RedoOutlined, SaveOutlined, SyncOutlined, EditOutlined } from '@ant-design/icons';
import { Asset, Tag } from '../types';

const { TextArea } = Input;

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
  const [tagInput, setTagInput] = useState('');
  const [rotation, setRotation] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [description, setDescription] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  React.useEffect(() => {
    if (asset) {
      setDescription(asset.description || '');
      setRotation(0);
      setIsEditingDescription(false);
    }
  }, [asset]);

  const handleRotateClockwise = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRotateAnticlockwise = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleResetRotation = () => {
    setRotation(0);
  };

  const handleSaveRotation = async () => {
    if (!asset || rotation === 0) {
      message.warning('请先旋转图片');
      return;
    }

    setIsSaving(true);
    try {
      const result = await window.electronAPI.saveRotatedImage(asset.file_path, rotation);
      if (result.success) {
        message.success('图片已保存');
        setRotation(0);
        onTagUpdated();
      } else {
        message.error(result.error || '保存失败');
      }
    } catch (error) {
      console.error('Failed to save rotated image:', error);
      message.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!asset) return;

    setIsSavingDescription(true);
    try {
      await window.electronAPI.updateAssetDescription(asset.id, description);
      message.success('描述已保存');
      setIsEditingDescription(false);
      onTagUpdated();
    } catch (error) {
      console.error('Failed to save description:', error);
      message.error('保存描述失败');
    } finally {
      setIsSavingDescription(false);
    }
  };

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
    const imageStyle: React.CSSProperties = {
      maxWidth: '100%',
      maxHeight: '70vh',
      display: 'block',
      margin: '0 auto',
      transform: `rotate(${rotation}deg)`,
      transition: 'transform 0.3s ease'
    };

    switch (asset.file_type) {
      case 'image':
        return (
          <>
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              <Space>
                <Tooltip title="逆时针旋转90°">
                  <Button
                    icon={<UndoOutlined />}
                    onClick={handleRotateAnticlockwise}
                  >
                    逆时针
                  </Button>
                </Tooltip>
                <Tooltip title="顺时针旋转90°">
                  <Button
                    icon={<RedoOutlined />}
                    onClick={handleRotateClockwise}
                  >
                    顺时针
                  </Button>
                </Tooltip>
                {rotation !== 0 && (
                  <>
                    <Button
                      icon={<SyncOutlined />}
                      onClick={handleResetRotation}
                    >
                      重置
                    </Button>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSaveRotation}
                      loading={isSaving}
                    >
                      保存旋转
                    </Button>
                  </>
                )}
              </Space>
              {rotation !== 0 && (
                <div style={{ marginTop: '8px', color: '#1890ff' }}>
                  当前旋转：{rotation}°
                </div>
              )}
            </div>
            <img
              src={`file://${asset.file_path}`}
              alt={asset.file_name}
              style={imageStyle}
            />
          </>
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
            <div style={{ fontSize: '64px', color: '#1890ff', marginBottom: '16px' }}>🎵</div>
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
      
      {/* 描述输入区域 */}
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px', marginBottom: '16px' }}>
        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 500 }}>描述：</span>
          {!isEditingDescription && description && (
            <Button 
              size="small" 
              icon={<EditOutlined />} 
              onClick={() => setIsEditingDescription(true)}
            >
              编辑
            </Button>
          )}
        </div>
        {isEditingDescription || !description ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <TextArea
              placeholder="添加素材描述..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              showCount
            />
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveDescription}
              loading={isSavingDescription}
            >
              保存描述
            </Button>
          </Space>
        ) : (
          <div 
            style={{ 
              padding: '8px 12px', 
              background: '#f5f5f5', 
              borderRadius: '4px',
              cursor: 'pointer',
              minHeight: '60px'
            }}
            onClick={() => setIsEditingDescription(true)}
          >
            {description}
          </div>
        )}
      </div>

      {/* 标签区域 */}
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

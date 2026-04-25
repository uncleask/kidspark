import React, { useState, useEffect, useMemo } from 'react';
import {
  Layout,
  Button,
  Col,
  Row,
  Tag as AntTag,
  Typography,
  message,
  Space,
  Radio,
  Input,
  Dropdown,
  MenuProps,
  Modal,
  Checkbox,
  Divider
} from 'antd';
import {
  UploadOutlined,
  InboxOutlined,
  TagsOutlined,
  DeleteOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  SearchOutlined,
  ExportOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import AssetCard from './components/AssetCard';
import AssetPreviewModal from './components/AssetPreviewModal';
import { Asset, Tag, SortOrder } from './types';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // 获取资产数据
  const fetchAssets = async (tagIds: number[] = [], query: string = '') => {
    try {
      let fetchedAssets: Asset[];
      if (query) {
        fetchedAssets = await window.electronAPI.searchAssets(query);
      } else if (tagIds.length > 0) {
        fetchedAssets = await window.electronAPI.getAssetsByTags(tagIds);
      } else {
        fetchedAssets = await window.electronAPI.getAllAssets();
      }
      setAssets(fetchedAssets);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      message.error('获取素材列表失败');
    }
  };

  const fetchTags = async () => {
    try {
      const fetchedTags = await window.electronAPI.getAllTags();
      setTags(fetchedTags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  useEffect(() => {
    fetchAssets(selectedTagIds, searchQuery);
    fetchTags();
  }, [selectedTagIds, searchQuery]);

  // 排序处理
  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [assets, sortOrder]);

  const handleImport = async () => {
    try {
      const importedIds = await window.electronAPI.importFiles();
      if (importedIds.length > 0) {
        message.success(`成功导入 ${importedIds.length} 个素材`);
        fetchAssets(selectedTagIds, searchQuery);
        fetchTags();
      }
    } catch (error) {
      console.error('Failed to import files:', error);
      message.error('导入文件失败');
    }
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  };

  const handleClearAllTags = () => {
    setSelectedTagIds([]);
  };

  const handleDeleteTag = async (tagId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await window.electronAPI.deleteTag(tagId);
      message.success('标签已删除');
      setSelectedTagIds(prev => prev.filter(id => id !== tagId));
      fetchTags();
    } catch (error) {
      console.error('Failed to delete tag:', error);
      message.error('删除标签失败');
    }
  };

  const handleTagUpdated = () => {
    fetchAssets(selectedTagIds, searchQuery);
    fetchTags();
  };

  const handleAssetClick = (asset: Asset) => {
    setPreviewAsset(asset);
    setIsPreviewOpen(true);
  };

  const handleDeleteAsset = async (assetId: number) => {
    try {
      await window.electronAPI.deleteAsset(assetId);
      setSelectedAssetIds(prev => prev.filter(id => id !== assetId));
      fetchAssets(selectedTagIds, searchQuery);
      fetchTags();
    } catch (error) {
      console.error('Failed to delete asset:', error);
      message.error('删除素材失败');
    }
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewAsset(null);
  };

  const handleSelectAsset = (assetId: number, checked: boolean) => {
    setSelectedAssetIds(prev => {
      if (checked) {
        return [...prev, assetId];
      } else {
        return prev.filter(id => id !== assetId);
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssetIds(sortedAssets.map(asset => asset.id));
    } else {
      setSelectedAssetIds([]);
    }
  };

  // 导出功能
  const handleExportCopyPaths = async () => {
    try {
      const result = await window.electronAPI.exportCopyPaths(selectedAssetIds);
      if (result.success && result.count) {
        message.success(`已复制 ${result.count} 个文件路径到剪贴板`);
        setIsExportModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to copy paths:', error);
      message.error('复制路径失败');
    }
  };

  const handleExportToFolder = async () => {
    try {
      const result = await window.electronAPI.exportToFolder(selectedAssetIds);
      if (result.success && result.count) {
        message.success(`成功导出 ${result.count} 个文件`);
        setIsExportModalOpen(false);
      } else if (result.canceled) {
        // 用户取消，不显示任何消息
      } else {
        message.error('导出失败');
      }
    } catch (error) {
      console.error('Failed to export to folder:', error);
      message.error('导出到文件夹失败');
    }
  };

  const handleExportJsonMetadata = async () => {
    try {
      const result = await window.electronAPI.exportJsonMetadata(selectedAssetIds);
      if (result.success && result.count) {
        message.success(`成功导出 ${result.count} 条元数据`);
        setIsExportModalOpen(false);
      } else if (result.canceled) {
        // 用户取消，不显示任何消息
      } else {
        message.error('导出失败');
      }
    } catch (error) {
      console.error('Failed to export metadata:', error);
      message.error('导出元数据失败');
    }
  };

  const exportMenu: MenuProps = {
    items: [
      {
        key: 'copy-paths',
        label: '复制文件路径到剪贴板',
        icon: <ExportOutlined />,
        onClick: handleExportCopyPaths
      },
      {
        key: 'export-folder',
        label: '导出到指定文件夹',
        icon: <InboxOutlined />,
        onClick: handleExportToFolder
      },
      {
        key: 'export-json',
        label: '生成 JSON 元数据',
        icon: <TagsOutlined />,
        onClick: handleExportJsonMetadata
      }
    ]
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>
          <TagsOutlined style={{ marginRight: 8 }} />
          KidSpark
        </Title>
        <Search
          placeholder="搜索文件名或标签..."
          allowClear
          enterButton={<SearchOutlined />}
          size="middle"
          style={{ width: 400 }}
          onSearch={value => setSearchQuery(value)}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {selectedAssetIds.length > 0 && (
            <>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => setIsExportModalOpen(true)}
              >
                导出供 AI 使用 ({selectedAssetIds.length})
              </Button>
              <Button danger onClick={() => setSelectedAssetIds([])}>
                取消选择
              </Button>
            </>
          )}
          <Button type="primary" icon={<UploadOutlined />} onClick={handleImport}>
            导入素材
          </Button>
        </div>
      </Header>
      <Layout>
        <Sider width={250} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <div style={{ padding: '16px' }}>
            <Title level={5} style={{ marginBottom: 16 }}>
              <InboxOutlined style={{ marginRight: 8 }} />
              标签筛选
            </Title>
            <div style={{ marginBottom: 12 }}>
              <AntTag
                color={selectedTagIds.length === 0 ? 'blue' : 'default'}
                onClick={handleClearAllTags}
                style={{ cursor: 'pointer', fontSize: '14px', padding: '4px 12px' }}
              >
                全部素材
              </AntTag>
            </div>
            {tags.map(tag => (
              <div key={tag.id} style={{ marginBottom: 8 }}>
                <AntTag
                  color={selectedTagIds.includes(tag.id) ? 'blue' : 'default'}
                  onClick={() => handleTagToggle(tag.id)}
                  closable
                  onClose={(e) => handleDeleteTag(tag.id, e)}
                  style={{ cursor: 'pointer', fontSize: '14px', padding: '4px 12px' }}
                >
                  {tag.tag_name}
                </AntTag>
              </div>
            ))}
          </div>
        </Sider>
        <Content style={{ padding: '24px', background: '#f5f5f5', overflow: 'auto' }}>
          {sortedAssets.length > 0 && (
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Checkbox
                  checked={selectedAssetIds.length > 0 && selectedAssetIds.length === sortedAssets.length}
                  indeterminate={selectedAssetIds.length > 0 && selectedAssetIds.length < sortedAssets.length}
                  onChange={e => handleSelectAll(e.target.checked)}
                >
                  全选
                </Checkbox>
                <Text>
                  共 {sortedAssets.length} 个素材
                  {selectedTagIds.length > 0 && (
                    <span style={{ marginLeft: 8 }}>
                      （筛选标签：{selectedTagIds.length}个）
                    </span>
                  )}
                  {selectedAssetIds.length > 0 && (
                    <span style={{ marginLeft: 8, color: '#1890ff' }}>
                      已选择 {selectedAssetIds.length} 个
                    </span>
                  )}
                </Text>
              </Space>
              <Space>
                <Radio.Group
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  buttonStyle="solid"
                >
                  <Radio.Button value="desc">
                    <SortDescendingOutlined /> 最新优先
                  </Radio.Button>
                  <Radio.Button value="asc">
                    <SortAscendingOutlined /> 最早优先
                  </Radio.Button>
                </Radio.Group>
              </Space>
            </div>
          )}

          {sortedAssets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
              <InboxOutlined style={{ fontSize: '64px', marginBottom: 16 }} />
              <div>暂无素材，点击上方「导入素材」按钮开始使用</div>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {sortedAssets.map(asset => (
                <Col key={asset.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                  <AssetCard
                    asset={asset}
                    onTagUpdated={handleTagUpdated}
                    onClick={() => handleAssetClick(asset)}
                    isSelected={selectedAssetIds.includes(asset.id)}
                    onSelect={handleSelectAsset}
                  />
                </Col>
              ))}
            </Row>
          )}
        </Content>
      </Layout>

      {/* 预览 Modal */}
      <AssetPreviewModal
        asset={previewAsset}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        onTagUpdated={handleTagUpdated}
        onDeleteAsset={handleDeleteAsset}
      />

      {/* 导出 Modal */}
      <Modal
        title="导出供 AI 使用"
        open={isExportModalOpen}
        onCancel={() => setIsExportModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsExportModalOpen(false)}>
            取消
          </Button>
        ]}
      >
        <Text style={{ display: 'block', marginBottom: 16 }}>
          已选择 <strong>{selectedAssetIds.length}</strong> 个素材，请选择导出方式：
        </Text>
        <Divider />
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="primary"
            size="large"
            block
            icon={<ExportOutlined />}
            onClick={handleExportCopyPaths}
          >
            复制文件路径到剪贴板
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              可直接粘贴到 ComfyUI/Stable Diffusion 等 AI 工具中
            </Text>
          </Button>
          <Button
            size="large"
            block
            icon={<InboxOutlined />}
            onClick={handleExportToFolder}
          >
            导出到指定文件夹
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              将素材文件复制到指定文件夹
            </Text>
          </Button>
          <Button
            size="large"
            block
            icon={<TagsOutlined />}
            onClick={handleExportJsonMetadata}
          >
            生成 JSON 元数据
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              包含文件名、路径、标签、创建时间等信息
            </Text>
          </Button>
        </Space>
      </Modal>
    </Layout>
  );
};

export default App;

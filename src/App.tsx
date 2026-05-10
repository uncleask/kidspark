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
  Divider,
  Tabs,
  DatePicker,
  Select
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
  CloseCircleOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  ExperimentOutlined,
  CalendarOutlined,
  FilterOutlined,
  FolderOpenOutlined,
  FileOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import AssetCard from './components/AssetCard';
import AssetPreviewModal from './components/AssetPreviewModal';
import SampleImages from './components/SampleImages';
import { Asset, Tag, SortOrder } from './types';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedType, setSelectedType] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // 时间段筛选状态
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [dateFilterPreset, setDateFilterPreset] = useState<string | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const { RangePicker } = DatePicker;
  const { Option } = Select;

  // 获取资产数据
  const fetchAssets = async (tagIds: number[] = [], query: string = '', type: 'all' | 'image' | 'video' | 'audio' = 'all', startDate?: string, endDate?: string) => {
    try {
      let fetchedAssets: Asset[];
      const fileType = type !== 'all' ? type : undefined;
      
      if (query) {
        // 搜索时保留类型过滤
        fetchedAssets = await window.electronAPI.searchAssets(query, fileType);
      } else if (startDate && endDate) {
        // 时间段搜索时保留类型过滤
        let dateAssets = await window.electronAPI.getAssetsByDateRange(startDate, endDate);
        if (fileType) {
          dateAssets = dateAssets.filter(a => a.file_type === fileType);
        }
        fetchedAssets = dateAssets;
      } else if (type !== 'all') {
        fetchedAssets = await window.electronAPI.getAssetsByType(type);
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
    let startDate: string | undefined;
    let endDate: string | undefined;
    
    if (dateRange && dateRange[0] && dateRange[1]) {
      startDate = dateRange[0].format('YYYY-MM-DD');
      endDate = dateRange[1].format('YYYY-MM-DD');
    }
    
    fetchAssets(selectedTagIds, searchQuery, selectedType, startDate, endDate);
    fetchTags();
  }, [selectedTagIds, searchQuery, selectedType, dateRange]);

  // 排序处理
  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [assets, sortOrder]);

  const handleImport = async (type: 'files' | 'folder' = 'files') => {
    try {
      let importedIds: number[] = [];
      if (type === 'files') {
        importedIds = await window.electronAPI.importFilesOnly();
      } else {
        importedIds = await window.electronAPI.importFiles();
      }
      if (importedIds.length > 0) {
        message.success(`成功导入 ${importedIds.length} 个素材`);
        fetchAssets(selectedTagIds, searchQuery, selectedType);
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

  const handleTypeSelect = (type: 'all' | 'image' | 'video' | 'audio') => {
    setSelectedType(type);
  };
  
  // 时间段筛选处理
  const handleDatePresetChange = (value: string) => {
    const now = dayjs();
    
    if (value === 'all') {
      setDateFilterPreset(null);
      setDateRange(null);
      setShowDateFilter(false);
    } else if (value === '7days') {
      setDateFilterPreset('7days');
      setDateRange([now.subtract(7, 'day'), now]);
      setShowDateFilter(true);
    } else if (value === '30days') {
      setDateFilterPreset('30days');
      setDateRange([now.subtract(30, 'day'), now]);
      setShowDateFilter(true);
    } else if (value === '120days') {
      setDateFilterPreset('120days');
      setDateRange([now.subtract(120, 'day'), now]);
      setShowDateFilter(true);
    } else if (value === 'custom') {
      // 打开自定义时间弹窗
      setCustomDateRange(dateRange || [now.subtract(30, 'day'), now]);
      setShowCustomDateModal(true);
    }
  };
  
  const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    setDateRange(dates);
    if (dates && dates[0] && dates[1]) {
      setShowDateFilter(true);
    }
  };
  
  const clearDateFilter = () => {
    setDateRange(null);
    setDateFilterPreset(null);
    setShowDateFilter(false);
  };
  
  // 自定义时间弹窗确认
  const handleCustomDateConfirm = () => {
    if (customDateRange && customDateRange[0] && customDateRange[1]) {
      setDateRange(customDateRange);
      setDateFilterPreset('custom');
      setShowDateFilter(true);
      setShowCustomDateModal(false);
    } else {
      message.warning('请选择完整的时间范围');
    }
  };
  
  const handleCustomDateCancel = () => {
    setShowCustomDateModal(false);
    // 如果没有已选的时间范围，重置为全部
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      setDateFilterPreset(null);
    }
  };
  
  // 获取Select展示的label
  const getDateFilterLabel = (): string => {
    if (!dateFilterPreset) return '时间筛选';
    if (dateFilterPreset === '7days') return '最近7天';
    if (dateFilterPreset === '30days') return '最近30天';
    if (dateFilterPreset === '120days') return '最近120天';
    if (dateFilterPreset === 'custom' && dateRange && dateRange[0] && dateRange[1]) {
      return `${dateRange[0].format('YYYY-MM-DD')} 至 ${dateRange[1].format('YYYY-MM-DD')}`;
    }
    return '时间筛选';
  };

  const handleDeleteTag = async (tagId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除标签',
      content: '删除标签将同时移除该标签与所有素材的关联，是否继续？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await window.electronAPI.deleteTag(tagId);
          message.success('标签已删除');
          setSelectedTagIds(prev => prev.filter(id => id !== tagId));
          fetchTags();
          fetchAssets(selectedTagIds.filter(id => id !== tagId), searchQuery, selectedType);
        } catch (error) {
          console.error('Failed to delete tag:', error);
          message.error('删除标签失败');
        }
      }
    });
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

  const handleBatchDelete = () => {
    if (selectedAssetIds.length === 0) return;
    Modal.confirm({
      title: '确认删除素材',
      content: `确定要删除选中的 ${selectedAssetIds.length} 个素材吗？删除后将同时清理系统中的关联记录（包括 AI 生成版本和标签关联）。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          for (const assetId of selectedAssetIds) {
            await window.electronAPI.deleteAsset(assetId);
          }
          message.success(`已删除 ${selectedAssetIds.length} 个素材`);
          setSelectedAssetIds([]);
          fetchAssets(selectedTagIds, searchQuery);
          fetchTags();
        } catch (error) {
          console.error('Failed to batch delete assets:', error);
          message.error('批量删除失败');
        }
      }
    });
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
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
              >
                删除选中 ({selectedAssetIds.length})
              </Button>
              <Button danger onClick={() => setSelectedAssetIds([])}>
                取消选择
              </Button>
            </>
          )}
          <Dropdown menu={{
            items: [
              {
                key: 'files',
                label: '选择文件',
                icon: <FileOutlined />,
                onClick: () => handleImport('files')
              },
              {
                key: 'folder',
                label: '选择文件夹',
                icon: <FolderOpenOutlined />,
                onClick: () => handleImport('folder')
              }
            ]
          }} placement="bottomRight">
            <Button type="primary" icon={<UploadOutlined />}>
              导入素材
            </Button>
          </Dropdown>
        </div>
      </Header>
      <Layout>
        <Sider width={250} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <div style={{ padding: '16px' }}>
            <Title level={5} style={{ marginBottom: 16 }}>
              <InboxOutlined style={{ marginRight: 8 }} />
              类型筛选
            </Title>
            <div style={{ marginBottom: 24 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <AntTag
                  color={selectedType === 'all' ? 'blue' : 'default'}
                  onClick={() => handleTypeSelect('all')}
                  style={{ cursor: 'pointer', fontSize: '14px', padding: '4px 12px', width: '100%', textAlign: 'center' }}
                >
                  全部
                </AntTag>
                <AntTag
                  color={selectedType === 'image' ? 'blue' : 'default'}
                  onClick={() => handleTypeSelect('image')}
                  style={{ cursor: 'pointer', fontSize: '14px', padding: '4px 12px', width: '100%', textAlign: 'center' }}
                >
                  <PictureOutlined style={{ marginRight: 4 }} />
                  图片
                </AntTag>
                <AntTag
                  color={selectedType === 'video' ? 'blue' : 'default'}
                  onClick={() => handleTypeSelect('video')}
                  style={{ cursor: 'pointer', fontSize: '14px', padding: '4px 12px', width: '100%', textAlign: 'center' }}
                >
                  <VideoCameraOutlined style={{ marginRight: 4 }} />
                  视频
                </AntTag>
                <AntTag
                  color={selectedType === 'audio' ? 'blue' : 'default'}
                  onClick={() => handleTypeSelect('audio')}
                  style={{ cursor: 'pointer', fontSize: '14px', padding: '4px 12px', width: '100%', textAlign: 'center' }}
                >
                  <AudioOutlined style={{ marginRight: 4 }} />
                  音频
                </AntTag>
              </Space>
            </div>

            <Title level={5} style={{ marginBottom: 16 }}>
              <TagsOutlined style={{ marginRight: 8 }} />
              标签筛选
            </Title>
            <div style={{ marginBottom: 12 }}>
              <AntTag
                color={selectedTagIds.length === 0 && selectedType === 'all' ? 'blue' : 'default'}
                onClick={() => {
                  handleClearAllTags();
                  handleTypeSelect('all');
                }}
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
        <Content style={{ background: '#f5f5f5', overflow: 'auto' }}>
          <Tabs
            defaultActiveKey="assets"
            type="card"
            items={[
              {
                key: 'assets',
                label: (
                  <span>
                    <InboxOutlined />
                    素材库
                  </span>
                ),
                children: (
                  <div style={{ padding: '24px' }}>
                    {/* 信息汇总行 - 始终展示，不依赖素材是否存在 */}
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <Checkbox
                          checked={sortedAssets.length > 0 && selectedAssetIds.length > 0 && selectedAssetIds.length === sortedAssets.length}
                          indeterminate={sortedAssets.length > 0 && selectedAssetIds.length > 0 && selectedAssetIds.length < sortedAssets.length}
                          onChange={e => handleSelectAll(e.target.checked)}
                          disabled={sortedAssets.length === 0}
                        >
                          全选
                        </Checkbox>
                        <Text>
                          共 {sortedAssets.length} 个素材
                          {selectedType !== 'all' && (
                            <span style={{ marginLeft: 8 }}>
                              （类型：{selectedType === 'image' ? '图片' : selectedType === 'video' ? '视频' : '音频'}）
                            </span>
                          )}
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
                        {/* 时间段筛选 */}
                        <Select
                          placeholder="时间筛选"
                          style={{ width: dateFilterPreset === 'custom' && dateRange ? 260 : 130 }}
                          value={dateFilterPreset || undefined}
                          onChange={handleDatePresetChange}
                          allowClear
                          onClear={clearDateFilter}
                          suffixIcon={<CalendarOutlined />}
                          optionLabelProp="label"
                          dropdownRender={(menu) => (
                            <div onClick={(e) => {
                              // 点击自定义选项时，始终打开弹窗
                              const target = e.target as HTMLElement;
                              if (target.textContent?.includes('自定义') || target.closest('[data-custom-option]')) {
                                e.stopPropagation();
                                const now = dayjs();
                                setCustomDateRange(dateRange || [now.subtract(30, 'day'), now]);
                                setShowCustomDateModal(true);
                              }
                            }}>
                              {menu}
                            </div>
                          )}
                        >
                          <Option value="all" label="全部时间">全部时间</Option>
                          <Option value="7days" label="最近7天">最近7天</Option>
                          <Option value="30days" label="最近30天">最近30天</Option>
                          <Option value="120days" label="最近120天">最近120天</Option>
                          <Option 
                            value="custom" 
                            label={dateFilterPreset === 'custom' && dateRange && dateRange[0] && dateRange[1] 
                              ? `${dateRange[0].format('YYYY-MM-DD')} 至 ${dateRange[1].format('YYYY-MM-DD')}` 
                              : '自定义...'}
                            data-custom-option="true"
                          >
                            自定义...
                          </Option>
                        </Select>
                        
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

                    {sortedAssets.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
                        <InboxOutlined style={{ fontSize: '64px', marginBottom: 16 }} />
                        <div>暂无素材</div>
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
                  </div>
                )
              },
              {
                key: 'samples',
                label: (
                  <span>
                    <ExperimentOutlined />
                    样例图片
                  </span>
                ),
                children: <SampleImages />
              }
            ]}
          />
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

      {/* 自定义时间弹窗 */}
      <Modal
        title="选择时间范围"
        open={showCustomDateModal}
        onCancel={handleCustomDateCancel}
        footer={[
          <Button key="cancel" onClick={handleCustomDateCancel}>取消</Button>,
          <Button key="confirm" type="primary" onClick={handleCustomDateConfirm}>确认</Button>
        ]}
      >
        <div style={{ padding: '16px 0' }}>
          <RangePicker
            value={customDateRange}
            onChange={(dates) => setCustomDateRange(dates)}
            style={{ width: '100%' }}
          />
        </div>
      </Modal>

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

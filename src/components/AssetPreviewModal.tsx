import React, { useState, useEffect } from 'react';
import { Modal, Button, Tag as AntTag, Input, Space, message, Tooltip, Card, Row, Col, Timeline, Divider, Tabs, Badge, Select, Form, Radio } from 'antd';
import {
  DeleteOutlined,
  UndoOutlined,
  RedoOutlined,
  SaveOutlined,
  SyncOutlined,
  PlusOutlined,
  LeftOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  SettingOutlined,
  UploadOutlined,
  StarOutlined,
  StarFilled,
  CloseCircleOutlined,
  ExperimentOutlined,
  FileImageFilled,
  BranchesOutlined,
  NodeIndexOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { Asset, AiGeneration, GenerationType } from '../types';

const { TextArea } = Input;
const { Option } = Select;

interface AssetPreviewModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onTagUpdated: () => void;
  onDeleteAsset: (assetId: number) => Promise<void>;
}

interface ModelConfig {
  id?: number;
  model_id: string;
  model_name: string;
  model_type: 'image' | 'video';
  api_key: string;
  api_base_url: string;
  parameters: string;
  is_default: number;
}

type ViewItem = 
  | { type: 'original'; data: Asset }
  | { type: 'generation'; data: AiGeneration };

type GeneratingTask = {
  type: 'image' | 'video';
  taskId: string;
  status: string;
  originalAssetId: number;
  parentGenerationId?: number | null;
  prompt?: string;
  modelId?: string;
};

// 预设模型列表
const PRESET_IMAGE_MODELS = [
  { model_id: 'wanx2.7-image-pro', model_name: '万相 2.7 图生图 Pro', description: '复杂指令遵循和一致性全面提升，支持4K输出' },
  { model_id: 'qwen-image-2.0', model_name: '通义万相 图生图 2.0', description: '融合图片生成与编辑，更快更强' },
];

const PRESET_VIDEO_MODELS = [
  { model_id: 'wan2.7-i2v-2026-04-25', model_name: '万相 2.7 图生视频', description: '情绪动作表现升级，运镜丝滑呈现' },
  { model_id: 'happyhorse-1.0-t2v', model_name: 'HappyHorse 1.0', description: '影视级创意生成，还原极致动态细节' },
];

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
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [imgRefreshKey, setImgRefreshKey] = useState(0);
  const [editDescriptionBackup, setEditDescriptionBackup] = useState('');
  const [editPromptBackup, setEditPromptBackup] = useState('');

  const [generations, setGenerations] = useState<AiGeneration[]>([]);
  const [currentView, setCurrentView] = useState<ViewItem | null>(null);
  const [mainChain, setMainChain] = useState<AiGeneration[]>([]);
  const [childGenerations, setChildGenerations] = useState<AiGeneration[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');

  const [showModelConfig, setShowModelConfig] = useState(false);
  const [modelConfigTab, setModelConfigTab] = useState<'image' | 'video'>('image');
  const [imageModels, setImageModels] = useState<ModelConfig[]>([]);
  const [videoModels, setVideoModels] = useState<ModelConfig[]>([]);
  const [selectedImageModel, setSelectedImageModel] = useState<string>('');
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>('');
  const [activeGeneratingTasks, setActiveGeneratingTasks] = useState<GeneratingTask[]>([]);
  const [generationFilter, setGenerationFilter] = useState<'all' | 'image' | 'video'>('all');

  // 当前选中项的描述/提示词
  const [currentDescription, setCurrentDescription] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');

  // 模型配置表单
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [modelForm] = Form.useForm();

  useEffect(() => {
    if (asset && isOpen) {
      setRotation(0);
      setIsEditingDescription(false);
      setCurrentView({ type: 'original', data: asset });
      setCurrentDescription(asset.description || '');
      setCurrentPrompt('');
      loadGenerations();
      loadModelConfigs();
    }
  }, [asset, isOpen]);

  // 当 currentView 变化时，更新描述和提示词
  useEffect(() => {
    if (!currentView) return;
    if (currentView.type === 'original') {
      setCurrentDescription(currentView.data.description || '');
      setCurrentPrompt(currentView.data.prompt || '');
    } else {
      setCurrentDescription('');
      setCurrentPrompt(currentView.data.prompt || '');
    }
    setRotation(0);
    setIsEditingDescription(false);
  }, [currentView]);

  useEffect(() => {
    if (activeGeneratingTasks.length === 0) return;

    const pollInterval = setInterval(async () => {
      const newTasks = [...activeGeneratingTasks];
      let shouldUpdate = false;

      for (let i = 0; i < newTasks.length; i++) {
        const task = newTasks[i];
        try {
          const statusResult = await window.electronAPI.wanxGetTaskStatus(task.taskId, task.modelId);
          if (statusResult.success && statusResult.status) {
            if (task.status !== statusResult.status) {
              newTasks[i] = { ...task, status: statusResult.status };
              shouldUpdate = true;

              if (statusResult.status === 'SUCCEEDED') {
                try {
                  const completeResult = await window.electronAPI.wanxCompleteTask(
                    task.taskId,
                    task.originalAssetId,
                    task.parentGenerationId || null,
                    task.type === 'image' ? 'colored' : 'video',
                    task.prompt,
                    task.modelId
                  );

                  if (completeResult.success) {
                    message.success(task.type === 'image' ? '彩色图生成成功' : '视频生成成功');
                    newTasks.splice(i, 1);
                    i--;
                    shouldUpdate = true;
                    await loadGenerations();
                  }
                } catch (err) {
                  console.error('任务完成失败:', err);
                  newTasks.splice(i, 1);
                  i--;
                  shouldUpdate = true;
                }
              } else if (statusResult.status === 'FAILED') {
                message.error(statusResult.error || '生成失败');
                newTasks.splice(i, 1);
                i--;
                shouldUpdate = true;
              }
            }
          }
        } catch (err) {
          console.error('查询任务状态失败:', err);
        }
      }

      if (shouldUpdate) {
        setActiveGeneratingTasks([...newTasks]);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [activeGeneratingTasks]);

  const loadGenerations = async () => {
    if (!asset) return;
    try {
      const data = await window.electronAPI.getAiGenerationsByAsset(asset.id);
      setGenerations(data);
      // 如果当前选中的是 AI 生成版本，同步更新 currentView 中的数据
      if (currentView && currentView.type === 'generation') {
        const updatedGen = data.find((g: AiGeneration) => g.id === currentView.data.id);
        if (updatedGen) {
          setCurrentView({ type: 'generation', data: updatedGen });
        }
      }
      // 加载主线链
      const chainData = await window.electronAPI.getMainGenerationChain(asset.id);
      if (chainData) {
        setMainChain(chainData.chain);
      }
    } catch (error) {
      console.error('Failed to load generations:', error);
    }
  };

  const loadModelConfigs = async () => {
    try {
      const allConfigs = await window.electronAPI.getAllModelConfigs();
      const imgModels = allConfigs.filter((c: ModelConfig) => c.model_type === 'image');
      const vidModels = allConfigs.filter((c: ModelConfig) => c.model_type === 'video');
      setImageModels(imgModels);
      setVideoModels(vidModels);

      // 设置默认选中
      const defaultImg = imgModels.find((m: ModelConfig) => m.is_default === 1);
      const defaultVid = vidModels.find((m: ModelConfig) => m.is_default === 1);
      if (defaultImg) setSelectedImageModel(defaultImg.model_id);
      else if (imgModels.length > 0) setSelectedImageModel(imgModels[0].model_id);

      if (defaultVid) setSelectedVideoModel(defaultVid.model_id);
      else if (vidModels.length > 0) setSelectedVideoModel(vidModels[0].model_id);
    } catch (err) {
      console.error('加载模型配置失败:', err);
    }
  };

  const loadChildGenerations = async (generationId: number) => {
    try {
      const data = await window.electronAPI.getChildGenerations(generationId);
      setChildGenerations(data);
    } catch (error) {
      console.error('Failed to load child generations:', error);
    }
  };

  const handleViewItem = (item: ViewItem) => {
    setCurrentView(item);
    if (item.type === 'generation') {
      loadChildGenerations(item.data.id);
    } else {
      setChildGenerations([]);
    }
  };

  const handleSaveModelConfig = async (values: any) => {
    try {
      const config: Omit<ModelConfig, 'id' | 'created_at' | 'updated_at'> = {
        model_id: values.model_id,
        model_name: values.model_name,
        model_type: values.model_type,
        api_key: values.api_key,
        api_base_url: values.api_base_url || 'https://dashscope.aliyuncs.com/api/v1/services',
        parameters: values.parameters || '{}',
        is_default: values.is_default ? 1 : 0
      };
      await window.electronAPI.upsertModelConfig(config);
      message.success('模型配置已保存');
      setEditingModel(null);
      modelForm.resetFields();
      loadModelConfigs();
    } catch (err) {
      message.error('保存模型配置失败');
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      await window.electronAPI.deleteModelConfig(modelId);
      message.success('模型配置已删除');
      loadModelConfigs();
    } catch (err) {
      message.error('删除模型配置失败');
    }
  };

  const handleSetDefaultModel = async (modelId: string, modelType: 'image' | 'video') => {
    try {
      await window.electronAPI.setDefaultModel(modelId, modelType);
      message.success('默认模型已设置');
      loadModelConfigs();
    } catch (err) {
      message.error('设置默认模型失败');
    }
  };

  const handleAddPresetModel = (preset: { model_id: string; model_name: string }, modelType: 'image' | 'video') => {
    setEditingModel({
      model_id: preset.model_id,
      model_name: preset.model_name,
      model_type: modelType,
      api_key: '',
      api_base_url: 'https://dashscope.aliyuncs.com/api/v1/services',
      parameters: '{}',
      is_default: modelType === 'image' ? (imageModels.length === 0 ? 1 : 0) : (videoModels.length === 0 ? 1 : 0)
    });
    modelForm.setFieldsValue({
      model_id: preset.model_id,
      model_name: preset.model_name,
      model_type: modelType,
      api_key: '',
      api_base_url: 'https://dashscope.aliyuncs.com/api/v1/services',
      parameters: '{}',
      is_default: modelType === 'image' ? (imageModels.length === 0 ? true : false) : (videoModels.length === 0 ? true : false)
    });
  };

  const getCurrentImagePath = (): string | null => {
    if (!currentView) return null;
    if (currentView.type === 'original') {
      return currentView.data.file_type === 'image' ? currentView.data.file_path : null;
    }
    return currentView.data.generation_type !== 'video' ? currentView.data.file_path : null;
  };

  const getCurrentParentId = (): number | null => {
    if (!currentView) return null;
    if (currentView.type === 'generation') {
      return currentView.data.id;
    }
    return null;
  };

  const handleGenerateImage = async () => {
    if (!asset) return;
    if (!selectedImageModel) {
      message.warning('请先配置图片生成模型');
      setShowModelConfig(true);
      setModelConfigTab('image');
      return;
    }

    const imagePath = getCurrentImagePath();
    if (!imagePath) {
      message.warning('当前内容不是图片，无法生成彩色图');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await window.electronAPI.wanxGenerateImage(asset.id, imagePath, generatePrompt || undefined, selectedImageModel);

      if (result.success && result.task_id) {
        message.success('图生图任务已提交，正在生成...');
        setActiveGeneratingTasks(prev => [...prev, {
          type: 'image',
          taskId: result.task_id,
          status: 'PENDING',
          originalAssetId: asset.id,
          prompt: generatePrompt,
          modelId: selectedImageModel
        }]);
        setGeneratePrompt('');
      } else {
        message.error(result.error || '提交任务失败');
      }
    } catch (err) {
      message.error('生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!asset) return;
    if (!selectedVideoModel) {
      message.warning('请先配置视频生成模型');
      setShowModelConfig(true);
      setModelConfigTab('video');
      return;
    }

    const imagePath = getCurrentImagePath();
    if (!imagePath) {
      message.warning('当前内容不是图片，无法生成视频');
      return;
    }

    const parentId = getCurrentParentId();

    setIsGenerating(true);
    try {
      const result = await window.electronAPI.wanxGenerateVideo(asset.id, parentId, imagePath, generatePrompt || undefined, selectedVideoModel);

      if (result.success && result.task_id) {
        message.success('图生视频任务已提交，正在生成...');
        setActiveGeneratingTasks(prev => [...prev, {
          type: 'video',
          taskId: result.task_id,
          status: 'PENDING',
          originalAssetId: asset.id,
          parentGenerationId: parentId,
          prompt: generatePrompt,
          modelId: selectedVideoModel
        }]);
        setGeneratePrompt('');
      } else {
        message.error(result.error || '提交任务失败');
      }
    } catch (err) {
      message.error('生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportImage = async () => {
    if (!asset) return;
    setIsGenerating(true);
    try {
      const parentId = getCurrentParentId();
      const result = await window.electronAPI.importAiGeneration(asset.id, parentId, 'colored', generatePrompt || undefined);
      if (result.success) {
        message.success('已导入彩色版');
        setGeneratePrompt('');
        loadGenerations();
      } else if (result.error) {
        message.error(result.error);
      }
    } catch (error) {
      message.error('导入失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportVideo = async () => {
    if (!asset) return;
    setIsGenerating(true);
    try {
      const parentId = getCurrentParentId();
      const result = await window.electronAPI.importAiGeneration(asset.id, parentId, 'video', generatePrompt || undefined);
      if (result.success) {
        message.success('已导入视频');
        setGeneratePrompt('');
        loadGenerations();
      } else if (result.error) {
        message.error(result.error);
      }
    } catch (error) {
      message.error('导入失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRotateClockwise = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateAnticlockwise = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const handleResetRotation = () => setRotation(0);

  const handleSaveRotation = async () => {
    if (!currentView || rotation === 0) {
      message.warning('请先旋转图片');
      return;
    }

    const filePath = currentView.type === 'original' 
      ? currentView.data.file_path 
      : currentView.data.file_path;

    setIsSaving(true);
    try {
      const assetId = currentView.type === 'original' ? currentView.data.id : undefined;
      const generationId = currentView.type === 'generation' ? currentView.data.id : undefined;
      const result = await window.electronAPI.saveRotatedImage(filePath, rotation, assetId, generationId);
      if (result.success) {
        message.success('图片已保存并覆盖原图');
        setRotation(0);
        setImgRefreshKey(prev => prev + 1);
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
    if (!asset || !currentView) return;
    setIsSavingDescription(true);
    try {
      if (currentView.type === 'original') {
        // 保存原始素材的描述和提示词
        await window.electronAPI.updateAssetDescription(asset.id, currentDescription);
        await window.electronAPI.updateAssetPrompt(asset.id, currentPrompt);
        message.success('描述和提示词已保存');
        setIsEditingDescription(false);
        onTagUpdated();
      } else {
        const result = await window.electronAPI.updateGenerationPrompt(currentView.data.id, currentPrompt);
        if (result.success) {
          message.success('提示词已保存');
          setIsEditingDescription(false);
          // 直接更新 currentView 中的数据，避免等待 loadGenerations
          setCurrentView({
            type: 'generation',
            data: { ...currentView.data, prompt: currentPrompt }
          });
          // 同时刷新列表
          loadGenerations();
        } else {
          message.error('保存提示词失败');
        }
      }
    } catch (error) {
      console.error('Failed to save description:', error);
      message.error('保存失败');
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleCancelEdit = () => {
    setCurrentDescription(editDescriptionBackup);
    setCurrentPrompt(editPromptBackup);
    setIsEditingDescription(false);
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

  const handleDeleteGeneration = async (genId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await window.electronAPI.deleteAiGeneration(genId);
      message.success('已移除关联');
      loadGenerations();
    } catch (error) {
      console.error('Failed to delete generation:', error);
      message.error('移除失败');
    }
  };

  const handleSetMainGeneration = async (genId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!asset) return;
    try {
      await window.electronAPI.setMainGeneration(genId, asset.id);
      message.success('已设为主线');
      loadGenerations();
    } catch (error) {
      console.error('Failed to set main generation:', error);
      message.error('设置主线失败');
    }
  };

  const handleUnsetMainGeneration = async (genId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await window.electronAPI.unsetMainGeneration(genId);
      message.success('已取消主线');
      loadGenerations();
    } catch (error) {
      console.error('Failed to unset main generation:', error);
      message.error('取消主线失败');
    }
  };

  const getTypeLabel = (type: GenerationType) => {
    const labels: Record<GenerationType, string> = { colored: '彩色版', adapted: '适配版', video: 'AI视频', other: '其他版' };
    return labels[type] || type;
  };

  const getTypeIcon = (type: GenerationType) => type === 'video' ? <VideoCameraOutlined /> : <PictureOutlined />;
  const getTypeColor = (type: GenerationType) => {
    const colors: Record<GenerationType, string> = { colored: 'green', adapted: 'purple', video: 'cyan', other: 'default' };
    return colors[type] || 'default';
  };

  const isCurrentView = (item: ViewItem): boolean => {
    if (!currentView) return false;
    if (currentView.type !== item.type) return false;
    if (item.type === 'original') return currentView.data.id === item.data.id;
    return currentView.data.id === item.data.id;
  };

  const isImageView = (): boolean => {
    if (!currentView) return false;
    if (currentView.type === 'original') return currentView.data.file_type === 'image';
    return currentView.data.generation_type !== 'video';
  };

  // 构建左侧列表的所有项
  const getAllViewItems = (): ViewItem[] => {
    if (!asset) return [];
    const items: ViewItem[] = [{ type: 'original', data: asset }];
    generations.forEach(gen => {
      items.push({ type: 'generation', data: gen });
    });
    return items;
  };

  // 获取当前展示的文件路径
  const getCurrentFilePath = (): string | null => {
    if (!currentView) return null;
    if (currentView.type === 'original') return currentView.data.file_path;
    return currentView.data.file_path;
  };

  // 获取当前展示的文件类型
  const getCurrentFileType = (): 'image' | 'video' | 'audio' | null => {
    if (!currentView) return null;
    if (currentView.type === 'original') return currentView.data.file_type;
    return currentView.data.generation_type === 'video' ? 'video' : 'image';
  };

  const renderLeftSidebar = () => {
    const items = getAllViewItems();
    
    return (
      <div style={{ height: '100%', overflowY: 'auto', paddingRight: '8px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px', color: '#333' }}>
          <NodeIndexOutlined /> 内容列表
        </div>
        
        {/* 原始素材 */}
        {asset && (
          <div 
            onClick={() => handleViewItem({ type: 'original', data: asset })}
            style={{
              padding: '10px',
              marginBottom: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              border: isCurrentView({ type: 'original', data: asset }) ? '2px solid #1890ff' : '1px solid #e8e8e8',
              background: isCurrentView({ type: 'original', data: asset }) ? '#e6f7ff' : '#fff',
              transition: 'all 0.2s'
            }}
          >
            <Space>
              <AntTag color="blue">原始</AntTag>
              {asset.file_type === 'video' && <AntTag color="red">视频</AntTag>}
            </Space>
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#666', wordBreak: 'break-all' }}>
              {asset.file_name}
            </div>
            {asset.thumbnail_path && (
              <div style={{ width: '100%', aspectRatio: '16/9', marginTop: '6px', borderRadius: '4px', overflow: 'hidden' }}>
                <img 
                  src={`file://${asset.thumbnail_path}`} 
                  alt="thumb" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
            )}
          </div>
        )}

        {/* AI 生成版本 */}
        {generations.length > 0 && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#999' }}>AI 生成版本</div>
              <Space size="small">
                <AntTag color={generationFilter === 'all' ? 'blue' : 'default'} style={{ cursor: 'pointer' }} onClick={() => setGenerationFilter('all')}>全部</AntTag>
                <AntTag color={generationFilter === 'image' ? 'green' : 'default'} style={{ cursor: 'pointer' }} onClick={() => setGenerationFilter('image')}>AI图片</AntTag>
                <AntTag color={generationFilter === 'video' ? 'cyan' : 'default'} style={{ cursor: 'pointer' }} onClick={() => setGenerationFilter('video')}>AI视频</AntTag>
              </Space>
            </div>
            {generations
              .filter(gen => {
                if (generationFilter === 'all') return true;
                if (generationFilter === 'image') return gen.generation_type !== 'video';
                if (generationFilter === 'video') return gen.generation_type === 'video';
                return true;
              })
              .map(gen => (
                <div 
                  key={gen.id}
                  onClick={() => handleViewItem({ type: 'generation', data: gen })}
                  style={{
                    padding: '10px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: isCurrentView({ type: 'generation', data: gen }) ? '2px solid #1890ff' : '1px solid #e8e8e8',
                    background: isCurrentView({ type: 'generation', data: gen }) ? '#e6f7ff' : '#fff',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <Space wrap>
                    <AntTag color={getTypeColor(gen.generation_type)}>{getTypeIcon(gen.generation_type)}{getTypeLabel(gen.generation_type)}</AntTag>
                    {gen.is_main ? <AntTag color="gold"><StarFilled /> 主线</AntTag> : null}
                  </Space>
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#666', wordBreak: 'break-all' }}>
                    {gen.file_name}
                  </div>
                  {gen.thumbnail_path && gen.generation_type !== 'video' && (
                    <div style={{ width: '100%', aspectRatio: '16/9', marginTop: '6px', borderRadius: '4px', overflow: 'hidden' }}>
                      <img 
                        src={`file://${gen.thumbnail_path}`} 
                        alt="thumb" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                  )}
                  {gen.generation_type === 'video' && (
                    <div style={{ width: '100%', aspectRatio: '16/9', background: '#001529', borderRadius: '4px', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', overflow: 'hidden' }}>
                      <VideoCameraOutlined style={{ fontSize: '24px' }} />
                    </div>
                  )}
                  {/* 操作按钮 */}
                  <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                    {gen.is_main ? (
                      <Button size="small" icon={<StarFilled />} onClick={(e) => handleUnsetMainGeneration(gen.id, e)}>取消主线</Button>
                    ) : (
                      <Button size="small" icon={<StarOutlined />} onClick={(e) => handleSetMainGeneration(gen.id, e)}>设为主线</Button>
                    )}
                    <Button size="small" danger icon={<CloseCircleOutlined />} onClick={(e) => handleDeleteGeneration(gen.id, e)}>移除</Button>
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    );
  };

  const renderActionBar = () => {
    const isImg = isImageView();
    
    return (
      <div style={{ marginBottom: '16px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Space wrap>
            {isImg && (
              <>
                <Tooltip title="逆时针旋转90°"><Button icon={<UndoOutlined />} onClick={handleRotateAnticlockwise}>逆时针</Button></Tooltip>
                <Tooltip title="顺时针旋转90°"><Button icon={<RedoOutlined />} onClick={handleRotateClockwise}>顺时针</Button></Tooltip>
                <Button icon={<SyncOutlined />} onClick={handleResetRotation}>重置</Button>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveRotation} loading={isSaving} disabled={rotation === 0}>保存覆盖原图</Button>
              </>
            )}
          </Space>
          {isImg && rotation !== 0 && (
            <div style={{ color: '#1890ff' }}>当前旋转：{rotation}°</div>
          )}
          <Space wrap>
            <Button type="primary" icon={<PictureOutlined />} onClick={handleGenerateImage} loading={isGenerating} disabled={activeGeneratingTasks.some(t => t.type === 'image')}>
              {activeGeneratingTasks.some(t => t.type === 'image') ? '生成中...' : 'AI生成图片'}
            </Button>
            <Button type="primary" icon={<VideoCameraOutlined />} onClick={handleGenerateVideo} loading={isGenerating} disabled={activeGeneratingTasks.some(t => t.type === 'video')}>
              {activeGeneratingTasks.some(t => t.type === 'video') ? '生成中...' : 'AI视频'}
            </Button>
            <Button icon={<UploadOutlined />} onClick={handleImportImage} loading={isGenerating}>导入图片</Button>
            <Button icon={<UploadOutlined />} onClick={handleImportVideo} loading={isGenerating}>导入视频</Button>
          </Space>
          <TextArea placeholder="输入 AI 生成提示词（可选）..." value={generatePrompt} onChange={(e) => setGeneratePrompt(e.target.value)} rows={1} style={{ maxWidth: 400, margin: '0 auto' }} />
        </Space>
      </div>
    );
  };

  const renderPreviewContent = () => {
    const filePath = getCurrentFilePath();
    const fileType = getCurrentFileType();
    
    if (!filePath || !fileType) return null;

    const imageStyle: React.CSSProperties = {
      maxWidth: '100%', maxHeight: '60vh', display: 'block', margin: '0 auto',
      transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s ease'
    };

    return (
      <>
        {renderActionBar()}
        {fileType === 'image' ? (
          <div style={{ position: 'relative', zIndex: 1 }}>
            <img src={`file://${filePath}?v=${imgRefreshKey}`} alt="preview" style={imageStyle} />
          </div>
        ) : fileType === 'video' ? (
          <video src={`file://${filePath}`} controls style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block', margin: '0 auto' }} />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '64px', color: '#1890ff', marginBottom: '16px' }}>🎵</div>
            <audio src={`file://${filePath}`} controls style={{ width: '100%', maxWidth: '400px' }} />
          </div>
        )}
      </>
    );
  };

  const renderMainChain = () => {
    if (!asset) return null;
    
    return (
      <div style={{ marginTop: '16px', padding: '12px', background: '#f6ffed', borderRadius: '8px', border: '1px solid #b7eb8f' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px', color: '#52c41a' }}>
          <BranchesOutlined /> 版本主线
        </div>
        <Timeline mode="left" style={{ marginTop: '8px' }}>
          <Timeline.Item color="blue">
            <div style={{ fontSize: '12px' }}>
              <AntTag color="blue" size="small">原始</AntTag>
              <span style={{ color: '#666', marginLeft: '4px' }}>{asset.file_name}</span>
            </div>
          </Timeline.Item>
          {mainChain.map((gen, index) => (
            <Timeline.Item 
              key={gen.id} 
              color={gen.is_main ? 'gold' : 'gray'}
              dot={gen.is_main ? <StarFilled style={{ color: '#faad14' }} /> : undefined}
            >
              <div style={{ fontSize: '12px' }}>
                <AntTag color={getTypeColor(gen.generation_type)} size="small">{getTypeLabel(gen.generation_type)}</AntTag>
                {gen.is_main && <AntTag color="gold" size="small">主线</AntTag>}
                <span style={{ color: '#666', marginLeft: '4px' }}>{gen.file_name}</span>
                {gen.prompt && <div style={{ color: '#999', marginTop: '2px' }}>提示: {gen.prompt}</div>}
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </div>
    );
  };

  const renderChildGenerations = () => {
    if (childGenerations.length === 0) return null;
    
    return (
      <div style={{ marginTop: '16px', padding: '12px', background: '#e6f7ff', borderRadius: '8px', border: '1px solid #91d5ff' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px', color: '#1890ff' }}>
          <BranchesOutlined /> 衍生版本
        </div>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {childGenerations.map(child => (
            <Card key={child.id} size="small" style={{ cursor: 'pointer' }} onClick={() => handleViewItem({ type: 'generation', data: child })}>
              <Space>
                <AntTag color={getTypeColor(child.generation_type)}>{getTypeIcon(child.generation_type)}{getTypeLabel(child.generation_type)}</AntTag>
                <span style={{ fontSize: '12px', color: '#666' }}>{child.file_name}</span>
              </Space>
            </Card>
          ))}
        </Space>
      </div>
    );
  };

  const renderModelConfigModal = () => {
    const currentModels = modelConfigTab === 'image' ? imageModels : videoModels;
    const presetModels = modelConfigTab === 'image' ? PRESET_IMAGE_MODELS : PRESET_VIDEO_MODELS;

    return (
      <Modal
        title="AI 模型配置"
        open={showModelConfig}
        onCancel={() => { setShowModelConfig(false); setEditingModel(null); }}
        width={800}
        footer={[<Button key="close" onClick={() => { setShowModelConfig(false); setEditingModel(null); }}>关闭</Button>]}
      >
        <Tabs activeKey={modelConfigTab} onChange={(key) => { setModelConfigTab(key as 'image' | 'video'); setEditingModel(null); }}>
          <Tabs.TabPane tab={<span><PictureOutlined /> 图片生成模型</span>} key="image" />
          <Tabs.TabPane tab={<span><VideoCameraOutlined /> 视频生成模型</span>} key="video" />
        </Tabs>

        {editingModel ? (
          <Card title={editingModel.id ? '编辑模型配置' : '添加模型配置'} size="small" style={{ marginBottom: '16px' }}>
            <Form form={modelForm} onFinish={handleSaveModelConfig} layout="vertical">
              <Form.Item name="model_type" hidden><Input /></Form.Item>
              <Form.Item name="model_id" label="模型 ID" rules={[{ required: true }]}>
                <Input disabled={!!editingModel.id} placeholder="例如: wanx2.7-image-pro" />
              </Form.Item>
              <Form.Item name="model_name" label="模型名称" rules={[{ required: true }]}>
                <Input placeholder="例如: 万相 2.7 图生图 Pro" />
              </Form.Item>
              <Form.Item name="api_key" label="API Key" rules={[{ required: true }]}>
                <Input.Password placeholder="请输入 API Key" />
              </Form.Item>
              <Form.Item name="api_base_url" label="API Base URL" initialValue="https://dashscope.aliyuncs.com/api/v1/services">
                <Input placeholder="https://dashscope.aliyuncs.com/api/v1/services" />
              </Form.Item>
              <Form.Item name="parameters" label="额外参数 (JSON格式)" initialValue="{}">
                <TextArea rows={3} placeholder='{"size": "1024*1024"}' />
              </Form.Item>
              <Form.Item name="is_default" valuePropName="checked">
                <Radio>设为默认模型</Radio>
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">保存</Button>
                <Button onClick={() => { setEditingModel(null); modelForm.resetFields(); }}>取消</Button>
              </Space>
            </Form>
          </Card>
        ) : (
          <>
            <Card title="已配置模型" size="small" style={{ marginBottom: '16px' }}>
              {currentModels.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>暂无配置，请从下方添加预设模型</div>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {currentModels.map(model => (
                    <Card key={model.model_id} size="small">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Space>
                            <strong>{model.model_name}</strong>
                            {model.is_default === 1 && <AntTag color="blue">默认</AntTag>}
                          </Space>
                          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{model.model_id}</div>
                        </div>
                        <Space>
                          {model.is_default !== 1 && (
                            <Button size="small" onClick={() => handleSetDefaultModel(model.model_id, model.model_type)}>设为默认</Button>
                          )}
                          <Button size="small" onClick={() => {
                            setEditingModel(model);
                            modelForm.setFieldsValue({
                              ...model,
                              is_default: model.is_default === 1
                            });
                          }}>编辑</Button>
                          <Button size="small" danger onClick={() => handleDeleteModel(model.model_id)}>删除</Button>
                        </Space>
                      </div>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>

            <Card title="添加预设模型" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                {presetModels.map(preset => {
                  const isAdded = currentModels.some(m => m.model_id === preset.model_id);
                  return (
                    <Card key={preset.model_id} size="small" style={{ opacity: isAdded ? 0.6 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{preset.model_name}</strong>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{preset.description}</div>
                          <div style={{ fontSize: '11px', color: '#999' }}>{preset.model_id}</div>
                        </div>
                        <Button 
                          size="small" 
                          type="primary" 
                          disabled={isAdded}
                          onClick={() => handleAddPresetModel(preset, modelConfigTab)}
                        >
                          {isAdded ? '已添加' : '添加'}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </Space>
            </Card>
          </>
        )}
      </Modal>
    );
  };

  return (
    <Modal
      title={<div>{asset?.file_name}</div>}
      open={isOpen}
      onCancel={onClose}
      width="95vw"
      style={{ maxWidth: '1600px', top: 20 }}
      footer={
        asset ? [
          <Button key="delete" danger icon={<DeleteOutlined />} onClick={handleDeleteAsset}>删除素材</Button>,
          <Button key="close" onClick={onClose}>关闭</Button>
        ] : [<Button key="close" onClick={onClose}>关闭</Button>]
      }
    >
      <Row gutter={16}>
        {/* 左侧：内容列表 */}
        <Col span={5} style={{ maxHeight: '75vh', overflow: 'hidden' }}>
          {renderLeftSidebar()}
        </Col>

        {/* 中间：内容展示 + 操作 */}
        <Col span={13}>
          {renderPreviewContent()}
          
          {/* 描述区域 */}
          <Card title="描述与提示词" style={{ marginTop: '16px' }} size="small">
            {!isEditingDescription ? (
              <div onClick={() => {
                setEditDescriptionBackup(currentDescription);
                setEditPromptBackup(currentPrompt);
                setIsEditingDescription(true);
              }} style={{ cursor: 'pointer', minHeight: '40px' }}>
                {currentDescription || currentPrompt ? (
                  <div>
                    {currentDescription && <div style={{ marginBottom: '8px' }}><AntTag color="blue">描述</AntTag> {currentDescription}</div>}
                    {currentPrompt && <div><AntTag color="purple">AI提示词</AntTag> {currentPrompt}</div>}
                  </div>
                ) : (
                  <span style={{ color: '#999' }}>点击添加描述或提示词...</span>
                )}
              </div>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {currentView?.type === 'original' && (
                  <TextArea 
                    placeholder="添加素材描述..." 
                    value={currentDescription} 
                    onChange={(e) => setCurrentDescription(e.target.value)} 
                    rows={2} 
                  />
                )}
                <TextArea 
                  placeholder={currentView?.type === 'original' ? "AI 生成提示词（用于该原始素材）..." : "AI 生成提示词..."} 
                  value={currentPrompt} 
                  onChange={(e) => setCurrentPrompt(e.target.value)} 
                  rows={2} 
                />
                <Space>
                  <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveDescription} loading={isSavingDescription} size="small">保存</Button>
                  <Button icon={<CloseCircleOutlined />} onClick={handleCancelEdit} size="small">取消</Button>
                </Space>
              </Space>
            )}
          </Card>

          {renderMainChain()}
          {renderChildGenerations()}
        </Col>

        {/* 右侧：标签 + AI生成任务 + 版本信息 */}
        <Col span={6}>
          <Card title="标签管理" style={{ marginBottom: '16px' }} size="small">
            <Space wrap size={[8, 8]} style={{ marginBottom: '16px' }}>
              {asset?.tags?.map(tag => <AntTag key={tag.id} closable onClose={() => handleRemoveTag(tag.id)}>{tag.tag_name}</AntTag>)}
            </Space>
            <Input placeholder="添加标签..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onPressEnter={handleAddTag}
              addonAfter={<Button type="primary" size="small" onClick={handleAddTag}>添加</Button>} />
          </Card>

          <Card title="AI 模型" style={{ marginBottom: '16px' }} size="small">
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '2px' }}>
                  <PictureOutlined style={{ color: '#1890ff', marginRight: '4px' }} />
                  图片生成模型
                </div>
                <div style={{ fontSize: '13px', color: '#333', fontWeight: 500, paddingLeft: '16px' }}>
                  {imageModels.find(m => m.model_id === selectedImageModel)?.model_name || '未配置'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '2px' }}>
                  <VideoCameraOutlined style={{ color: '#52c41a', marginRight: '4px' }} />
                  视频生成模型
                </div>
                <div style={{ fontSize: '13px', color: '#333', fontWeight: 500, paddingLeft: '16px' }}>
                  {videoModels.find(m => m.model_id === selectedVideoModel)?.model_name || '未配置'}
                </div>
              </div>
              <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => setShowModelConfig(true)} style={{ padding: 0, marginTop: '4px' }}>
                配置模型
              </Button>
            </Space>
          </Card>

          <Card title="AI 任务" style={{ marginBottom: '16px' }} size="small">
            {activeGeneratingTasks.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: '12px 0' }}>暂无进行中的任务</div>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {activeGeneratingTasks.map(task => (
                  <Card key={task.taskId} size="small" style={{ background: '#fffbe6' }}>
                    <Space>
                      <AntTag color={task.type === 'image' ? 'green' : 'cyan'}>{task.type === 'image' ? <PictureOutlined /> : <VideoCameraOutlined />}{task.type === 'image' ? '彩色图' : '视频'}</AntTag>
                      <AntTag color="processing">{task.status === 'PENDING' ? '等待中' : task.status === 'RUNNING' ? '处理中' : task.status}</AntTag>
                    </Space>
                  </Card>
                ))}
              </Space>
            )}
          </Card>

          {/* 当前选中项的详细信息 */}
          {currentView && (
            <Card title="当前内容信息" size="small">
              <div style={{ fontSize: '12px', color: '#666' }}>
                <div><strong>名称:</strong> {currentView.type === 'original' ? currentView.data.file_name : currentView.data.file_name}</div>
                <div style={{ marginTop: '4px' }}><strong>类型:</strong> 
                  {currentView.type === 'original' ? 
                    (currentView.data.file_type === 'image' ? '原始图片' : currentView.data.file_type === 'video' ? '原始视频' : '音频') :
                    getTypeLabel(currentView.data.generation_type)
                  }
                </div>
                {currentView.type === 'generation' && currentView.data.parent_generation_id && (
                  <div style={{ marginTop: '4px' }}><strong>基于:</strong> 
                    {generations.find(g => g.id === currentView.data.parent_generation_id)?.file_name || '未知'}
                  </div>
                )}
                <div style={{ marginTop: '4px' }}><strong>时间:</strong> 
                  {new Date(currentView.type === 'original' ? currentView.data.created_at : currentView.data.created_at).toLocaleString()}
                </div>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {renderModelConfigModal()}
    </Modal>
  );
};

export default AssetPreviewModal;

import React, { useState, useEffect } from 'react';
import { Modal, Button, Tag as AntTag, Input, Space, message, Tooltip, Card, Row, Col, Timeline, Divider, Tabs } from 'antd';
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
  UploadOutlined
} from '@ant-design/icons';
import type { Asset, AiGeneration, GenerationType } from '../types';

const { TextArea } = Input;

interface AssetPreviewModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onTagUpdated: () => void;
  onDeleteAsset: (assetId: number) => Promise<void>;
}

type GeneratingTask = {
  type: 'image' | 'video';
  taskId: string;
  status: string;
  originalAssetId: number;
  parentGenerationId?: number | null;
  prompt?: string;
};

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

  const [generations, setGenerations] = useState<AiGeneration[]>([]);
  const [currentView, setCurrentView] = useState<'original' | 'generation'>('original');
  const [selectedGenerationId, setSelectedGenerationId] = useState<number | null>(null);
  const [generationChain, setGenerationChain] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');
  
  const [showApiKeyConfig, setShowApiKeyConfig] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [activeGeneratingTasks, setActiveGeneratingTasks] = useState<GeneratingTask[]>([]);

  useEffect(() => {
    if (asset && isOpen) {
      setDescription(asset.description || '');
      setRotation(0);
      setIsEditingDescription(false);
      setCurrentView('original');
      setSelectedGenerationId(null);
      loadGenerations();
      checkApiKeyConfig();
    }
  }, [asset, isOpen]);
  
  useEffect(() => {
    if (activeGeneratingTasks.length === 0) return;
    
    const pollInterval = setInterval(async () => {
      const newTasks = [...activeGeneratingTasks];
      let shouldUpdate = false;
      
      for (let i = 0; i < newTasks.length; i++) {
        const task = newTasks[i];
        try {
          const statusResult = await window.electronAPI.wanxGetTaskStatus(task.taskId);
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
                    task.prompt
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
    } catch (error) {
      console.error('Failed to load generations:', error);
    }
  };

  const loadGenerationChain = async (generationId: number) => {
    try {
      const data = await window.electronAPI.getAiGenerationChain(generationId);
      setGenerationChain(data);
    } catch (error) {
      console.error('Failed to load generation chain:', error);
    }
  };

  const handleViewGeneration = (generation: AiGeneration) => {
    setCurrentView('generation');
    setSelectedGenerationId(generation.id);
    loadGenerationChain(generation.id);
  };

  const handleViewOriginal = () => {
    setCurrentView('original');
    setSelectedGenerationId(null);
  };
  
  const checkApiKeyConfig = async () => {
    try {
      const result = await window.electronAPI.getWanXConfig();
      setHasApiKey(result.hasApiKey);
    } catch (err) {
      console.error('检查 API Key 配置失败:', err);
    }
  };
  
  const handleSaveApiKey = async () => {
    try {
      await window.electronAPI.setWanXConfig(apiKey);
      setHasApiKey(true);
      setShowApiKeyConfig(false);
      message.success('API Key 已保存');
    } catch (err) {
      message.error('保存 API Key 失败');
    }
  };
  
  const handleGenerateImage = async () => {
    if (!asset) return;
    if (!hasApiKey) {
      setShowApiKeyConfig(true);
      return;
    }
    
    setIsGenerating(true);
    try {
      const result = await window.electronAPI.wanxGenerateImage(asset.id, asset.file_path, generatePrompt || undefined);
      
      if (result.success && result.task_id) {
        message.success('图生图任务已提交，正在生成...');
        setActiveGeneratingTasks(prev => [...prev, {
          type: 'image',
          taskId: result.task_id,
          status: 'PENDING',
          originalAssetId: asset.id,
          prompt: generatePrompt
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
  
  const handleGenerateVideo = async (generation?: AiGeneration) => {
    if (!asset) return;
    if (!hasApiKey) {
      setShowApiKeyConfig(true);
      return;
    }
    
    setIsGenerating(true);
    try {
      const imagePath = generation?.file_path || asset.file_path;
      const parentId = generation?.id || null;
      
      const result = await window.electronAPI.wanxGenerateVideo(asset.id, parentId, imagePath, generatePrompt || undefined);
      
      if (result.success && result.task_id) {
        message.success('图生视频任务已提交，正在生成...');
        setActiveGeneratingTasks(prev => [...prev, {
          type: 'video',
          taskId: result.task_id,
          status: 'PENDING',
          originalAssetId: asset.id,
          parentGenerationId: parentId,
          prompt: generatePrompt
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

  const handleRotateClockwise = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateAnticlockwise = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const handleResetRotation = () => setRotation(0);

  const handleSaveRotation = async () => {
    if (!asset || rotation === 0) {
      message.warning('请先旋转图片');
      return;
    }

    setIsSaving(true);
    try {
      const filePath = currentView === 'original' ? asset.file_path : generations.find(g => g.id === selectedGenerationId)?.file_path;
      if (!filePath) return;

      const result = await window.electronAPI.saveRotatedImage(filePath, rotation);
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

  const getTypeLabel = (type: GenerationType) => {
    const labels: Record<GenerationType, string> = { colored: '彩色版', adapted: '适配版', video: 'AI视频', other: '其他版' };
    return labels[type] || type;
  };

  const getTypeIcon = (type: GenerationType) => type === 'video' || type === 'adapted' ? <VideoCameraOutlined /> : <PictureOutlined />;
  const getTypeColor = (type: GenerationType) => {
    const colors: Record<GenerationType, string> = { colored: 'green', adapted: 'purple', video: 'cyan', other: 'default' };
    return colors[type] || 'default';
  };

  const renderPreviewContent = () => currentView === 'original' || !asset ? renderOriginalPreview() : renderGenerationPreview();

  const renderOriginalPreview = () => {
    const imageStyle: React.CSSProperties = {
      maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto',
      transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s ease'
    };

    switch (asset?.file_type) {
      case 'image':
        return (
          <>
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              <Space>
                <Tooltip title="逆时针旋转90°"><Button icon={<UndoOutlined />} onClick={handleRotateAnticlockwise}>逆时针</Button></Tooltip>
                <Tooltip title="顺时针旋转90°"><Button icon={<RedoOutlined />} onClick={handleRotateClockwise}>顺时针</Button></Tooltip>
                {rotation !== 0 && (
                  <>
                    <Button icon={<SyncOutlined />} onClick={handleResetRotation}>重置</Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveRotation} loading={isSaving}>保存旋转</Button>
                  </>
                )}
              </Space>
              {rotation !== 0 && <div style={{ marginTop: '8px', color: '#1890ff' }}>当前旋转：{rotation}°</div>}
            </div>
            <img src={`file://${asset.file_path}`} alt={asset.file_name} style={imageStyle} />
          </>
        );
      case 'video':
        return <video src={`file://${asset.file_path}`} controls style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto' }} />;
      case 'audio':
        return (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '64px', color: '#1890ff', marginBottom: '16px' }}>🎵</div>
            <audio src={`file://${asset.file_path}`} controls style={{ width: '100%', maxWidth: '400px' }} />
          </div>
        );
      default:
        return null;
    }
  };

  const renderGenerationPreview = () => {
    const generation = generations.find(g => g.id === selectedGenerationId);
    if (!generation) return null;

    const isVideo = generation.generation_type === 'video';
    const isImage = generation.generation_type === 'colored' || generation.generation_type === 'adapted';

    return (
      <>
        <div style={{ marginBottom: '16px' }}>
          <Button type="link" icon={<LeftOutlined />} onClick={handleViewOriginal}>返回原始版</Button>
          <Space style={{ marginLeft: '16px' }}>
            <AntTag color={getTypeColor(generation.generation_type)}>{getTypeIcon(generation.generation_type)} {getTypeLabel(generation.generation_type)}</AntTag>
            {generation.prompt && <AntTag>{generation.prompt}</AntTag>}
          </Space>
          {isImage && (
            <>
              <Button type="primary" icon={<VideoCameraOutlined />} style={{ marginLeft: '16px', background: '#1890ff' }}
                onClick={() => handleGenerateVideo(generation)}
                loading={isGenerating || activeGeneratingTasks.some(t => t.type === 'video')}
                disabled={activeGeneratingTasks.some(t => t.type === 'video')}>
                {activeGeneratingTasks.some(t => t.type === 'video') ? '正在生成...' : '生成视频'}
              </Button>
              <Button icon={<UploadOutlined />} onClick={async () => {
                if (!asset) return;
                setIsGenerating(true);
                try {
                  const result = await window.electronAPI.importAiGeneration(asset.id, generation.id, 'video', generatePrompt || undefined);
                  if (result.success) { message.success('已从当前图片导入视频'); setGeneratePrompt(''); loadGenerations(); }
                  else if (result.error) { message.error(result.error); }
                } catch (error) { message.error('导入失败'); }
                finally { setIsGenerating(false); }
              }} loading={isGenerating}>导入视频</Button>
            </>
          )}
        </div>
        {isVideo ? (
          <video src={`file://${generation.file_path}`} controls style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto' }} />
        ) : (
          <img src={`file://${generation.file_path}`} alt={generation.file_name} style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto' }} />
        )}
      </>
    );
  };

  const renderGenerationTimeline = () => {
    if (!generationChain) return null;

    const items = [];
    items.push({ color: 'blue', children: <div><AntTag color="blue">原始简笔</AntTag><div style={{ marginTop: '8px' }}>{generationChain.originalAsset.file_name}</div></div> });

    if (generationChain.parentGeneration) {
      items.push({ color: 'green', children: <div>
        <AntTag color={getTypeColor(generationChain.parentGeneration.generation_type)}>{getTypeIcon(generationChain.parentGeneration.generation_type)}{getTypeLabel(generationChain.parentGeneration.generation_type)}</AntTag>
        <div style={{ marginTop: '8px' }}>{generationChain.parentGeneration.file_name}</div>
      </div> });
    }

    items.push({ color: 'purple', children: <div>
      <AntTag color={getTypeColor(generationChain.generation.generation_type)}>{getTypeIcon(generationChain.generation.generation_type)}{getTypeLabel(generationChain.generation.generation_type)}</AntTag>
      <AntTag color="red">当前</AntTag>
      <div style={{ marginTop: '8px' }}>{generationChain.generation.file_name}</div>
    </div> });

    generationChain.childGenerations.forEach((child: AiGeneration) => {
      items.push({ color: 'grey', children: <div>
        <AntTag color={getTypeColor(child.generation_type)}>{getTypeIcon(child.generation_type)}{getTypeLabel(child.generation_type)}</AntTag>
        <div style={{ marginTop: '8px' }}>{child.file_name}</div>
      </div> });
    });

    return <div style={{ marginTop: '24px' }}><Divider>版本链</Divider><Timeline items={items} /></div>;
  };

  return (
    <Modal
      title={<div>{asset?.file_name}{currentView === 'generation' && <AntTag style={{ marginLeft: '8px' }} color="purple">查看生成版本</AntTag>}</div>}
      open={isOpen}
      onCancel={onClose}
      width="90vw"
      style={{ maxWidth: '1400px' }}
      footer={
        asset && currentView === 'original' ? [
          <Button key="delete" danger icon={<DeleteOutlined />} onClick={handleDeleteAsset}>删除素材</Button>,
          <Button key="close" onClick={onClose}>关闭</Button>
        ] : [<Button key="close" onClick={onClose}>关闭</Button>]
      }
    >
      <Row gutter={24}>
        <Col span={15}>
          {renderPreviewContent()}
          {renderGenerationTimeline()}
        </Col>

        <Col span={9}>
          <Card title="素材描述" style={{ marginBottom: '16px' }}>
            {!isEditingDescription && description ? (
              <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: '4px', cursor: 'pointer', minHeight: '60px' }} onClick={() => setIsEditingDescription(true)}>{description}</div>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                <TextArea placeholder="添加素材描述..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} showCount />
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveDescription} loading={isSavingDescription} block>保存描述</Button>
              </Space>
            )}
          </Card>

          <Card title="标签管理" style={{ marginBottom: '16px' }}>
            <Space wrap size={[8, 8]} style={{ marginBottom: '16px' }}>
              {asset?.tags?.map(tag => <AntTag key={tag.id} closable onClose={() => handleRemoveTag(tag.id)}>{tag.tag_name}</AntTag>)}
            </Space>
            <Input placeholder="添加标签..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onPressEnter={handleAddTag}
              addonAfter={<Button type="primary" size="small" onClick={handleAddTag}>添加</Button>} />
          </Card>

          {currentView === 'original' && (
            <Card title={<Space>AI 生成内容<AntTag color={generations.length > 0 ? 'green' : 'default'}>{generations.length} 个版本</AntTag><Button type="text" size="small" icon={<SettingOutlined />} onClick={() => setShowApiKeyConfig(true)}>配置</Button></Space>}>
              
              {activeGeneratingTasks.length > 0 && <>
                <Divider orientation="left" plain style={{ margin: '12px 0', fontSize: '12px' }}>进行中的任务</Divider>
                <Space direction="vertical" style={{ width: '100%', marginBottom: '16px' }} size="small">
                  {activeGeneratingTasks.map(task => (
                    <Card key={task.taskId} size="small" style={{ background: '#fffbe6' }}>
                      <Space>
                        <AntTag color={task.type === 'image' ? 'green' : 'cyan'}>{task.type === 'image' ? <PictureOutlined /> : <VideoCameraOutlined />}{task.type === 'image' ? '彩色图生成' : '视频生成'}</AntTag>
                        <AntTag color="processing">{task.status === 'PENDING' ? '等待中' : task.status === 'RUNNING' ? '处理中' : task.status}</AntTag>
                      </Space>
                    </Card>
                  ))}
                </Space>
              </>}

              {generations.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '24px 0' }}>暂无 AI 生成内容</div>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Divider orientation="left" plain style={{ margin: '12px 0', fontSize: '12px' }}>图片版本</Divider>
                  {generations.filter(g => g.generation_type !== 'video').map(gen => (
                    <Card key={gen.id} size="small" style={{ cursor: 'pointer' }} hoverable onClick={() => handleViewGeneration(gen)}>
                      <Space><AntTag color={getTypeColor(gen.generation_type)}>{getTypeIcon(gen.generation_type)}{getTypeLabel(gen.generation_type)}</AntTag><span style={{ fontSize: '12px', color: '#666' }}>{new Date(gen.created_at).toLocaleString()}</span></Space>
                    </Card>
                  ))}
                  <Divider orientation="left" plain style={{ margin: '12px 0', fontSize: '12px' }}>视频版本</Divider>
                  {generations.filter(g => g.generation_type === 'video').length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#999', padding: '12px', fontSize: '12px' }}>暂无 AI 视频</div>
                  ) : (
                    generations.filter(g => g.generation_type === 'video').map(gen => (
                      <Card key={gen.id} size="small" style={{ cursor: 'pointer', background: '#e6f7ff' }} hoverable onClick={() => handleViewGeneration(gen)}>
                        <Space><AntTag color="cyan"><VideoCameraOutlined /> AI视频</AntTag><span style={{ fontSize: '12px', color: '#666' }}>{new Date(gen.created_at).toLocaleString()}</span></Space>
                      </Card>
                    ))
                  )}
                </Space>
              )}

              <Divider />
              <Space direction="vertical" style={{ width: '100%' }}>
                <TextArea placeholder="输入 AI 生成提示词（可选）..." value={generatePrompt} onChange={(e) => setGeneratePrompt(e.target.value)} rows={2} />
                <Tabs defaultActiveKey="generate" size="small">
                  <Tabs.TabPane tab="AI 生成" key="generate">
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      <Button type="primary" icon={<PictureOutlined />} onClick={handleGenerateImage} loading={isGenerating} block disabled={activeGeneratingTasks.some(t => t.type === 'image')}>
                        {activeGeneratingTasks.some(t => t.type === 'image') ? '正在生成...' : '生成彩色图'}
                      </Button>
                      {generations.filter(g => g.generation_type === 'colored' || g.generation_type === 'adapted').length > 0 ? (
                        generations.filter(g => g.generation_type === 'colored' || g.generation_type === 'adapted').map(gen => (
                          <Button key={gen.id} block icon={<VideoCameraOutlined />} style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}
                            onClick={() => handleGenerateVideo(gen)} loading={isGenerating} disabled={activeGeneratingTasks.some(t => t.type === 'video')}>
                            {activeGeneratingTasks.some(t => t.type === 'video') ? '正在生成...' : `从 ${getTypeLabel(gen.generation_type)} 生成视频`}
                          </Button>
                        ))
                      ) : (
                        <div style={{ color: '#999', fontSize: '12px', textAlign: 'center', padding: '8px' }}>先生成彩色版后才能创建视频</div>
                      )}
                    </Space>
                  </Tabs.TabPane>
                  <Tabs.TabPane tab="导入" key="import">
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      <Button icon={<UploadOutlined />} onClick={async () => { if (!asset) return; setIsGenerating(true); try { const result = await window.electronAPI.importAiGeneration(asset.id, null, 'colored', generatePrompt || undefined); if (result.success) { message.success('已导入彩色版'); setGeneratePrompt(''); loadGenerations(); } else if (result.error) message.error(result.error); } catch (error) { message.error('导入失败'); } finally { setIsGenerating(false); } }} loading={isGenerating} block>导入彩色版</Button>
                      <Button icon={<UploadOutlined />} onClick={async () => { if (!asset) return; setIsGenerating(true); try { const result = await window.electronAPI.importAiGeneration(asset.id, null, 'adapted', generatePrompt || undefined); if (result.success) { message.success('已导入适配版'); setGeneratePrompt(''); loadGenerations(); } else if (result.error) message.error(result.error); } catch (error) { message.error('导入失败'); } finally { setIsGenerating(false); } }} block>导入适配版</Button>
                      <Divider style={{ margin: '8px 0' }} />
                      {generations.filter(g => g.generation_type === 'colored' || g.generation_type === 'adapted').length > 0 ? (
                        generations.filter(g => g.generation_type === 'colored' || g.generation_type === 'adapted').map(gen => (
                          <Button key={gen.id} block icon={<UploadOutlined />} style={{ background: '#e6f7ff', borderColor: '#91d5ff' }} onClick={async () => { setIsGenerating(true); try { const result = await window.electronAPI.importAiGeneration(asset!.id, gen.id, 'video', generatePrompt || undefined); if (result.success) { message.success('已从 ' + getTypeLabel(gen.generation_type) + ' 导入视频'); setGeneratePrompt(''); loadGenerations(); } else if (result.error) message.error(result.error); } catch (error) { message.error('导入失败'); } finally { setIsGenerating(false); } }}>
                            从 {getTypeLabel(gen.generation_type)} 导入视频
                          </Button>
                        ))
                      ) : (
                        <div style={{ color: '#999', fontSize: '12px', textAlign: 'center', padding: '8px' }}>先生成彩色版或适配版后才能创建视频</div>
                      )}
                    </Space>
                  </Tabs.TabPane>
                </Tabs>
              </Space>
            </Card>
          )}
        </Col>
      </Row>

      <Modal
        title="配置阿里万相 API Key"
        open={showApiKeyConfig}
        onCancel={() => setShowApiKeyConfig(false)}
        footer={[<Button key="cancel" onClick={() => setShowApiKeyConfig(false)}>取消</Button>, <Button key="save" type="primary" onClick={handleSaveApiKey}>保存</Button>]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input.Password placeholder="请输入 API Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          <div style={{ fontSize: '12px', color: '#666' }}>请从阿里云百炼控制台获取 API Key</div>
        </Space>
      </Modal>
    </Modal>
  );
};

export default AssetPreviewModal;

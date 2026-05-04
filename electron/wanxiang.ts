import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import { getDefaultModelConfig, ModelConfig } from './database';

// 任务状态类型
export type TaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';

export interface ImageGenerationResult {
  url: string;
  task_id: string;
  status: TaskStatus;
  error?: string;
}

export interface VideoGenerationResult {
  url: string;
  task_id: string;
  status: TaskStatus;
  error?: string;
}

// 将图片文件转为base64
function imageToBase64(filePath: string): string {
  const imageBuffer = fs.readFileSync(filePath);
  const base64 = imageBuffer.toString('base64');
  const ext = path.extname(filePath).toLowerCase().slice(1);
  const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  return `data:${mimeType};base64,${base64}`;
}

function createAxiosInstance(apiKey: string, apiBaseUrl?: string): AxiosInstance {
  return axios.create({
    baseURL: apiBaseUrl || 'https://dashscope.aliyuncs.com/api/v1/services',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable'
    },
    timeout: 60000
  });
}

// 获取模型配置的 API 端点
function getApiEndpoint(modelConfig: ModelConfig, taskType: 'image' | 'video'): string {
  const baseUrl = modelConfig.api_base_url || 'https://dashscope.aliyuncs.com/api/v1/services';
  if (taskType === 'image') {
    return `${baseUrl}/aigc/wanx-v1/image-generation`;
  } else {
    return `${baseUrl}/aigc/wanx-v1/video-generation`;
  }
}

// 图生图
export async function generateImage(
  imagePath: string,
  prompt?: string,
  modelConfig?: ModelConfig
): Promise<{ task_id: string; status: TaskStatus }> {
  const config = modelConfig || getDefaultModelConfig('image');
  if (!config) {
    throw new Error('请先配置图片生成模型');
  }
  if (!config.api_key) {
    throw new Error('模型 API Key 未配置');
  }

  const base64Image = imageToBase64(imagePath);
  const instance = createAxiosInstance(config.api_key, config.api_base_url);
  const endpoint = getApiEndpoint(config, 'image');

  // 解析额外参数
  let extraParams: Record<string, any> = {};
  try {
    extraParams = JSON.parse(config.parameters || '{}');
  } catch (e) {
    extraParams = {};
  }

  const data: Record<string, any> = {
    model: config.model_id,
    input: {
      image: base64Image,
      prompt: prompt || '彩色化这张简笔画'
    },
    parameters: {
      size: extraParams.size || '1024*1024',
      ...extraParams
    }
  };

  try {
    const response = await instance.post(endpoint, data);
    const taskId = response.data.output.task_id;
    return { task_id: taskId, status: 'PENDING' };
  } catch (error: any) {
    console.error('图生图请求失败:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
}

// 图生视频
export async function generateVideo(
  imagePath: string,
  prompt?: string,
  modelConfig?: ModelConfig
): Promise<{ task_id: string; status: TaskStatus }> {
  const config = modelConfig || getDefaultModelConfig('video');
  if (!config) {
    throw new Error('请先配置视频生成模型');
  }
  if (!config.api_key) {
    throw new Error('模型 API Key 未配置');
  }

  const base64Image = imageToBase64(imagePath);
  const instance = createAxiosInstance(config.api_key, config.api_base_url);
  const endpoint = getApiEndpoint(config, 'video');

  // 解析额外参数
  let extraParams: Record<string, any> = {};
  try {
    extraParams = JSON.parse(config.parameters || '{}');
  } catch (e) {
    extraParams = {};
  }

  const data: Record<string, any> = {
    model: config.model_id,
    input: {
      image: base64Image,
      prompt: prompt || '让这张图片动起来'
    },
    parameters: {
      duration: extraParams.duration || 5,
      ...extraParams
    }
  };

  try {
    const response = await instance.post(endpoint, data);
    const taskId = response.data.output.task_id;
    return { task_id: taskId, status: 'PENDING' };
  } catch (error: any) {
    console.error('图生视频请求失败:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
}

// 查询任务状态
export async function getTaskStatus(
  taskId: string,
  modelConfig?: ModelConfig
): Promise<{
  status: TaskStatus;
  url?: string;
  error?: string;
}> {
  const config = modelConfig || getDefaultModelConfig('image') || getDefaultModelConfig('video');
  if (!config) {
    throw new Error('模型配置未找到');
  }
  if (!config.api_key) {
    throw new Error('模型 API Key 未配置');
  }

  const instance = createAxiosInstance(config.api_key, config.api_base_url);
  const baseUrl = config.api_base_url || 'https://dashscope.aliyuncs.com/api/v1/services';

  try {
    const response = await instance.get(`${baseUrl}/aigc/async-result/${taskId}`);
    
    const status = response.data.output.task_status;
    const taskStatus = status as TaskStatus;

    if (taskStatus === 'SUCCEEDED') {
      const resultUrl = response.data.output.results?.[0]?.url;
      return { status: taskStatus, url: resultUrl };
    } else if (taskStatus === 'FAILED') {
      const error = response.data.output.error || '生成失败';
      return { status: taskStatus, error };
    } else {
      return { status: taskStatus };
    }
  } catch (error: any) {
    console.error('查询任务状态失败:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
}

// 轮询等待任务完成
export async function waitForTaskCompletion(
  taskId: string,
  modelConfig?: ModelConfig,
  pollInterval: number = 3000,
  maxPolls: number = 120
): Promise<{ url: string; error?: string }> {
  for (let i = 0; i < maxPolls; i++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    const result = await getTaskStatus(taskId, modelConfig);
    
    if (result.status === 'SUCCEEDED' && result.url) {
      return { url: result.url };
    } else if (result.status === 'FAILED') {
      throw new Error(result.error || '生成任务失败');
    }
  }
  
  throw new Error('任务超时，超过最大轮询次数');
}

// 下载图片或视频到本地
export async function downloadToFile(
  url: string,
  destPath: string
): Promise<string> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer'
  });

  fs.writeFileSync(destPath, Buffer.from(response.data));
  return destPath;
}

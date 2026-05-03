import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';

// 阿里万相 API 配置
const API_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/services';
const WANX_V1_IMAGE = `${API_BASE_URL}/aigc/wanx-v1/image-generation`;
const WANX_V1_VIDEO = `${API_BASE_URL}/aigc/wanx-v1/video-generation`;
const WANX_V1_TASK = `${API_BASE_URL}/aigc/async-result`;

export interface WanXConfig {
  apiKey: string;
  models: {
    image: string;
    video: string;
  };
}

// 默认配置
const DEFAULT_CONFIG: WanXConfig = {
  apiKey: '',
  models: {
    image: 'wanx-v1',
    video: 'wanx-v1-video-generation'
  }
};

// 从配置文件读取或使用默认
let config: WanXConfig = { ...DEFAULT_CONFIG };

export function setWanXConfig(newConfig: Partial<WanXConfig>) {
  config = { ...config, ...newConfig };
}

export function getWanXConfig(): WanXConfig {
  return { ...config };
}

const createAxiosInstance = (apiKey: string): AxiosInstance => {
  return axios.create({
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable'
    },
    timeout: 60000
  });
};

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

// 图生图
export async function generateImage(
  imagePath: string,
  prompt?: string,
  model: string = 'wanx-v1'
): Promise<{ task_id: string; status: TaskStatus }> {
  if (!config.apiKey) {
    throw new Error('请先配置阿里万相 API Key');
  }

  const base64Image = imageToBase64(imagePath);

  const instance = createAxiosInstance(config.apiKey);

  const data = {
    model,
    input: {
      image: base64Image,
      prompt: prompt || '彩色化这张简笔画'
    },
    parameters: {
      size: '1024*1024'
    }
  };

  try {
    const response = await instance.post(WANX_V1_IMAGE, data);
    const taskId = response.data.output.task_id;
    return { task_id: taskId, status: 'PENDING' };
  } catch (error: any) {
    console.error('阿里万相图生图请求失败:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
}

// 图生视频
export async function generateVideo(
  imagePath: string,
  prompt?: string,
  model: string = 'wanx-v1-video-generation'
): Promise<{ task_id: string; status: TaskStatus }> {
  if (!config.apiKey) {
    throw new Error('请先配置阿里万相 API Key');
  }

  const base64Image = imageToBase64(imagePath);

  const instance = createAxiosInstance(config.apiKey);

  const data = {
    model,
    input: {
      image: base64Image,
      prompt: prompt || '让这张图片动起来'
    },
    parameters: {
      duration: 5
    }
  };

  try {
    const response = await instance.post(WANX_V1_VIDEO, data);
    const taskId = response.data.output.task_id;
    return { task_id: taskId, status: 'PENDING' };
  } catch (error: any) {
    console.error('阿里万相图生视频请求失败:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
}

// 查询任务状态
export async function getTaskStatus(taskId: string): Promise<{
  status: TaskStatus;
  url?: string;
  error?: string;
}> {
  if (!config.apiKey) {
    throw new Error('请先配置阿里万相 API Key');
  }

  const instance = createAxiosInstance(config.apiKey);

  try {
    const response = await instance.get(`${WANX_V1_TASK}/${taskId}`);
    
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
  pollInterval: number = 3000,
  maxPolls: number = 120
): Promise<{ url: string; error?: string }> {
  for (let i = 0; i < maxPolls; i++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    const result = await getTaskStatus(taskId);
    
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
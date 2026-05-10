import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import { getDefaultModelConfig, ModelConfig } from './database';

// 任务状态类型
export type TaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';

export interface TaskResult {
  status: TaskStatus;
  url?: string;
  error?: string;
  errorCode?: string;
  requestId?: string;
}

export interface TaskCreationResult {
  task_id: string;
  status: TaskStatus;
  url?: string;  // 同步调用直接返回图片URL
  error?: string;
  errorCode?: string;
  requestId?: string;
}

// 将图片文件转为base64
function imageToBase64(filePath: string): string {
  const imageBuffer = fs.readFileSync(filePath);
  const base64 = imageBuffer.toString('base64');
  const ext = path.extname(filePath).toLowerCase().slice(1);
  const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  return `data:${mimeType};base64,${base64}`;
}

function createAxiosInstance(apiKey: string, apiBaseUrl?: string, asyncMode: boolean = true): AxiosInstance {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  if (asyncMode) {
    headers['X-DashScope-Async'] = 'enable';
  }
  return axios.create({
    baseURL: apiBaseUrl || 'https://dashscope.aliyuncs.com/api/v1/services',
    headers,
    timeout: 60000
  });
}

// 获取模型配置的 API 端点
function getApiEndpoint(modelConfig: ModelConfig, taskType: 'image' | 'video'): string {
  // 确保 baseUrl 没有尾随斜杠
  const baseUrl = (modelConfig.api_base_url || 'https://dashscope.aliyuncs.com/api/v1/services').replace(/\/+$/, '');
  // 万相 2.7 图片模型使用 image-generation 端点（异步调用）
  if (taskType === 'image' && (modelConfig.model_id.startsWith('wan2.7') || modelConfig.model_id.startsWith('wanx2.7'))) {
    return `${baseUrl}/aigc/image-generation/generation`;
  }
  // 万相 2.7 视频模型使用 video-generation 端点
  if (taskType === 'video' && modelConfig.model_id.startsWith('wan2.7')) {
    return `${baseUrl}/aigc/video-generation/video-synthesis`;
  }
  // 旧版万相 API
  if (taskType === 'image') {
    return `${baseUrl}/aigc/wanx-v1/image-generation`;
  } else {
    return `${baseUrl}/aigc/wanx-v1/video-generation`;
  }
}

// 创建图生图任务（图像编辑）
export async function generateImage(
  imagePath: string,
  prompt?: string,
  modelConfig?: ModelConfig
): Promise<TaskCreationResult> {
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

  const isNewApi = config.model_id.startsWith('wan2.7') || config.model_id.startsWith('wanx2.7');
  
  let data: Record<string, any>;
  
  if (isNewApi) {
    // 万相 2.7 新格式：使用 messages 格式（图像编辑）
    data = {
      model: config.model_id,
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { image: base64Image },
              { text: prompt || '彩色化这张简笔画，让画面更加生动精美' }
            ]
          }
        ]
      },
      parameters: {
        size: extraParams.size || '2K',
        n: extraParams.n || 1,
        watermark: extraParams.watermark !== undefined ? extraParams.watermark : false,
        ...extraParams
      }
    };
  } else {
    // 旧版 API 格式
    data = {
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
  }

  try {
    const response = await instance.post(endpoint, data);

    // 检查是否有错误（API 返回了错误响应）
    if (response.data.code) {
      return {
        task_id: '',
        status: 'FAILED',
        error: `[API错误] ${response.data.message || '任务创建失败'}`,
        errorCode: response.data.code,
        requestId: response.data.request_id
      };
    }

    const output = response.data.output;
    const taskId = output?.task_id;
    if (!taskId) {
      return {
        task_id: '',
        status: 'FAILED',
        error: '[API错误] 未获取到任务ID',
        requestId: response.data.request_id
      };
    }

    return {
      task_id: taskId,
      status: 'PENDING',
      requestId: response.data.request_id
    };
  } catch (error: any) {
    // 区分网络错误和 API 错误
    console.error('图生图请求失败:', error.response?.data || error.message);
    
    if (error.response) {
      // 服务器返回了错误状态码（4xx, 5xx）
      const errorData = error.response.data;
      return {
        task_id: '',
        status: 'FAILED',
        error: `[API错误] ${errorData?.message || error.message}`,
        errorCode: errorData?.code || `HTTP_${error.response.status}`,
        requestId: errorData?.request_id
      };
    } else if (error.request) {
      // 请求已发送但没有收到响应（网络问题）
      return {
        task_id: '',
        status: 'FAILED',
        error: `[网络错误] 无法连接到服务器，请检查网络连接`,
        errorCode: 'NETWORK_ERROR'
      };
    } else {
      // 请求配置出错
      return {
        task_id: '',
        status: 'FAILED',
        error: `[请求错误] ${error.message}`,
        errorCode: 'REQUEST_ERROR'
      };
    }
  }
}

// 创建图生视频任务
export async function generateVideo(
  imagePath: string,
  prompt?: string,
  modelConfig?: ModelConfig
): Promise<TaskCreationResult> {
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

  const isNewApi = config.model_id.startsWith('wan2.7');
  
  let data: Record<string, any>;
  
  if (isNewApi) {
    // 万相 2.7 视频格式：使用 media 格式
    data = {
      model: config.model_id,
      input: {
        prompt: prompt || '让这张图片动起来，生成流畅的动态视频',
        media: [
          {
            type: 'first_frame',
            url: base64Image
          }
        ]
      },
      parameters: {
        resolution: extraParams.resolution || '720P',
        duration: extraParams.duration || 5,
        prompt_extend: extraParams.prompt_extend !== undefined ? extraParams.prompt_extend : true,
        watermark: extraParams.watermark !== undefined ? extraParams.watermark : false,
        ...extraParams
      }
    };
  } else {
    // 旧版 API 格式
    data = {
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
  }

  try {
    const response = await instance.post(endpoint, data);
    
    // 检查是否有错误
    if (response.data.code) {
      return {
        task_id: '',
        status: 'FAILED',
        error: response.data.message || '任务创建失败',
        errorCode: response.data.code,
        requestId: response.data.request_id
      };
    }
    
    const taskId = response.data.output?.task_id;
    if (!taskId) {
      return {
        task_id: '',
        status: 'FAILED',
        error: '[API错误] 未获取到任务ID',
        requestId: response.data.request_id
      };
    }
    
    return {
      task_id: taskId,
      status: 'PENDING',
      requestId: response.data.request_id
    };
  } catch (error: any) {
    // 区分网络错误和 API 错误
    console.error('图生视频请求失败:', error.response?.data || error.message);
    
    if (error.response) {
      // 服务器返回了错误状态码（4xx, 5xx）
      const errorData = error.response.data;
      return {
        task_id: '',
        status: 'FAILED',
        error: `[API错误] ${errorData?.message || error.message}`,
        errorCode: errorData?.code || `HTTP_${error.response.status}`,
        requestId: errorData?.request_id
      };
    } else if (error.request) {
      // 请求已发送但没有收到响应（网络问题）
      return {
        task_id: '',
        status: 'FAILED',
        error: `[网络错误] 无法连接到服务器，请检查网络连接`,
        errorCode: 'NETWORK_ERROR'
      };
    } else {
      // 请求配置出错
      return {
        task_id: '',
        status: 'FAILED',
        error: `[请求错误] ${error.message}`,
        errorCode: 'REQUEST_ERROR'
      };
    }
  }
}

// 查询任务状态
export async function getTaskStatus(
  taskId: string,
  modelConfig?: ModelConfig
): Promise<TaskResult> {
  const config = modelConfig || getDefaultModelConfig('image') || getDefaultModelConfig('video');
  if (!config) {
    throw new Error('模型配置未找到');
  }
  if (!config.api_key) {
    throw new Error('模型 API Key 未配置');
  }

  const instance = createAxiosInstance(config.api_key, config.api_base_url);

  try {
    // 万相 2.7 使用新的任务查询端点
    const response = await instance.get(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`);

    const output = response.data.output;
    const status = output?.task_status as TaskStatus;

    if (status === 'SUCCEEDED') {
      // 图片结果：在 choices[0].message.content[0].image 中
      let resultUrl: string | undefined;

      if (output.choices && output.choices[0]?.message?.content) {
        const content = output.choices[0].message.content;
        if (Array.isArray(content) && content[0]?.image) {
          resultUrl = content[0].image;
        }
      }

      // 视频结果：在 output.video_url 中
      if (!resultUrl && output.video_url) {
        resultUrl = output.video_url;
      }

      // 兼容旧格式
      if (!resultUrl && output.results?.[0]?.url) {
        resultUrl = output.results[0].url;
      }

      return {
        status,
        url: resultUrl,
        requestId: response.data.request_id
      };
    } else if (status === 'FAILED') {
      return {
        status,
        error: output?.error || '生成失败',
        requestId: response.data.request_id
      };
    } else {
      return {
        status: status || 'UNKNOWN',
        requestId: response.data.request_id
      };
    }
  } catch (error: any) {
    console.error('查询任务状态失败:', error.response?.data || error.message);
    const errorData = error.response?.data;
    return {
      status: 'FAILED',
      error: errorData?.message || error.message,
      errorCode: errorData?.code,
      requestId: errorData?.request_id
    };
  }
}

// 轮询等待任务完成（最长1分钟）
export async function waitForTaskCompletion(
  taskId: string,
  modelConfig?: ModelConfig,
  pollInterval: number = 3000,
  maxPolls: number = 20  // 20 * 3秒 = 60秒
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

import React from 'react';
import { Card, Row, Col, Typography, Divider, Space, Tag } from 'antd';

const { Title, Paragraph, Text } = Typography;

// CSS 动画关键帧
const animationStyles = `
@keyframes tailWag {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(15deg); }
  75% { transform: rotate(-15deg); }
}

@keyframes blink {
  0%, 90%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.1); }
}

@keyframes earTwitch {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-5deg); }
}

@keyframes cloudMove {
  0% { transform: translateX(-20px); }
  50% { transform: translateX(20px); }
  100% { transform: translateX(-20px); }
}

@keyframes smokeRise {
  0% { transform: translateY(0) scale(1); opacity: 0.8; }
  100% { transform: translateY(-40px) scale(1.5); opacity: 0; }
}

@keyframes petalSway {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(5deg); }
}

@keyframes sunPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes butterflyFly {
  0% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(30px, -20px) rotate(10deg); }
  50% { transform: translate(60px, 0) rotate(0deg); }
  75% { transform: translate(30px, 20px) rotate(-10deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
`;

const SampleImages: React.FC = () => {
  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <style>{animationStyles}</style>
      <Title level={2}>KidSpark 样例展示</Title>
      <Paragraph>
        展示 KidSpark AI 生成功能的原始简笔画、AI 彩色图效果和 CSS 动画视频演示。
      </Paragraph>

      {/* 样例 1: 小猫 */}
      <Divider orientation="left">样例 1: 小猫</Divider>
      <Row gutter={24} style={{ marginBottom: '32px' }}>
        <Col span={8}>
          <Card title="原始简笔画" bordered={true}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fafafa', padding: '24px' }}>
              <svg width="250" height="250" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                <circle cx="150" cy="100" r="70" fill="none" stroke="#333" strokeWidth="3" />
                <polygon points="90,60 70,10 130,35" fill="none" stroke="#333" strokeWidth="3" />
                <polygon points="210,60 230,10 170,35" fill="none" stroke="#333" strokeWidth="3" />
                <ellipse cx="125" cy="90" rx="15" ry="20" fill="none" stroke="#333" strokeWidth="3" />
                <ellipse cx="175" cy="90" rx="15" ry="20" fill="none" stroke="#333" strokeWidth="3" />
                <polygon points="150,110 135,130 165,130" fill="none" stroke="#333" strokeWidth="3" />
                <ellipse cx="100" cy="130" rx="25" ry="10" fill="none" stroke="#333" strokeWidth="2" />
                <ellipse cx="200" cy="130" rx="25" ry="10" fill="none" stroke="#333" strokeWidth="2" />
                <rect x="80" y="170" width="140" height="100" rx="10" fill="none" stroke="#333" strokeWidth="3" />
                <rect x="90" y="265" width="30" height="30" rx="5" fill="none" stroke="#333" strokeWidth="3" />
                <rect x="180" y="265" width="30" height="30" rx="5" fill="none" stroke="#333" strokeWidth="3" />
                <path d="M 80 220 Q 40 240 30 270" fill="none" stroke="#333" strokeWidth="3" />
              </svg>
            </div>
            <div style={{ marginTop: '12px', textAlign: 'center', color: '#666' }}>
              简单的线条简笔画 - 适合小朋友绘画
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="AI 彩色图" bordered={true}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fafafa', padding: '24px' }}>
              <svg width="250" height="250" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                <rect width="300" height="300" fill="#e6f7ff" />
                <circle cx="150" cy="100" r="70" fill="#fff3e0" stroke="#f57c00" strokeWidth="3" />
                <polygon points="90,60 70,10 130,35" fill="#ffcc80" stroke="#f57c00" strokeWidth="3" />
                <polygon points="210,60 230,10 170,35" fill="#ffcc80" stroke="#f57c00" strokeWidth="3" />
                <ellipse cx="125" cy="90" rx="15" ry="20" fill="#2196f3" stroke="#1565c0" strokeWidth="2" />
                <circle cx="120" cy="85" r="4" fill="#fff" />
                <circle cx="130" cy="95" r="2" fill="#fff" />
                <ellipse cx="175" cy="90" rx="15" ry="20" fill="#2196f3" stroke="#1565c0" strokeWidth="2" />
                <circle cx="170" cy="85" r="4" fill="#fff" />
                <circle cx="180" cy="95" r="2" fill="#fff" />
                <polygon points="150,110 135,130 165,130" fill="#f48fb1" stroke="#ec407a" strokeWidth="2" />
                <ellipse cx="100" cy="130" rx="25" ry="10" fill="#b3e5fc" stroke="#4fc3f7" strokeWidth="2" />
                <ellipse cx="200" cy="130" rx="25" ry="10" fill="#b3e5fc" stroke="#4fc3f7" strokeWidth="2" />
                <rect x="80" y="170" width="140" height="100" rx="10" fill="#ffcc80" stroke="#f57c00" strokeWidth="3" />
                <rect x="90" y="265" width="30" height="30" rx="5" fill="#ffcc80" stroke="#f57c00" strokeWidth="3" />
                <rect x="180" y="265" width="30" height="30" rx="5" fill="#ffcc80" stroke="#f57c00" strokeWidth="3" />
                <path d="M 80 220 Q 40 240 30 270" fill="none" stroke="#f57c00" strokeWidth="5" strokeLinecap="round" />
                <circle cx="110" cy="115" r="8" fill="#ffccbc" opacity="0.6" />
                <circle cx="190" cy="115" r="8" fill="#ffccbc" opacity="0.6" />
              </svg>
            </div>
            <div style={{ marginTop: '12px', textAlign: 'center', color: '#666' }}>
              AI 自动上色后的效果 - 丰富的色彩和细节
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="AI 视频演示 (CSS动画)" bordered={true}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fafafa', padding: '24px' }}>
              <svg width="250" height="250" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                <rect width="300" height="300" fill="#e6f7ff" />
                {/* 尾巴摇摆动画 */}
                <g style={{ transformOrigin: '80px 220px', animation: 'tailWag 2s ease-in-out infinite' }}>
                  <path d="M 80 220 Q 40 240 30 270" fill="none" stroke="#f57c00" strokeWidth="5" strokeLinecap="round" />
                </g>
                {/* 身体 */}
                <rect x="80" y="170" width="140" height="100" rx="10" fill="#ffcc80" stroke="#f57c00" strokeWidth="3" />
                <rect x="90" y="265" width="30" height="30" rx="5" fill="#ffcc80" stroke="#f57c00" strokeWidth="3" />
                <rect x="180" y="265" width="30" height="30" rx="5" fill="#ffcc80" stroke="#f57c00" strokeWidth="3" />
                {/* 头部 */}
                <circle cx="150" cy="100" r="70" fill="#fff3e0" stroke="#f57c00" strokeWidth="3" />
                {/* 耳朵抖动 */}
                <g style={{ transformOrigin: '100px 35px', animation: 'earTwitch 3s ease-in-out infinite' }}>
                  <polygon points="90,60 70,10 130,35" fill="#ffcc80" stroke="#f57c00" strokeWidth="3" />
                </g>
                <g style={{ transformOrigin: '200px 35px', animation: 'earTwitch 3s ease-in-out infinite 0.5s' }}>
                  <polygon points="210,60 230,10 170,35" fill="#ffcc80" stroke="#f57c00" strokeWidth="3" />
                </g>
                {/* 眼睛眨眼动画 */}
                <g style={{ transformOrigin: '125px 90px', animation: 'blink 4s ease-in-out infinite' }}>
                  <ellipse cx="125" cy="90" rx="15" ry="20" fill="#2196f3" stroke="#1565c0" strokeWidth="2" />
                  <circle cx="120" cy="85" r="4" fill="#fff" />
                  <circle cx="130" cy="95" r="2" fill="#fff" />
                </g>
                <g style={{ transformOrigin: '175px 90px', animation: 'blink 4s ease-in-out infinite 0.2s' }}>
                  <ellipse cx="175" cy="90" rx="15" ry="20" fill="#2196f3" stroke="#1565c0" strokeWidth="2" />
                  <circle cx="170" cy="85" r="4" fill="#fff" />
                  <circle cx="180" cy="95" r="2" fill="#fff" />
                </g>
                {/* 鼻子和胡须 */}
                <polygon points="150,110 135,130 165,130" fill="#f48fb1" stroke="#ec407a" strokeWidth="2" />
                <ellipse cx="100" cy="130" rx="25" ry="10" fill="#b3e5fc" stroke="#4fc3f7" strokeWidth="2" />
                <ellipse cx="200" cy="130" rx="25" ry="10" fill="#b3e5fc" stroke="#4fc3f7" strokeWidth="2" />
                {/* 腮红 */}
                <circle cx="110" cy="115" r="8" fill="#ffccbc" opacity="0.6" />
                <circle cx="190" cy="115" r="8" fill="#ffccbc" opacity="0.6" />
              </svg>
            </div>
            <div style={{ marginTop: '12px', textAlign: 'center', color: '#666' }}>
              CSS 动画模拟：尾巴摇摆、耳朵抖动、眼睛眨眼
            </div>
          </Card>
        </Col>
      </Row>

      {/* 样例 2: 房子 */}
      <Divider orientation="left">样例 2: 房子</Divider>
      <Row gutter={24} style={{ marginBottom: '32px' }}>
        <Col span={8}>
          <Card title="原始简笔画" bordered={true}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fafafa', padding: '24px' }}>
              <svg width="250" height="250" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                <rect x="60" y="150" width="180" height="130" fill="none" stroke="#333" strokeWidth="3" />
                <polygon points="150,50 30,150 270,150" fill="none" stroke="#333" strokeWidth="3" />
                <rect x="120" y="200" width="60" height="80" fill="none" stroke="#333" strokeWidth="3" />
                <circle cx="170" cy="245" r="6" fill="none" stroke="#333" strokeWidth="2" />
                <rect x="75" y="180" width="40" height="40" fill="none" stroke="#333" strokeWidth="3" />
                <line x1="95" y1="180" x2="95" y2="220" stroke="#333" strokeWidth="2" />
                <line x1="75" y1="200" x2="115" y2="200" stroke="#333" strokeWidth="2" />
                <rect x="185" y="180" width="40" height="40" fill="none" stroke="#333" strokeWidth="3" />
                <line x1="205" y1="180" x2="205" y2="220" stroke="#333" strokeWidth="2" />
                <line x1="185" y1="200" x2="225" y2="200" stroke="#333" strokeWidth="2" />
                <rect x="135" y="80" width="30" height="50" fill="none" stroke="#333" strokeWidth="3" />
              </svg>
            </div>
            <div style={{ marginTop: '12px', textAlign: 'center', color: '#666' }}>
              简单的房子简笔画 - 包含屋顶、窗户和门
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="AI 彩色图" bordered={true}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fafafa', padding: '24px' }}>
              <svg width="250" height="250" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                <rect width="300" height="300" fill="#e8f5e9" />
                <ellipse cx="70" cy="60" rx="30" ry="25" fill="#bbdefb" />
                <ellipse cx="100" cy="50" rx="25" ry="20" fill="#bbdefb" />
                <ellipse cx="230" cy="70" rx="35" ry="30" fill="#bbdefb" />
                <ellipse cx="200" cy="55" rx="30" ry="25" fill="#bbdefb" />
                <rect x="60" y="150" width="180" height="130" fill="#fff8e1" stroke="#ff9800" strokeWidth="3" />
                <polygon points="150,50 30,150 270,150" fill="#ef5350" stroke="#c62828" strokeWidth="3" />
                <rect x="120" y="200" width="60" height="80" fill="#8d6e63" stroke="#5d4037" strokeWidth="3" />
                <circle cx="170" cy="245" r="6" fill="#ffd54f" />
                <rect x="75" y="180" width="40" height="40" fill="#e1f5fe" stroke="#0277bd" strokeWidth="3" />
                <line x1="95" y1="180" x2="95" y2="220" stroke="#0277bd" strokeWidth="2" />
                <line x1="75" y1="200" x2="115" y2="200" stroke="#0277bd" strokeWidth="2" />
                <rect x="185" y="180" width="40" height="40" fill="#e1f5fe" stroke="#0277bd" strokeWidth="3" />
                <line x1="205" y1="180" x2="205" y2="220" stroke="#0277bd" strokeWidth="2" />
                <line x1="185" y1="200" x2="225" y2="200" stroke="#0277bd" strokeWidth="2" />
                <rect x="135" y="80" width="30" height="50" fill="#90a4ae" stroke="#546e7a" strokeWidth="3" />
                <rect x="0" y="270" width="300" height="30" fill="#81c784" />
              </svg>
            </div>
            <div style={{ marginTop: '12px', textAlign: 'center', color: '#666' }}>
              AI 上色后的房子 - 有天空、云朵和草地的完整场景
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="AI 视频演示 (CSS动画)" bordered={true}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fafafa', padding: '24px' }}>
              <svg width="250" height="250" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                <rect width="300" height="300" fill="#e8f5e9" />
                {/* 太阳脉动 */}
                <g style={{ transformOrigin: '250px 40px', animation: 'sunPulse 3s ease-in-out infinite' }}>
                  <circle cx="250" cy="40" r="25" fill="#ffd54f" stroke="#ff9800" strokeWidth="2" />
                  <line x1="250" y1="5" x2="250" y2="15" stroke="#ff9800" strokeWidth="2" />
                  <line x1="250" y1="65" x2="250" y2="75" stroke="#ff9800" strokeWidth="2" />
                  <line x1="215" y1="40" x2="225" y2="40" stroke="#ff9800" strokeWidth="2" />
                  <line x1="275" y1="40" x2="285" y2="40" stroke="#ff9800" strokeWidth="2" />
                </g>
                {/* 云朵移动 */}
                <g style={{ animation: 'cloudMove 6s ease-in-out infinite' }}>
                  <ellipse cx="70" cy="60" rx="30" ry="25" fill="#bbdefb" />
                  <ellipse cx="100" cy="50" rx="25" ry="20" fill="#bbdefb" />
                </g>
                <g style={{ animation: 'cloudMove 8s ease-in-out infinite 1s' }}>
                  <ellipse cx="230" cy="70" rx="35" ry="30" fill="#bbdefb" />
                  <ellipse cx="200" cy="55" rx="30" ry="25" fill="#bbdefb" />
                </g>
                {/* 房子 */}
                <rect x="60" y="150" width="180" height="130" fill="#fff8e1" stroke="#ff9800" strokeWidth="3" />
                <polygon points="150,50 30,150 270,150" fill="#ef5350" stroke="#c62828" strokeWidth="3" />
                {/* 烟囱冒烟 */}
                <g>
                  <circle cx="155" cy="65" r="8" fill="#eceff1" opacity="0.8" style={{ animation: 'smokeRise 2s ease-out infinite' }} />
                  <circle cx="160" cy="55" r="6" fill="#eceff1" opacity="0.6" style={{ animation: 'smokeRise 2s ease-out infinite 0.5s' }} />
                  <circle cx="165" cy="45" r="4" fill="#eceff1" opacity="0.4" style={{ animation: 'smokeRise 2s ease-out infinite 1s' }} />
                </g>
                <rect x="120" y="200" width="60" height="80" fill="#8d6e63" stroke="#5d4037" strokeWidth="3" />
                <circle cx="170" cy="245" r="6" fill="#ffd54f" />
                <rect x="75" y="180" width="40" height="40" fill="#e1f5fe" stroke="#0277bd" strokeWidth="3" />
                <line x1="95" y1="180" x2="95" y2="220" stroke="#0277bd" strokeWidth="2" />
                <line x1="75" y1="200" x2="115" y2="200" stroke="#0277bd" strokeWidth="2" />
                <rect x="185" y="180" width="40" height="40" fill="#e1f5fe" stroke="#0277bd" strokeWidth="3" />
                <line x1="205" y1="180" x2="205" y2="220" stroke="#0277bd" strokeWidth="2" />
                <line x1="185" y1="200" x2="225" y2="200" stroke="#0277bd" strokeWidth="2" />
                <rect x="135" y="80" width="30" height="50" fill="#90a4ae" stroke="#546e7a" strokeWidth="3" />
                <rect x="0" y="270" width="300" height="30" fill="#81c784" />
              </svg>
            </div>
            <div style={{ marginTop: '12px', textAlign: 'center', color: '#666' }}>
              CSS 动画模拟：云朵飘动、太阳脉动、烟囱冒烟
            </div>
          </Card>
        </Col>
      </Row>

      {/* 样例 3: 花朵 */}
      <Divider orientation="left">样例 3: 花朵</Divider>
      <Row gutter={24} style={{ marginBottom: '32px' }}>
        <Col span={8}>
          <Card title="原始简笔画" bordered={true}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fafafa', padding: '24px' }}>
              <svg width="250" height="250" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                <rect x="145" y="150" width="10" height="130" fill="none" stroke="#333" strokeWidth="3" />
                <ellipse cx="150" cy="80" rx="35" ry="40" fill="none" stroke="#333" strokeWidth="3" />
                <ellipse cx="95" cy="100" rx="35" ry="40" fill="none" stroke="#333" strokeWidth="3" />
                <ellipse cx="205" cy="100" rx="35" ry="40" fill="none" stroke="#333" strokeWidth="3" />
                <ellipse cx="105" cy="140" rx="35" ry="40" fill="none" stroke="#333" strokeWidth="3" />
                <ellipse cx="195" cy="140" rx="35" ry="40" fill="none" stroke="#333" strokeWidth="3" />
                <circle cx="150" cy="120" r="25" fill="none" stroke="#333" strokeWidth="3" />
                <path d="M 150 250 Q 120 230 90 240" fill="none" stroke="#333" strokeWidth="3" />
                <ellipse cx="80" cy="235" rx="20" ry="10" fill="none" stroke="#333" strokeWidth="2" />
              </svg>
            </div>
            <div style={{ marginTop: '12px', textAlign: 'center', color: '#666' }}>
              向日葵简笔画 - 包含花瓣、花心、茎和叶子
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="AI 彩色图" bordered={true}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fafafa', padding: '24px' }}>
              <svg width="250" height="250" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                <rect width="300" height="300" fill="#fff9c4" />
                <ellipse cx="50" cy="40" rx="40" ry="30" fill="#fff59d" />
                <ellipse cx="260" cy="50" rx="35" ry="25" fill="#fff59d" />
                <rect x="145" y="150" width="10" height="130" fill="#66bb6a" stroke="#388e3c" strokeWidth="3" />
                <ellipse cx="150" cy="80" rx="35" ry="40" fill="#ffeb3b" stroke="#ff9800" strokeWidth="2" />
                <ellipse cx="95" cy="100" rx="35" ry="40" fill="#ffeb3b" stroke="#ff9800" strokeWidth="2" />
                <ellipse cx="205" cy="100" rx="35" ry="40" fill="#ffeb3b" stroke="#ff9800" strokeWidth="2" />
                <ellipse cx="105" cy="140" rx="35" ry="40" fill="#ffeb3b" stroke="#ff9800" strokeWidth="2" />
                <ellipse cx="195" cy="140" rx="35" ry="40" fill="#ffeb3b" stroke="#ff9800" strokeWidth="2" />
                <circle cx="150" cy="120" r="25" fill="#5d4037" stroke="#3e2723" strokeWidth="3" />
                <path d="M 150 250 Q 120 230 90 240" fill="none" stroke="#66bb6a" strokeWidth="5" />
                <ellipse cx="80" cy="235" rx="20" ry="10" fill="#81c784" stroke="#388e3c" strokeWidth="2" />
                <rect x="0" y="275" width="300" height="25" fill="#81c784" />
              </svg>
            </div>
            <div style={{ marginTop: '12px', textAlign: 'center', color: '#666' }}>
              AI 上色后的向日葵 - 黄色的花瓣和棕色的花心
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="AI 视频演示 (CSS动画)" bordered={true}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fafafa', padding: '24px' }}>
              <svg width="250" height="250" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                <rect width="300" height="300" fill="#fff9c4" />
                {/* 太阳脉动 */}
                <g style={{ transformOrigin: '50px 40px', animation: 'sunPulse 4s ease-in-out infinite' }}>
                  <circle cx="50" cy="40" r="30" fill="#ffd54f" stroke="#ff9800" strokeWidth="2" />
                </g>
                {/* 茎 */}
                <rect x="145" y="150" width="10" height="130" fill="#66bb6a" stroke="#388e3c" strokeWidth="3" />
                {/* 叶子 */}
                <g style={{ transformOrigin: '90px 240px', animation: 'petalSway 3s ease-in-out infinite' }}>
                  <path d="M 150 250 Q 120 230 90 240" fill="none" stroke="#66bb6a" strokeWidth="5" />
                  <ellipse cx="80" cy="235" rx="20" ry="10" fill="#81c784" stroke="#388e3c" strokeWidth="2" />
                </g>
                {/* 花瓣摇摆动画 */}
                <g style={{ transformOrigin: '150px 120px', animation: 'petalSway 4s ease-in-out infinite' }}>
                  <ellipse cx="150" cy="80" rx="35" ry="40" fill="#ffeb3b" stroke="#ff9800" strokeWidth="2" />
                </g>
                <g style={{ transformOrigin: '150px 120px', animation: 'petalSway 4s ease-in-out infinite 0.3s' }}>
                  <ellipse cx="95" cy="100" rx="35" ry="40" fill="#ffeb3b" stroke="#ff9800" strokeWidth="2" />
                </g>
                <g style={{ transformOrigin: '150px 120px', animation: 'petalSway 4s ease-in-out infinite 0.6s' }}>
                  <ellipse cx="205" cy="100" rx="35" ry="40" fill="#ffeb3b" stroke="#ff9800" strokeWidth="2" />
                </g>
                <g style={{ transformOrigin: '150px 120px', animation: 'petalSway 4s ease-in-out infinite 0.9s' }}>
                  <ellipse cx="105" cy="140" rx="35" ry="40" fill="#ffeb3b" stroke="#ff9800" strokeWidth="2" />
                </g>
                <g style={{ transformOrigin: '150px 120px', animation: 'petalSway 4s ease-in-out infinite 1.2s' }}>
                  <ellipse cx="195" cy="140" rx="35" ry="40" fill="#ffeb3b" stroke="#ff9800" strokeWidth="2" />
                </g>
                {/* 花心 */}
                <circle cx="150" cy="120" r="25" fill="#5d4037" stroke="#3e2723" strokeWidth="3" />
                {/* 蝴蝶飞舞 */}
                <g style={{ animation: 'butterflyFly 8s ease-in-out infinite' }}>
                  <ellipse cx="250" cy="150" rx="10" ry="6" fill="#e91e63" />
                  <ellipse cx="240" cy="145" rx="8" ry="12" fill="#f48fb1" opacity="0.8" />
                  <ellipse cx="260" cy="145" rx="8" ry="12" fill="#f48fb1" opacity="0.8" />
                </g>
                <rect x="0" y="275" width="300" height="25" fill="#81c784" />
              </svg>
            </div>
            <div style={{ marginTop: '12px', textAlign: 'center', color: '#666' }}>
              CSS 动画模拟：花瓣摇摆、叶子摆动、蝴蝶飞舞、太阳脉动
            </div>
          </Card>
        </Col>
      </Row>

      <Divider />
      
      <Card title="KidSpark AI 生成流程">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Tag color="blue">1. 导入原始简笔画</Tag>
            <Text>小朋友自己绘制的简笔画，或者扫描上传</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Tag color="green">2. AI 自动上色</Tag>
            <Text>使用阿里万相 API 生成精美的彩色图片</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Tag color="purple">3. 生成 AI 视频</Tag>
            <Text>从彩色图生成动态视频，让作品活起来</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Tag color="cyan">4. 保存和管理</Tag>
            <Text>所有版本都保存，可以随时查看和管理</Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default SampleImages;

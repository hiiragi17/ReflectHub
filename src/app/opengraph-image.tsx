import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'ReflectHub - 3分で始める週次振り返り';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fafafa',
          backgroundImage: 'linear-gradient(to bottom right, #f0f9ff, #fafafa)',
        }}
      >
        {/* Logo/Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 20,
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            R
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #2563eb, #3b82f6)',
            backgroundClip: 'text',
            color: 'transparent',
            marginBottom: 20,
            display: 'flex',
          }}
        >
          ReflectHub
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 36,
            color: '#64748b',
            marginBottom: 40,
            display: 'flex',
          }}
        >
          3分で始める週次振り返り
        </div>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: 30,
            marginTop: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'white',
              padding: '20px 30px',
              borderRadius: 12,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: '#3b82f6',
                display: 'flex',
              }}
            >
              YWT
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'white',
              padding: '20px 30px',
              borderRadius: 12,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: '#10b981',
                display: 'flex',
              }}
            >
              KPT
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'white',
              padding: '20px 30px',
              borderRadius: 12,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: '#8b5cf6',
                display: 'flex',
              }}
            >
              継続的成長
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

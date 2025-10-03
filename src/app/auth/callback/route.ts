// app/auth/callback/route.ts (完全対応版)
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const error = searchParams.get('error');

  // OAuth エラーがある場合
  if (error) {
    return NextResponse.redirect(`${origin}/auth?error=${error}`);
  }

  if (code) {
    // Authorization Code Flow
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        return NextResponse.redirect(`${origin}/auth?error=exchange_failed`);
      }

      if (data.session) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch (error) {
      console.error('Authorization code processing error:', error);
      return NextResponse.redirect(`${origin}/auth?error=processing_failed`);
    }
  }
  
  const clientHandlerPage = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>認証処理中</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: #f5f5f5;
        }
        .container {
          text-align: center;
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 1rem auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>認証処理中...</h2>
        <div class="spinner"></div>
        <p id="status">認証情報を確認中</p>
      </div>

      <script>
        async function handleAuth() {
          try {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
              document.getElementById('status').textContent = 'セッションを設定中...';
  
              // セッション設定APIを呼び出し
              const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  access_token: accessToken,
                  refresh_token: refreshToken
                })
              });

              if (response.ok) {
                const result = await response.json();
                document.getElementById('status').textContent = '認証完了！リダイレクト中...';
                setTimeout(() => {
                  window.location.href = '${next}';
                }, 1000);
              } else {
                const errorText = await response.text();
                console.error('Session API error:', response.status, errorText);
                throw new Error(\`Session setup failed: \${response.status} - \${errorText}\`);
              }
            } else {
              console.error('Missing tokens:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
              throw new Error('No auth tokens found');
            }
          } catch (error) {
            console.error('Auth handler error:', error);
            document.getElementById('status').textContent = 'エラーが発生しました';
            setTimeout(() => {
              window.location.href = '/auth?error=client_handler_failed';
            }, 2000);
          }
        }
        
        setTimeout(handleAuth, 500);
      </script>
    </body>
    </html>
  `;

  return new Response(clientHandlerPage, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
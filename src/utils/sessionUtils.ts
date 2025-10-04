import { supabase } from '@/lib/supabase/client';

export class SessionUtils {
  /**
   * セッションの有効性をチェック
   */
  static async isSessionValid(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return false;
      
      // トークンの有効期限をチェック
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      
      return expiresAt ? expiresAt > now : false;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * セッションの残り時間を取得（秒）
   * 負の値も返す（期限切れの場合）
   */
  static async getSessionTimeRemaining(): Promise<number> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // expires_atがnullまたはundefinedの場合は0を返す
      if (session?.expires_at == null) return 0;
      
      const now = Math.floor(Date.now() / 1000);
      // 負の値も許可（期限切れを表現）
      return session.expires_at - now;
    } catch (error) {
      console.error('Session time calculation error:', error);
      return 0;
    }
  }

  /**
   * セッション自動延長の設定
   */
  static setupAutoRefresh(beforeExpiryMinutes = 5): () => void {
    const interval = setInterval(async () => {
      const timeRemaining = await this.getSessionTimeRemaining();
      
      // 期限切れ後でも、まだ有効なセッションがあれば更新を試行
      const shouldRefresh = timeRemaining <= beforeExpiryMinutes * 60;
      const hasValidSession = timeRemaining !== 0; // expires_atがnullでない
      
      if (shouldRefresh && hasValidSession) {
        const { error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('Auto-refresh failed:', error);
        } else {
        }
      }
    }, 60000); // 1分ごとにチェック

    return () => clearInterval(interval);
  }

  /**
   * セッション情報をログ出力（デバッグ用）
   */
  static async logSessionInfo(): Promise<void> {
    if (process.env.NODE_ENV !== 'development') return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const timeRemaining = await this.getSessionTimeRemaining();
        const isExpired = timeRemaining < 0;
      } else {
      }
    } catch (error) {
      console.error('Failed to log session info:', error);
    }
  }
}
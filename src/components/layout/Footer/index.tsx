import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* ReflectHub について */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              ReflectHub
            </h3>
            <p className="text-sm text-gray-600">
              YWTやKPTフレームワークを使った週次振り返りアプリ。3分で今週の振り返りを記録し、継続的な成長を実現しましょう。
            </p>
          </div>

          {/* リンク */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              リンク
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-600 hover:text-blue-600 transition"
                >
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-gray-600 hover:text-blue-600 transition"
                >
                  利用規約
                </Link>
              </li>
            </ul>
          </div>

          {/* お問い合わせ */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              サポート
            </h3>
            <p className="text-sm text-gray-600">
              ご質問やご要望がございましたら、お気軽にお問い合わせください。
            </p>
          </div>
        </div>

        {/* コピーライト */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            &copy; {currentYear} ReflectHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

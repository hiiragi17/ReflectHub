'use client';

import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/layout/Header';
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header
        isAuthenticated={!!user}
        userName={user?.name}
        onSignOut={handleSignOut}
        title="ReflectHub"
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          プライバシーポリシー
        </h1>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. 個人情報の収集
            </h2>
            <p className="text-gray-700 leading-relaxed">
              ReflectHub（以下「当サービス」）では、ユーザーの皆様が安心してサービスをご利用いただけるよう、以下の個人情報を収集させていただいております。
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed ml-4 space-y-2">
              <li>メールアドレス</li>
              <li>ユーザー名</li>
              <li>振り返り記録の内容</li>
              <li>サービス利用履歴</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. 個人情報の利用目的
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              収集した個人情報は、以下の目的で利用いたします。
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed ml-4 space-y-2">
              <li>サービスの提供・運営</li>
              <li>ユーザーサポート対応</li>
              <li>サービスの改善・新機能の開発</li>
              <li>利用規約違反の対応</li>
              <li>サービスに関するお知らせ</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. 個人情報の第三者提供
            </h2>
            <p className="text-gray-700 leading-relaxed">
              当サービスは、以下の場合を除き、ユーザーの同意なく第三者に個人情報を提供することはありません。
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed ml-4 space-y-2">
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要がある場合</li>
              <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. 個人情報の安全管理
            </h2>
            <p className="text-gray-700 leading-relaxed">
              当サービスは、個人情報の漏えい、滅失またはき損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Cookie（クッキー）について
            </h2>
            <p className="text-gray-700 leading-relaxed">
              当サービスでは、ユーザーの利便性向上のためにCookieを使用しています。Cookieは、ユーザーがウェブサイトを再訪問した際に、より快適にサービスをご利用いただくための技術です。Cookieの使用を希望されない場合は、ブラウザの設定により無効化することが可能です。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. プライバシーポリシーの変更
            </h2>
            <p className="text-gray-700 leading-relaxed">
              当サービスは、法令の変更等に伴い、本プライバシーポリシーを変更することがあります。変更後のプライバシーポリシーは、本ページに掲載した時点で効力を生じるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. お問い合わせ
            </h2>
            <p className="text-gray-700 leading-relaxed">
              本プライバシーポリシーに関するお問い合わせは、当サービス内のお問い合わせフォームよりご連絡ください。
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              最終更新日: {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

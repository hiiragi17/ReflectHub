'use client';

import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/layout/Header';
import { useRouter } from 'next/navigation';

export default function TermsPage() {
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
          利用規約
        </h1>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              第1条（適用）
            </h2>
            <p className="text-gray-700 leading-relaxed">
              本利用規約（以下「本規約」）は、ReflectHub（以下「当サービス」）が提供するサービスの利用条件を定めるものです。ユーザーの皆様には、本規約に従って当サービスをご利用いただきます。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              第2条（利用登録）
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              当サービスの利用を希望する方は、本規約に同意の上、当サービスの定める方法によって利用登録を申請し、当サービスがこれを承認することによって、利用登録が完了するものとします。
            </p>
            <p className="text-gray-700 leading-relaxed">
              当サービスは、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあり、その理由については一切の開示義務を負いません。
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed ml-4 space-y-2">
              <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
              <li>本規約に違反したことがある者からの申請である場合</li>
              <li>その他、当サービスが利用登録を相当でないと判断した場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              第3条（アカウント管理）
            </h2>
            <p className="text-gray-700 leading-relaxed">
              ユーザーは、自己の責任において、当サービスのアカウント情報を適切に管理するものとします。ユーザーは、いかなる場合にも、アカウント情報を第三者に譲渡または貸与することはできません。当サービスは、アカウント情報が第三者によって使用されたことによって生じた損害につき、一切の責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              第4条（禁止事項）
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              ユーザーは、当サービスの利用にあたり、以下の行為をしてはなりません。
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed ml-4 space-y-2">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>当サービスのサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
              <li>当サービスの運営を妨害するおそれのある行為</li>
              <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
              <li>他のユーザーに成りすます行為</li>
              <li>当サービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
              <li>その他、当サービスが不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              第5条（本サービスの提供の停止等）
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              当サービスは、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed ml-4 space-y-2">
              <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
              <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
              <li>コンピュータまたは通信回線等が事故により停止した場合</li>
              <li>その他、当サービスが本サービスの提供が困難と判断した場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              第6条（利用制限および登録抹消）
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              当サービスは、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、ユーザーに対して、本サービスの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed ml-4 space-y-2">
              <li>本規約のいずれかの条項に違反した場合</li>
              <li>登録事項に虚偽の事実があることが判明した場合</li>
              <li>その他、当サービスが本サービスの利用を適当でないと判断した場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              第7条（免責事項）
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              当サービスは、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。
            </p>
            <p className="text-gray-700 leading-relaxed">
              当サービスは、本サービスが永続的に利用できることを保証するものではなく、予告なくサービスの全部または一部を変更、中止、終了することがあります。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              第8条（サービス内容の変更等）
            </h2>
            <p className="text-gray-700 leading-relaxed">
              当サービスは、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              第9条（利用規約の変更）
            </h2>
            <p className="text-gray-700 leading-relaxed">
              当サービスは、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。変更後の利用規約は、本ページに掲載したときから効力を生じるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              第10条（準拠法・裁判管轄）
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              本規約の解釈にあたっては、日本法を準拠法とします。
            </p>
            <p className="text-gray-700 leading-relaxed">
              本サービスに関して紛争が生じた場合には、当サービスの所在地を管轄する裁判所を専属的合意管轄とします。
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

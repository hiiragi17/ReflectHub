# nonce 方式の CSP の調査 (2026-10-17)

[#136](https://github.com/hiiragi17/ReflectHub/pull/136) の CSP は、`script-src` に `'unsafe-inline'`
が残っている。このため、スクリプトを直接ページに注入する型の XSS (入力の取り扱いの不備など)
は CSP で防げない。nonce 方式にして、この穴を塞げるかを試作して調べた。

## 結論

**技術的には実現できる。** 試作では、`script-src 'self' 'nonce-…' 'strict-dynamic'` に切り替えても、
確認した4ページが問題なく動いた。代わりに、**全ページが動的レンダリングになる**。
マージする前に、Vercel 上での確認と、費用・速度の判断が必要。

## 試作の内容 (このブランチ)

- `middleware.ts`: リクエストごとに nonce を作り、リクエストヘッダと、レスポンスヘッダの両方に CSP を付ける。
  Next.js は、リクエストヘッダの CSP から nonce を取り出して、フレームワークのスクリプトに自動で付ける
- `src/app/layout.tsx`: `await connection()` で、全ページを動的レンダリングにする (nonce はリクエストごとに変わるため)
- `next.config.ts`: CSP を静的ヘッダから外す (残すと、2 つの CSP の共通部分になり、`'unsafe-inline'` なしの方が効く)
- `src/lib/securityHeaders.ts`: `nonce` / `omitCsp` オプションを追加

## 確認できたこと (本番ビルド、Chromium、ダミーの Supabase URL)

- `/` `/auth` `/terms` `/privacy` で、CSP 違反がなく、React のハイドレーションも完了した
- `script-src` に `'unsafe-inline'` がなく、リクエストごとに違う nonce が付いた
- 注入されたインラインのイベントハンドラ (`<img onerror=…>`) が**実行されず、ブロックされた**
  (現在の `'unsafe-inline'` ありの CSP では実行される)
- 既存のテスト (`middleware.test.ts` 15 件、`securityHeaders.test.ts`) が通る。lint もクリーン

## 影響とトレードオフ

| 項目 | 内容 |
|---|---|
| 静的 → 動的 | ビルド結果で、すべてのページが `○ (Static)` から `ƒ (Dynamic)` に変わる |
| CDN キャッシュ | 現在は静的に配信できる `/`・`/terms`・`/privacy` なども、リクエストごとに関数が実行される。Vercel の関数の実行回数・応答時間 (TTFB) が増える |
| 影響の大きさ | 大半のページはログインが必要で、もともと動的に近い。影響が大きいのは公開ページ (`/`・`/terms`・`/privacy`) |
| `style-src` | `'unsafe-inline'` は残る (Tailwind・Radix が `style` 属性を使うため)。スタイル注入の危険はスクリプトより小さい |
| 残る穴 | `'strict-dynamic'` のため、nonce の付いたスクリプトが作るスクリプトは許可される。nonce が漏れる経路 (反射型の注入など) があれば、迂回される |

## 未確認 (マージ前に確認する)

- [ ] **Vercel のプレビューでの動作。** Vercel Analytics・Speed Insights (`/_vercel/…` のスクリプト) が、`'strict-dynamic'` のもとで動くか (ローカルでは `/_vercel` が存在せず、確認できていない)
- [ ] **ログイン (Google OAuth) と、実際の Supabase との通信**
- [ ] **Service Worker (`public/sw.js`) との相性。** HTML をキャッシュするため、オフライン時にキャッシュされた HTML と CSP の nonce が合うか (Cache API は、レスポンスのヘッダも保存するため、合う見込みだが未確認)
- [ ] **性能。** 動的レンダリングによる TTFB の増加と、Vercel の関数の実行回数・料金の目安
- [ ] **PWA のインストール・通知** (`manifest` や `push` に影響しないこと)

## 代替案: SRI (Subresource Integrity)

Next.js 16 には、実験的な `experimental.sri` があり、静的生成のまま、ハッシュベースの厳密な CSP にできる
(公式ドキュメントの「Subresource Integrity (Experimental)」)。**今回は試していない。**
実験機能であり、Turbopack (Next.js 16 の既定) での対応状況も確認が必要。静的配信を維持したい場合は、
こちらも検討する価値がある。

## 推奨

1. 公開ページの配信コスト・速度が許容できるかを確認する (Vercel のプレビューで計測する)
2. 許容できるなら、この試作をベースに、上の「未確認」を確認してから PR にする
3. 許容できないなら、SRI を試す
4. どちらにも踏み切らない場合は、現状 (`'unsafe-inline'` あり) のままで、XSS を作り込まないこと
   (入力・出力の扱い、`dangerouslySetInnerHTML` を使わないこと) で防ぐ

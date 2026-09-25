import type { Metadata } from 'next';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const metadata: Metadata = { title: 'サポート | Phantom Gem', description: 'ファントムジェム（Phantom Gem）に関するお問い合わせ窓口です。' };
export default function SupportPage() {
  return <div className="legal-shell">
    <a className="legal-back" href={basePath + '/'}>← ホームへ戻る</a>
    <article className="legal-card">
      <h1>サポート</h1>
      <p>「Phantom Gem（ファントムジェム）」のご利用にあたって、不具合のご報告・ご質問・ご要望などがございましたら、下記のメールアドレスまでご連絡ください。内容を確認のうえ、順次対応いたします。</p>

      <h2>お問い合わせ先</h2>
      <p className="legal-contact">✉️ <a href="mailto:yusaku.fujiwara.phantomgem@gmail.com">yusaku.fujiwara.phantomgem@gmail.com</a></p>

      <h2>よくあるお問い合わせ</h2>
      <ul>
        <li>ゲームが正常に動作しない、フリーズする等の不具合報告</li>
        <li>ルール・遊び方に関するご質問（アプリ内の「遊び方」もあわせてご確認ください）</li>
        <li>機能追加のご要望、その他のご相談</li>
      </ul>
      <p>お問い合わせの際は、ご利用の端末（機種名・OSバージョン）と、発生した状況をできるだけ詳しくお知らせください。</p>

      <p className="legal-meta">プライバシーポリシーは<a href={basePath + '/privacy/'}>こちら</a>をご確認ください。</p>
    </article>
  </div>;
}

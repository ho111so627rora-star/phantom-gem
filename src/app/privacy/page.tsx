import type { Metadata } from 'next';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const metadata: Metadata = { title: 'プライバシーポリシー | Phantom Gem', description: 'ファントムジェム（Phantom Gem）のプライバシーポリシーです。' };
export default function PrivacyPage() {
  return <div className="legal-shell">
    <a className="legal-back" href={basePath + '/'}>← ホームへ戻る</a>
    <article className="legal-card">
      <h1>プライバシーポリシー</h1>
      <p>原作者・運営者「Yusaku Fujiwara」およびアプリ開発者「Sora Iida」（以下、「当方」といいます）は、提供するiOSアプリケーション「Phantom Gem」（以下、「本アプリ」といいます）におけるユーザー情報の取り扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」といいます）を定めます。</p>

      <h2>1. 取得する情報および利用目的</h2>
      <p>本アプリは、ユーザーの氏名、住所、電話番号、メールアドレス、クレジットカード情報などの個人を特定できる情報を収集・取得・保持することはありません。</p>
      <p>本アプリ内で発生するゲームプレイデータ（盤面状況、ルームID、マッチング情報等）は、オンライン対戦機能およびゲーム進行の提供のみに利用され、永続的な個人プロファイルとして蓄積されることはありません。</p>

      <h2>2. 外部送信・第三者提供</h2>
      <p>本アプリでは、取得した情報を第三者に提供、販売、または開示することはありません。</p>
      <p>また、本アプリ内にユーザーの行動履歴を追跡する第三者ターゲティング広告モジュール等は組み込まれておりません。</p>

      <h2>3. お問い合わせ時の個人情報の取り扱い</h2>
      <p>ユーザーがサポートや協業に関するお問い合わせの際、当方に送信される情報（メールアドレス、お名前、問い合わせ内容等）は、問い合わせへの回答および対応の目的にのみ使用し、適切に管理いたします。</p>

      <h2>4. プライバシーポリシーの変更</h2>
      <p>当方は、法令の改正やサービスの機能追加・変更等に伴い、本ポリシーを改定することがあります。重要な変更がある場合は、本ページまたはアプリ内にて速やかにお知らせいたします。</p>

      <h2>5. お問い合わせ窓口</h2>
      <p>本ポリシーまたは本アプリに関するお問い合わせ、協業のご相談は、下記窓口までお願いいたします。</p>
      <ul>
        <li>原作者・運営：Yusaku Fujiwara</li>
        <li>アプリ開発：Sora Iida</li>
        <li>連絡先メールアドレス：<a href="mailto:yusaku.fujiwara.phantomgem@gmail.com">yusaku.fujiwara.phantomgem@gmail.com</a></li>
      </ul>

      <p className="legal-meta">制定日：2026年9月25日</p>
    </article>
  </div>;
}

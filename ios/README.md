# Phantom Gem — iOS アプリの器（Capacitor）

このフォルダは Capacitor で自動生成した Xcode プロジェクトです。中身は「WebView で
https://ho111so627rora-star.github.io/phantom-gem/ を開くだけの器」で、ゲーム本体（HTML/CSS/JS）は
一切コピーしていません。サイトを更新すれば、アプリ側は何もしなくても最新版になります。

ここから先は **Mac + Xcode が必須**です（Apple の規定で、Windows では ipa のビルド・署名・提出ができません）。

## 前提

- Mac（Apple Silicon / Intel どちらでも可）
- Xcode（App Store から無料でインストール）
- Apple Developer Program 登録（年間 $99、個人 or 組織）
- Node.js がインストール済みであること（`npm install` を実行するため）

CocoaPods は不要です（Capacitor 8 は Swift Package Manager を使うため `pod install` の手順はありません）。

## 手順

1. このリポジトリを Mac に `git clone`（または `git pull`）する。
2. リポジトリ直下で `npm install` を実行する。
3. `npm run cap:sync` を実行する（`capacitor.config.ts` の内容や `mobile/www` の中身を
   `ios/` 側に反映する。中身を変えていなければ省略しても基本的に問題ない）。
4. `npm run cap:open:ios`、または直接 `ios/App/App.xcodeproj` を Xcode で開く。
5. Xcode 左側の `App` ターゲット →「Signing & Capabilities」タブで、
   - **Team**: 自分の Apple Developer アカウントのチームを選択
   - **Bundle Identifier**: `capacitor.config.ts` の `appId`（現在は仮の
     `com.phantomgem.app`）を、App Store Connect 側で実際に登録した値に変更
6. 実機または Simulator を選んで ▶ で起動確認。
7. 問題なければ Xcode メニューの Product → Archive → Distribute App → App Store Connect
   の流れでアップロードし、App Store Connect 側でスクリーンショット・説明文などを
   入力して審査に提出する。

## 変更が必要になりやすい項目

- **`capacitor.config.ts` の `appId`**: 上記の通り、実際に登録した Bundle ID に置き換える。
- **アプリ名**: `capacitor.config.ts` の `appName`（"Phantom Gem"）。日本語表記にしたい場合は
  `ios/App/App/Info.plist` の `CFBundleDisplayName` も合わせて変更する。
- **アイコン / 起動画面**: `ios/App/App/Assets.xcassets/AppIcon.appiconset` と
  `Splash.imageset` に生成済みの画像を配置済み。デザインを差し替えたい場合はこの2箇所を
  1024×1024（アイコン）・2732×2732（起動画面）の PNG で上書きする。

## 審査に出す前に確認すること

- Apple の審査は「Web サイトをそのまま WebView で表示しているだけのアプリ」を
  Guideline 4.2（Minimum Functionality）でリジェクトすることがあります。本作は
  3D の卓・アニメーション・BGM/効果音などインタラクティブなゲームなので基本的には
  問題にならないはずですが、審査コメントが付いた場合は個別に対応してください。
- Supabase 側の `JEWEL_ALLOWED_ORIGINS` は変更不要です。このアプリはあくまで
  `https://ho111so627rora-star.github.io` を開いているだけなので、通常の Safari と
  同じオリジンとして扱われます。

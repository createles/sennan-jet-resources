# 泉南市JETリソースポータル (Sennan City JETs Resource Portal)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Online-brightgreen)](https://sennan-jets.up.railway.app/)
[![Repository](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/createles/sennan-jet-resources)

<p align="right">
  🌐 <a href="./README.md">English</a> | <b>日本語</b>
</p>

大阪府泉南市のJETプログラム（語学指導等を行う外国青年誘致事業）参加者のための、フルスタックWebアプリケーション（一元化リソースポータル）です。公式ガイドへの迅速なアクセス、地域のリアルタイムなアップデート、認証機能付きのコミュニティ向けマーケットプレイス、そして全員が閲覧できる掲示板を提供することで、日々の生活や業務のワークフローを円滑にサポートします。

### 🌐 [ライブアプリケーションを表示する](https://sennan-jets.up.railway.app/)

---

## 🛠️ 技術スタック (Tech Stack)
**フロントエンド:** HTML5, CSS3, JavaScript (ES6+), EJS &nbsp;|&nbsp; **バックエンド:** Node.js, Express &nbsp;|&nbsp; **データベース & ORM:** PostgreSQL, Prisma &nbsp;|&nbsp; **ストレージ & ホスティング:** Supabase Storage, Railway

---

##  インタフェースプレビュー

| デスクトップ表示 (Desktop) | モバイルレイアウト (Mobile) |
| :---: | :---: |
| <img src="https://raw.githubusercontent.com/createles/sennan-jet-resources/main/assets/herobanner-section.png" width="100%" alt="デスクトップ版 画面プレビュー"> | <img src="https://raw.githubusercontent.com/createles/sennan-jet-resources/main/assets/herobanner-section-mobile.png" width="240px" alt="モバイル版 画面プレビュー"> |

---

## 🚀 主な機能 (Features)

### 🛒 コミュニティマーケットプレイス
不用品の出品や、購入希望商品の予約がシームレスに行えるJETメンバー専用の売買エコシステム。

<details>
  <summary><b>📸 インタフェースを表示</b></summary>

| デスクトップ表示 (Desktop) | モバイルレイアウト (Mobile) |
| :---: | :---: |
| <img src="https://raw.githubusercontent.com/createles/sennan-jet-resources/main/assets/marketplace-section.png" width="100%" alt="マーケットプレイス デスクトップ版"> | <img src="https://raw.githubusercontent.com/createles/sennan-jet-resources/main/assets/marketplace-section-mobile.png" width="240px" alt="マーケットプレイス モバイル版"> |

</details>

### 🔐 動的なユーザーダッシュボード
出品中のアイテムの編集・削除、プロフィール更新、予約ステータスの追跡ができる安全な個別管理画面。

<details>
  <summary><b>📸 インタフェースを表示</b></summary>

| デスクトップ表示 (Desktop) | モバイルレイアウト (Mobile) |
| :---: | :---: |
| <img src="https://raw.githubusercontent.com/createles/sennan-jet-resources/main/assets/dashboard-section.png" width="100%" alt="ユーザーダッシュボード デスクトップ版"> | <img src="https://raw.githubusercontent.com/createles/sennan-jet-resources/main/assets/dashboard-section-mobile.png" width="240px" alt="ユーザーダッシュボード モバイル版"> |

</details>

### 📢 リソースリンク & 公開コミュニティ掲示板
泉南市JETインフォブックや市関連のリンク・更新情報に加え、訪問者全員がリアルタイムで閲覧・共有できる、全体向けの告知やメッセージを気軽に投稿できるオープンな掲示板。

<details>
  <summary><b>📸 インタフェースを表示</b></summary>

| デスクトップ表示 (Desktop) | モバイルレイアウト (Mobile) |
| :---: | :---: |
| <img src="https://raw.githubusercontent.com/createles/sennan-jet-resources/main/assets/resources-section.gif" width="100%" alt="コミュニティ掲示板 デスクトップ版"> | <img src="https://raw.githubusercontent.com/createles/sennan-jet-resources/main/assets/resources-section-mobile.gif" width="240px" alt="コミュニティ掲示板 モバイル版"> |

</details>

### ⚡ コアインフラストラクチャ
* **堅牢なユーザー認証:** コミュニティ内のデータとプライバシーを保護するための、安全な資格情報ベースのログインおよびセッション管理。
* **最適化されたメディアパイプライン:** ユーザーがアップロードした画像を、クラウドストレージに転送する前にサーバー側で即座に圧縮・リサイズする効率的な処理機構。

### 📱 ライブSNSフィード
泉南市の公式Instagramのアップデートや地域の出来事をシームレスにキャッチする、リアルタイム更新の埋め込みフィード。

<details>
  <summary><b>📸 インタフェースを表示</b></summary>

| デスクトップ表示 (Desktop) | モバイルレイアウト (Mobile) |
| :---: | :---: |
| <img src="https://raw.githubusercontent.com/createles/sennan-jet-resources/main/assets/instagram-feed.gif" width="100%" alt="Instagramフィード デスクトップ版"> | <img src="https://raw.githubusercontent.com/createles/sennan-jet-resources/main/assets/instagram-feed-mobile.gif" width="240px" alt="Instagramフィード モバイル版"> |

</details>

---

## 🧠 開発ストーリー: 主な課題と成果 (Engineering Story)

### 1. 画像クオリティとストレージ容量制限の両立（パフォーマンス最適化）
* **課題:** マーケットプレイスにスマートフォンの未加工写真（5MB〜10MB以上）がそのままアップロードされると、Supabaseの無料枠の帯域幅（バンド幅）を急速に消費し、クライアント側のページ読み込み速度が著しく低下するリスクがありました。
* **解決策:** **Multer**（マルチパートフォームデータの制御）と **Sharp**（画像処理ライブラリ）を組み合わせたオンザフライのバックエンド処理パイプラインを構築。画像がアップロードされた際、サーバーのメモリ内でバッファとしてインターセプトし、画質を維持しながらWeb向けに最適化されたサイズへ圧縮した後にSupabaseへ転送する仕様にしました。
* **成果:** 画質の劣化を最小限に抑えつつ、1画像あたりのストレージ容量を70%以上削減。これにより、マーケットプレイスのフィード表示速度が劇的に向上しました。

### 2. 状態の隔離と安全なダッシュボード設計
* **課題:** ログイン中のユーザーが自身の出品物のみを安全に変更（編集・削除）でき、他のユーザーのデータ漏洩やクロスユーザーによるデータ汚染を防ぐ堅牢なデータ隔離が必要でした。
* **解決策:** カスタムミドルウェアによる厳格なバリデーション保護を施した認証ルーティングを設計。Prisma ORMを活用し、データ操作（CRUD）のリクエストがアクティブなセッションID（`userId`）に完全に紐づくようにデータベースクエリを厳密に構築しました。
* **成果:** ルーティング層とデータベース層の両方で関心事の分離（Separation of Concerns）を徹底し、高いデータセキュリティと信頼性の高いCRUD処理を実現しました。

### 3. 外部ライブフィードの統合
* **課題:** 泉南市のInstagramフィードをページ内に埋め込む際、クライアント側で重いレイアウトシフト（CLS: Cumulative Layout Shift）を発生させず、UIの操作性を損なわずにリアルタイム更新を表示させる必要がありました。
* **解決策:** レスポンシブ対応のサンドボックス化された埋め込みシステムを導入。あらかじめレイアウト領域を確保（リザーブ）し、異なる画面サイズ（ビューポート）間でも動的にスケールするよう調整しました。
* **成果:** 洗練された滑らかなUIデザインを維持しながら、ユーザーが地域の最新コミュニティ情報へシームレスにアクセスできる環境を構築しました。

---

## 📈 今後のロードマップ (Future Roadmap)
* 商品が予約された際に自動で送信されるメール通知機能の追加。
* 公開APIを活用した、地域のリアルタイム天気および防災アラジェットの導入。
* 購入希望者と出品者が直接やり取りできる、リアルタイムチャット（インスタントメッセージ）機能の実装。

---

## 📄 ライセンス (License)
このプロジェクトはオープンソースであり、[MIT License](LICENSE)のもとで公開されています。
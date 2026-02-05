
# ⚽ Pro Football Match Diary (足球比賽日記)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?logo=typescript&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Supported-purple.svg)

**A personal football match tracker PWA built for youth players and parents.**  
**一個專為青少年球員與家長設計的足球比賽記錄 PWA。**

[English](#english) | [繁體中文](#繁體中文)

---

## <a name="english"></a>🇬🇧 English

### 📖 Introduction
**Pro Football Match Diary** is an offline-first Progressive Web App (PWA) designed to track a player's development journey. It replaces traditional paper diaries with a gamified, visual, and data-driven experience. 

It runs entirely in the browser using **Local Storage**, meaning your data stays on your device—no external servers, no API keys required, and completely private.

### ✨ Key Features
*   **📝 Match Logging:** detailed records of scores, goals, assists, pitch types, and weather conditions.
*   **📊 Analytics Dashboard:** Visualize season stats, win rates, and rating trends with interactive charts.
*   **🏆 Gamification:** Earn badges (e.g., "Goal Machine", "Iron Man") as you progress.
*   **🎨 Team Management:** Manage multiple teams, customize jersey colors/patterns, and manage rosters.
*   **🖼️ Social Sharing:** Generate professional "Match Day" or "Season Recap" images for Instagram/WhatsApp instantly.
*   **📱 PWA & Offline:** Installable on iOS/Android. Works perfectly without an internet connection.
*   **🔄 Data Sync:** Export/Import your data as JSON files for backup or transfer between devices.

### 🛠️ Tech Stack
*   **Frontend:** React 19, TypeScript
*   **Styling:** Tailwind CSS
*   **Storage:** Browser LocalStorage (No Backend)
*   **Image Gen:** HTML2Canvas (Client-side image generation)

---

## <a name="繁體中文"></a>🇭🇰 繁體中文

### 📖 簡介
**Pro Football Match Diary (足球比賽日記)** 是一個「離線優先」的網頁應用程式 (PWA)，專為記錄球員成長歷程而設。它將傳統的訓練日記變為一個遊戲化、數據化且視覺化的體驗。

本程式完全在瀏覽器端運行，使用 **Local Storage** 儲存資料。這意味著所有數據都保留在您的裝置上——無需伺服器、無需 API Key，絕對私隱安全。

### ✨ 核心功能
*   **📝 比賽記錄：** 詳細記錄比數、入球、助攻、場地類型及天氣等資訊。
*   **📊 數據分析：** 透過互動圖表檢視賽季數據、勝率走勢及表現評分。
*   **🏆 成就系統：** 隨著數據累積解鎖成就徽章（如「入球機器」、「鐵人精神」）。
*   **🎨 球隊管理：** 支援多球隊管理，可自訂球衣顏色、花紋及隊友名單。
*   **🖼️ 戰報分享：** 一鍵生成型格的「賽後戰報」或「賽季總結」圖片，方便分享至社交媒體。
*   **📱 PWA 支援：** 可安裝至手機 (iOS/Android) 像原生 App 一樣使用，支援離線操作。
*   **🔄 資料備份：** 支援匯出/匯入 JSON 檔案，輕鬆備份或轉移資料至新裝置。

### 🛠️ 技術棧
*   **前端：** React 19, TypeScript
*   **樣式：** Tailwind CSS
*   **儲存：** 瀏覽器 LocalStorage (無後端)
*   **圖像生成：** HTML2Canvas (純前端生成)

---

## 🚀 Getting Started / 如何開始

Since this project uses no build step (via `importmap` and `esm.sh`), you can simply serve the files statically.
由於本專案採用無 Build Step 架構（透過 `importmap`），你可以直接開啟靜態檔案。

1.  **Clone the repository / 下載專案**
    ```bash
    git clone https://github.com/cwpjack6/football-match-diary.git
    ```

2.  **Run Locally / 本地運行**
    *   You can use **VS Code** with the "Live Server" extension.
    *   Right-click `index.html` and select "Open with Live Server".
    *   Or use any static server / 或者使用任何靜態伺服器 (e.g., `python -m http.server`, `npx serve`).

3.  **Install as App / 安裝為 App**
    *   Open in Chrome/Safari on your mobile.
    *   Select "Add to Home Screen" (加至主畫面).

## 🔒 Privacy Note / 私隱聲明
This app does **not** collect any personal data. All match logs, photos (processed locally), and profiles are stored inside your browser's Local Storage. If you clear your browser cache, you may lose data unless you have exported a backup.
本應用程式**不會**收集任何個人資料。所有比賽記錄、相片（僅本地處理）及檔案均儲存在您的瀏覽器快取中。如清除瀏覽器快取，資料可能會遺失，請定期使用「匯出數據」功能進行備份。

---

Created with ❤️ by a Football Dad JC.

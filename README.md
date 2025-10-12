# 🐰 Rabbithole Tracker

An intelligent Chrome extension that uses built-in AI to help you understand, manage, and learn from your browsing rabbitholes.

## The Problem

We've all been there. You start by looking up one simple thing, and three hours later, you've journeyed across a dozen websites and have a hundred open tabs. This extension is designed to combat unintentional time loss by making you aware of your cross-domain journeys, providing AI-powered insights, and giving you the tools to stay focused.

## ✨ Key Features

### Intelligent Tracking & Analysis
* **Cross-Domain Session Tracking:** Automatically groups related browsing activities across different websites into a single, coherent "session."
* **Precise Time Measurement:** Differentiates between active time on a page and idle time.
* **Rabbithole Scoring:** A heuristic algorithm scores each session's severity based on duration, domain hops, and topic diversity, labeling them 'Low', 'Medium', or 'High'.

### 🤖 AI-Powered Insights
* **AI Topic Extraction (`Summarizer API`):** Uses Chrome's built-in AI to read and understand the content of webpages, automatically extracting key topics and themes.
* **AI Topic Synthesis (`Prompt API`):** Analyzes the keywords from an entire session and uses the AI to generate a high-level, human-like title (e.g., "Research into WWII and its Key Figures").
* **AI Weekly Insights (`Prompt API`):** Generates a personalized, weekly summary of your browsing habits, identifying potential time-sinks and offering actionable productivity advice.
* **AI Research Reports (`Writer API`):** Transforms a chaotic browsing session into a beautifully formatted and structured Markdown article, perfect for research and learning.

###  productivity-tools Productivity & Focus Tools
* **Custom Time Limits:** Set daily time limits for specific websites (e.g., `youtube.com`).
* **Automatic Notifications:** Receive a system notification when you exceed a self-imposed daily time limit.

### User Interface & Experience
* **Live Session Popup:** A clean, intuitive popup that shows your current session's topic, a real-time timer, and a visual journey of the domains you've visited.
* **Interactive Data Visualization:** A detailed weekly summary page with interactive charts (Doughnut, Pie, and Bar) to visualize your time spent.
* **Voice Commands (Multimodal):** Use your voice to generate weekly or session reports.
* **PDF Export:** Export your AI-generated session reports as a clean, print-friendly PDF.
* **Light & Fun "Bunny" Theme:** A custom white, pink, and purple color palette for a unique and friendly feel.

## 🛠️ Technology Stack

* **Platform:** Chrome Extension (Manifest V3)
* **Language:** JavaScript (ES Modules)
* **Core APIs:**
    * Chrome Extension APIs (`storage`, `tabs`, `notifications`, `scripting`, `idle`)
    * Web Speech API (for voice commands)
* **Chrome Built-in AI APIs:**
    * `Summarizer API` (for topic extraction)
    * `Prompt API` (`LanguageModel`) (for topic synthesis & weekly insights)
    * `Writer API` (for session report generation)
* **Libraries:** `Chart.js` for data visualization, `marked.js` for Markdown rendering.

## 🚀 Setup and Installation

### 1. Prerequisites
* Google Chrome version 138 or newer.
* A compatible system (Windows/macOS/Linux/ChromeOS) that meets the **hardware requirements** for Chrome's built-in AI (specifically, sufficient free disk space and GPU VRAM).

### 2. Enable AI Flags in Chrome
* Navigate to `chrome://flags`.
* Search for "Gemini" and enable the following flags:
    * `Prompt API for Gemini Nano`
    * `Summarization API for Gemini Nano`
* Relaunch your browser.

### 3. Load the Extension
1.  Clone or download this repository to your local machine.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **"Developer mode"** in the top right corner.
4.  Click **"Load unpacked"**.
5.  Select the `rabbithole-tracker` project folder.

### 4. One-Time AI Model Download
The first time you visit a text-heavy website (like a Wikipedia article), a green button will appear in the bottom-right corner asking you to "Enable AI Summarizer".
* **Click this button** to trigger the one-time download of the Gemini Nano AI model. This may take several minutes. You can monitor the progress in the webpage's console (Right-click -> Inspect -> Console).

##  Usage

* **Track:** Simply browse the web as you normally would. The extension will automatically track your activity in the background.
* **View Live Session:** Click the bunny icon in your Chrome toolbar to see your current session's topic, duration, and journey.
* **Generate Reports:** Use the buttons or voice commands in the popup to generate your AI-powered weekly insight or export a detailed report of your current session.
* **Set Limits:** Right-click the extension icon and select "Options" to add or remove daily time limits for specific websites.
# Amazon Traffic Generator with Playwright & Cloudflare

A robust traffic generation tool that simulates realistic user browsing behavior on Amazon product pages. 
This version features a **Server-Client architecture** using **Playwright (Firefox)** for better resource management and **Cloudflare Tunnels** for remote access.

## Features

- **Resource Efficient**: Uses a Single Browser instance (Firefox) with multiple isolated contexts to handle high concurrency without crashing RAM or Disk.
- **Remote Access**: Includes Cloudflare Tunnel support for exposing the server via a public URL.
- **Smart Interventions**: 
  - Automatically solves Captchas (using Tesseract.js).
  - Handles "Continue Shopping" soft-blocks.
- **Deep Interaction**:
  - Smooth Scrolling.
  - Image Hovering.
  - "Buy Now" clicking simulation.
- **Proxy Support**: Rotates proxies per visit.

## Prerequisites

- **Node.js**: [Download Here](https://nodejs.org/) (Version 18+ recommended)
- **Firefox**: The setup script handles this automatically via Playwright.

## Installation

1. **Clone/Download** this repository.
2. Run `setup.bat` to install dependencies and the browser engine.
   - It will run `npm install` and `npx playwright install firefox`.

## Usage

### 1. Local Usage
To run the application on your own machine:
1. Double-click `Run_Public_App.bat`.
2. The server will start on `http://localhost:3000`.

### 2. Public Usage (Shareable)
To share the app with others via a public link:
1. Double-click `Run_Public_App_CF.bat`.
2. A Cloudflare Tunnel will start, and the public URL will be displayed in the console.

## Configuration

- **Proxies**: Add your proxies to `proxies.json` (or verify `proxies_raw.txt` is converted).
- **Settings**: Configure `Threads` and `Cycles` in the UI to control load.

## Architecture

- **Server**: Node.js + Express + Socket.io
- **Browser Service**: Playwright (Firefox Engine) - Manages a single browser instance with multiple contexts.
- **Job Manager**: Handles queue, concurrency, and progress broadcasting.

## Troubleshooting

- **"No space left on device"**: This issue refers to creating too many browser instances. This version solves it by reusing the browser.
- **"Browser not recognized"**: Ensure you ran `setup.bat` to install Firefox.

## Recent Fixes
- Switched from Puppeteer (Chrome) to **Playwright (Firefox)** to support "Single Browser" architecture.
- Added localized `patch_files.js` and `APPLY_FIX.bat` for remote server updates.

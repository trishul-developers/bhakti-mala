# Bhakti Mala (भक्ति माला) — v0.1.2

> **Modular Naam Jap Counter, Sacred Sadhana Analytics & Native Android Hardware Enclosure**

Bhakti Mala is a spiritual sadhana tracking application engineered for Hindu mantra japa practices. It pairs a self-contained responsive web application with an Android native WebView enclosure that captures physical hardware volume buttons (`KEYCODE_VOLUME_UP` and `KEYCODE_VOLUME_DOWN`) for eyes-closed meditative counting without requiring screen interaction.

---

## Architecture Overview

1. **`EventBusModule`**: Decoupled Pub/Sub event broker connecting UI, Counter, Audio, and Analytics modules.
2. **`NaamCatalogModule`**: Sacred Ishwar Naams (Shri Ram, Radha Krishna, Lord Shiva, Lord Ganesha, Maa Durga, Lord Hanuman) with embedded portraits, Devanagari script, mantras, and dynamic custom Naam additions.
3. **`StorageModule`**: Resilient `localStorage` persistence engine maintaining a 30-day historical Sadhana ledger and per-Naam lifetime counters.
4. **`AudioHapticsModule`**: Web Audio API acoustics synthesizer featuring:
   - Pure-sine additive Om harmonic drone (अ → उ → म्) & 136.1 Hz Kansya singing bowl resonance.
   - Tactile Rudraksha bead clicks.
   - Temple ghanti chimes & 108-bead Mala completion bells.
5. **`AnalyticsModule`**: Interactive Chart.js visual analytics:
   - Daily Jap & Mala trends vs. Sankalpa target line.
   - Deity distribution doughnut.
   - Vedic Muhurta polar distribution (Brahma Muhurta, Pratah, Madhyahna, Sandhya, Ratri).
   - Weekday sadhana bar chart & 28-day consistency heatmap.
   - 1-Lakh (100,000 count) Purashcharana completion projector.
6. **`AndroidEnclosureBridge (`MainActivity.kt`)`**: Native Android WebView enclosure intercepting `KEYCODE_VOLUME_UP` (+1 Naam Jap) and `KEYCODE_VOLUME_DOWN` (undo -1) directly into JavaScript `window.triggerHardwareButton()`.

---

## Directory Structure

```text
bhakti_mala/
├── .github/
│   └── workflows/
│       └── release.yml          # GitHub Actions CI for signed APK release & web bundle
├── android-enclosure/           # Native Android Gradle project (compileSdk 35)
│   ├── app/
│   │   ├── src/main/java/com/smaranaam/app/MainActivity.kt
│   │   ├── src/main/AndroidManifest.xml
│   │   ├── build.gradle.kts
│   │   └── proguard-rules.pro
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── gradle.properties
│   ├── version.properties
│   └── gradlew / gradlew.bat
├── bhakti-mala-android/         # Primary v0.1.2 Web application & assets
│   ├── index.html
│   └── js/modules/audio-haptics.js
├── web/                         # Mirrored web assets
├── .gitignore
└── README.md
```

---

## Building Locally

### Prerequisites
- JDK 17 or JDK 21 (`JAVA_HOME` set)
- Android SDK (`ANDROID_HOME` set with platforms `android-35` and build-tools `35.0.0`)

### Debug Build
```bash
cd android-enclosure
./gradlew assembleDebug
```
The debug APK is generated at `android-enclosure/app/build/outputs/apk/debug/app-debug.apk`.

### Signed Release Build
Set the environment variables:
```bash
export ANDROID_KEYSTORE_PATH="/path/to/keystore.jks"
export ANDROID_KEYSTORE_PASSWORD="your-store-password"
export ANDROID_KEY_ALIAS="your-key-alias"
export ANDROID_KEY_PASSWORD="your-key-password"

cd android-enclosure
./gradlew assembleRelease
```
The signed and R8-optimized release APK is generated at `android-enclosure/app/build/outputs/apk/release/app-release.apk`.

### Generating Production Keystore & Updating GitHub Secrets

When you are ready to configure your official production signing keys for GitHub CI:

#### 1. Generate Keystore Locally
```bash
keytool -genkeypair -v \
  -keystore bhakti-mala-production.jks \
  -alias bhakti-mala \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

#### 2. Encode Keystore to Base64
* **PowerShell**:
  ```powershell
  $bytes = [System.IO.File]::ReadAllBytes("path\to\bhakti-mala-production.jks")
  $base64 = [System.Convert]::ToBase64String($bytes)
  ```
* **Bash / macOS / Linux**:
  ```bash
  base64 -w 0 bhakti-mala-production.jks > keystore_base64.txt
  ```

#### 3. Update GitHub Repository Secrets
Set the secrets via GitHub CLI or the GitHub Web UI (**Settings → Secrets and variables → Actions**):
```bash
# Using GitHub CLI:
gh secret set ANDROID_KEYSTORE_BASE64 -R trishul-developers/bhakti-mala --body "$base64"
gh secret set ANDROID_KEYSTORE_PASSWORD -R trishul-developers/bhakti-mala --body "your-keystore-password"
gh secret set ANDROID_KEY_ALIAS -R trishul-developers/bhakti-mala --body "bhakti-mala"
gh secret set ANDROID_KEY_PASSWORD -R trishul-developers/bhakti-mala --body "your-key-password"
```

---

## Automated CI/CD & GitHub Releases

Pushes with tags matching `v*` (e.g. `v0.1.2`) trigger the release workflow in `.github/workflows/release.yml`:
1. Validates that the git tag matches `android-enclosure/version.properties`.
2. Decodes the release keystore from repository secrets (`ANDROID_KEYSTORE_BASE64`).
3. Compiles, optimizes (R8), and signs the release APK (`assembleRelease`).
4. Verifies the signature with Android SDK `apksigner`.
5. Packages web assets into a release `.zip`.
6. Publishes a GitHub Release with attached APK and web package.

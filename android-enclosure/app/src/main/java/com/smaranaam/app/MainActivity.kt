package com.smaranaam.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.KeyEvent
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

/**
 * Android Native Enclosure Activity for SmaraNaam Modular WebApp.
 * Bridges physical Volume Up / Volume Down buttons directly to the Naam Jap Counter.
 */
class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false

        webView.webViewClient = WebViewClient()
        webView.addJavascriptInterface(AndroidHardwareBridge(), "AndroidBridge")
        webView.loadUrl("file:///android_asset/index.html")
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
            webView.evaluateJavascript("window.triggerHardwareButton('vol_up');", null)
            return true
        } else if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            webView.evaluateJavascript("window.triggerHardwareButton('vol_down');", null)
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    inner class AndroidHardwareBridge {
        @JavascriptInterface
        fun getDeviceEnclosureInfo(): String {
            return "{\"platform\":\"Android\",\"hardwareVolumeCounting\":true}"
        }
    }
}

# Keep JavascriptInterface methods accessible from WebView JavaScript
-keepattributes *Annotation*
-keepattributes JavascriptInterface

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keepclassmembers class com.smaranaam.app.MainActivity$AndroidHardwareBridge {
    @android.webkit.JavascriptInterface <methods>;
}

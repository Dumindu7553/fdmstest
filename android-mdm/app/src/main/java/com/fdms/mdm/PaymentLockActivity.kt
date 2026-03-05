package com.fdms.mdm

import android.app.Activity
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.widget.Button

class PaymentLockActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Make this activity fullscreen and prevent dismissal
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN)

        setContentView(R.layout.activity_payment_lock)

        // For MVP Testing: An unlock button (hidden in production)
        val btnUnlock = findViewById<Button>(R.id.btnUnlockDemo)
        btnUnlock.setOnClickListener {
            finish() // Dismiss the lock overlay for testing. Real version requires backend validation.
        }
    }

    // Intercept back and home buttons depending on Android version
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) return true
        return super.onKeyDown(keyCode, event)
    }

    override fun onBackPressed() {
        // Do nothing
    }
}

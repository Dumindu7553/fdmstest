package com.fdms.mdm

import android.app.admin.DevicePolicyManager
import android.content.Context
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var dpm: DevicePolicyManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val tvStatus = findViewById<TextView>(R.id.tvStatus)
        val btnDemoLock = findViewById<Button>(R.id.btnDemoLock)

        val isOwner = dpm.isDeviceOwnerApp(packageName)
        tvStatus.text = if (isOwner) "Status: Device Owner (Managed)" else "Status: Not managed yet"

        btnDemoLock.setOnClickListener {
            // Trigger payment lock for demo purposes (opens the lock screen)
            startActivity(android.content.Intent(this, PaymentLockActivity::class.java))
        }
    }
}

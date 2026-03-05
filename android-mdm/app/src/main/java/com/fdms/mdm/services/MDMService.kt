package com.fdms.mdm.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.fdms.mdm.DeviceAdminReceiver
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MDMService : Service() {

    private val serviceJob = Job()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)
    private lateinit var dpm: DevicePolicyManager
    private lateinit var adminComponent: ComponentName

    override fun onCreate() {
        super.onCreate()
        dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponent = ComponentName(this, DeviceAdminReceiver::class.java)

        createNotificationChannel()
        startForeground(1, buildNotification())

        startPolicyEnforcementLoop()
        startHeartbeatLoop()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Check if we received a specific command
        val action = intent?.action
        when (action) {
            "LOCK_DEVICE" -> enforceDeviceLock()
            "UNLOCK_DEVICE" -> unlockDevice()
            "SYNC_POLICIES" -> applyPolicies()
        }
        return START_STICKY
    }

    private fun startPolicyEnforcementLoop() {
        serviceScope.launch {
            while (true) {
                applyPolicies()
                delay(60 * 1000) // Check policies every minute
            }
        }
    }

    private fun startHeartbeatLoop() {
        serviceScope.launch {
            while (true) {
                // TODO: Send heartbeat to backend API
                // sendHeartbeat()
                delay(5 * 60 * 1000) // Every 5 mins
            }
        }
    }

    private fun applyPolicies() {
        if (!dpm.isDeviceOwnerApp(packageName)) return

        try {
            // Apply standard MDM restrictions
            dpm.addUserRestriction(adminComponent, android.os.UserManager.DISALLOW_FACTORY_RESET)
            dpm.addUserRestriction(adminComponent, android.os.UserManager.DISALLOW_SAFE_BOOT)
            dpm.addUserRestriction(adminComponent, android.os.UserManager.DISALLOW_CONFIG_CREDENTIALS)
            dpm.addUserRestriction(adminComponent, android.os.UserManager.DISALLOW_USB_FILE_TRANSFER)
            
            // Prevent removing MDM app
            dpm.setUninstallBlocked(adminComponent, packageName, true)

            // Disable developer options mapping
            dpm.setGlobalSetting(adminComponent, android.provider.Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, "0")
            dpm.setGlobalSetting(adminComponent, android.provider.Settings.Global.ADB_ENABLED, "0")

        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun enforceDeviceLock() {
        if (dpm.isAdminActive(adminComponent)) {
            dpm.lockNow()
            // In a real scenario, we would also start LockTaskMode or show an overlay Activity
        }
    }

    private fun unlockDevice() {
        // Remove overlay / restrictions related to locking
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        serviceJob.cancel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "mdm_service",
                "Device Management Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, "mdm_service")
            .setContentTitle("Device Managed")
            .setContentText("This device is managed by FDMS Platform")
            .setOngoing(true)
            .build()
    }
}

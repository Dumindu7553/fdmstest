package com.fdms.mdm

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class DeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i("MDM", "Device Owner Enabled")
        // Start background service when enabled
        context.startForegroundService(Intent(context, com.fdms.mdm.services.MDMService::class.java))
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        // Prevent disabling if not authorized
        return "Disabling this app will void your warranty and lock the device."
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.e("MDM", "Device Owner Disabled (WARNING)")
    }

    override fun onLockTaskModeEntering(context: Context, intent: Intent, pkg: String) {
        super.onLockTaskModeEntering(context, intent, pkg)
        Log.i("MDM", "Entering Lock Task Mode")
    }

    override fun onLockTaskModeExiting(context: Context, intent: Intent) {
        super.onLockTaskModeExiting(context, intent)
        Log.i("MDM", "Exiting Lock Task Mode")
    }
}

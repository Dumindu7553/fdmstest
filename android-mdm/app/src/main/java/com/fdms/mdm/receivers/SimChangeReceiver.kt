package com.fdms.mdm.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log

class SimChangeReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == "android.intent.action.SIM_STATE_CHANGED") {
            val state = intent.getStringExtra("ss")
            Log.w("MDM", "SIM State Changed to: \$state")
            
            // If SIM is removed or changed, we could immediately trigger a lock
            // or send an alert to the backend.
            if (state == "ABSENT") {
                // intent to lock device if offline enforcement is needed
                // notifyBackend("sim_changed", "SIM card was removed")
            }
        }
    }
}

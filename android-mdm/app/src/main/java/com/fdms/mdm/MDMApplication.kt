package com.fdms.mdm

import android.app.Application

class MDMApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize singletons, analytics, crash reporting if needed later
    }
}

package com.fdms.mdm.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface ApiService {
    @POST("devices/heartbeat")
    suspend fun sendHeartbeat(@Body payload: Map<String, Any>): Response<Void>
    
    // In future: endpoint to report location, alerts, etc...
}

package com.hsousa_apps.Autocarros.data

class Route constructor(val id: String, val stops: List<Stop>, val arrival: Stop, val times: List<Time>) {
    private var origin: Stop? = stops[0]
    private var destination: Stop? = stops[stops.size - 1]

    fun getOrigin(): Stop? {
        return origin
    }

    fun getDestination(): Stop? {
        return destination
    }
}
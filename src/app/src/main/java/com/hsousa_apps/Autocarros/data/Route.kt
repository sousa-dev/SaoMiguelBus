package com.hsousa_apps.Autocarros.data

class Route constructor(val id: String, val stops: Map<Stop, String>, val day: TypeOfDay) {
    private var allStops: List<Stop> = stops.keys as List<Stop>
    private var origin: Stop? = allStops[0]
    private var destination: Stop? = allStops[allStops.size - 1]

    fun getOrigin(): Stop? {
        return origin
    }

    fun getDestination(): Stop? {
        return destination
    }
}
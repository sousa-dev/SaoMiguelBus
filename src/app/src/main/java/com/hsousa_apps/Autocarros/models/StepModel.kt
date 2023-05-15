package com.hsousa_apps.Autocarros.models

import com.hsousa_apps.Autocarros.data.Location

class StepModel {
    var id: String? = null
    var icon: Int? = null
    var action: String? = null
    var goal: String? = null
    var distance : String? = null
    var time : String? = null
    var details: String? = null
    var currentLocation: Location = Location(0.0, 0.0)
    var destinationLocation: Location = Location(0.0, 0.0)

    constructor(
        id: String?,
        icon: Int?,
        action: String?,
        goal: String?,
        distance: String?,
        time: String?,
        details: String?,
        currentLocation: Location = Location(0.0, 0.0),
        destinationLocation: Location = Location(0.0, 0.0)
    ) {
        this.id = id
        this.icon = icon
        this.action = action
        this.goal = goal
        this.distance = distance
        this.time = time
        this.details = details
        this.currentLocation = currentLocation
        this.destinationLocation = destinationLocation
    }

    override fun toString(): String {
        return "StepModel(id=$id, icon=$icon, action=$action, goal=$goal, distance=$distance, time=$time, details=$details)"
    }


}
package com.hsousa_apps.Autocarros.models

class StepModel {
    var id: String? = null
    var icon: Int? = null
    var action: String? = null
    var goal: String? = null
    var distance : String? = null
    var time : String? = null

    constructor(
        id: String?,
        icon: Int?,
        action: String?,
        goal: String?,
        distance: String?,
        time: String?
    ) {
        this.id = id
        this.icon = icon
        this.action = action
        this.goal = goal
        this.distance = distance
        this.time = time
    }

    override fun toString(): String {
        return "StepModel(id=$id, icon=$icon, action=$action, goal=$goal, distance=$distance, time=$time)"
    }


}
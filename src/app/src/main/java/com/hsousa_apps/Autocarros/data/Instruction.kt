package com.hsousa_apps.Autocarros.data;

import org.json.JSONArray


class Instruction {
    var routes: MutableList<StepRoute> =  mutableListOf()

    override fun toString(): String {
        var str = ""
        for (route in routes){
            for (leg in route.legs){
                str += "${leg.start_address} -> ${leg.end_address} ${leg.duration}\n${leg.departure} -> ${leg.arrival}\n"
                for (step in leg.steps){
                    str += "\t${step.travel_mode} | ${step.instructions}\n" +
                            "\t\tdistance: ${step.distance}\n" +
                            "\t\tduration: ${step.duration}\n"
                }
            }
        }
        return str
    }
}

class StepRoute {
    var legs: MutableList<Leg> = mutableListOf()
    lateinit var overview_polyline_points: String
    lateinit var warnings: JSONArray
}

class Leg {
    lateinit var start_address: String
    lateinit var start_location: Location
    lateinit var end_address: String
    lateinit var end_location: Location

    lateinit var departure: String
    lateinit var arrival: String
    lateinit var duration: String

    var steps: MutableList<Step> = mutableListOf()
}

class Step {
    lateinit var instructions: String

    lateinit var distance: String
    lateinit var duration: String

    lateinit var travel_mode: String
    lateinit var polyline: String

    var steps: MutableList<Step> = mutableListOf()
}
package com.hsousa_apps.Autocarros.data;

import org.json.JSONArray
import org.json.JSONObject


class Instruction {
    var routes: MutableList<StepRoute> =  mutableListOf()

    fun init_transit_details(json: JSONObject) : TransitDetails{
        var transit_details = TransitDetails()


        transit_details.departura_stop = json.getJSONObject("departure_stop").getString("name")
        transit_details.departure_location = Location(
            json.getJSONObject("departure_stop").getJSONObject("location").getDouble("lat"),
            json.getJSONObject("departure_stop").getJSONObject("location").getDouble("lng"),
        )
        transit_details.departure_time = json.getJSONObject("departure_time").getString("text")


        transit_details.arrival_stop = json.getJSONObject("arrival_stop").getString("name")
        transit_details.arrival_location = Location(
            json.getJSONObject("arrival_stop").getJSONObject("location").getDouble("lat"),
            json.getJSONObject("arrival_stop").getJSONObject("location").getDouble("lng"),
        )
        transit_details.arrival_time = json.getJSONObject("arrival_time").getString("text")

        transit_details.headsign = json.getString("headsign")
        transit_details.line = init_line(json.getJSONObject("line"))
        transit_details.num_stops = json.getInt("num_stops")

        return transit_details
    }

    fun init_line(json: JSONObject): Line{
        var line = Line()
        var agencies = mutableListOf<Agency>()

        var agencies_json = json.getJSONArray("agencies")
        for (i in 0 until agencies_json.length())
            agencies.add(init_agency(agencies_json.getJSONObject(i)))

        line.name = json.getString("name")
        line.short_name = json.getString("short_name")

        line.vehicle = init_vehicle(json.getJSONObject("vehicle"))

        return line
    }

    fun init_agency(json: JSONObject): Agency {
        var agency = Agency()

        agency.name = json.getString("name")
        agency.phone = json.getString("phone")
        agency.url = json.getString("url")

        return agency
    }

    fun init_vehicle(json: JSONObject): Vehicle {
        var vehicle = Vehicle()

        vehicle.icon = json.getString("icon")
        vehicle.name = json.getString("name")
        vehicle.type = json.getString("type")

        return vehicle
    }
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

    lateinit var start_location: Location
    lateinit var end_location: Location

    lateinit var maneuver: String
    lateinit var transit_details: TransitDetails

    lateinit var distance: String
    lateinit var duration: String

    lateinit var travel_mode: String
    lateinit var polyline: String

    var steps: MutableList<Step> = mutableListOf()
}

class TransitDetails {
    lateinit var departure_location: Location
    lateinit var departura_stop: String
    lateinit var departure_time: String
    lateinit var arrival_location: Location
    lateinit var arrival_stop: String
    lateinit var arrival_time: String

    lateinit var headsign: String
    lateinit var line: Line
    var num_stops: Int = -1
}

class Line {
    var agencies: MutableList<Agency> = mutableListOf()

    lateinit var name: String
    lateinit var short_name: String

    lateinit var vehicle: Vehicle
}

class Agency {
    lateinit var name: String
    lateinit var phone: String
    lateinit var url: String
}

class Vehicle {
    lateinit var icon: String
    lateinit var name: String
    lateinit var type: String
}

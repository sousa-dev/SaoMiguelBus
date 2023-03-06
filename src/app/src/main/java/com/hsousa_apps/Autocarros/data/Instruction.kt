package com.hsousa_apps.Autocarros.data;

import com.google.gson.JsonObject
import org.json.JSONArray
import org.json.JSONObject


class Instruction {
    var routes: MutableList<StepRoute> =  mutableListOf()

    fun init_instructions(routes: JSONArray): Instruction {

        for (i in 0 until routes.length())
            this.routes.add(init_step_route(routes.getJSONObject(i)))

        return this
    }

    fun init_step_route(json: JSONObject): StepRoute {
        var instruction_route = StepRoute()

        instruction_route.overview_polyline_points = json.getJSONObject("overview_polyline").getString("points")
        instruction_route.warnings = json.getJSONArray("warnings")
        var legs = json.getJSONArray("legs")
        for (j in 0 until legs.length())
            instruction_route.legs.add(init_leg(legs.getJSONObject(j)))

        return instruction_route
    }

    fun init_leg(json: JSONObject): Leg {
        var leg = Leg()

        leg.start_address = json.getString("start_address")
        val start_location = json.getJSONObject("start_location")
        leg.start_location = Location(start_location.getDouble("lat"), start_location.getDouble("lng"))
        leg.end_address = json.getString("end_address")
        val end_location = json.getJSONObject("end_location")
        leg.end_location = Location(end_location.getDouble("lat"), end_location.getDouble("lng"))

        leg.departure = json.getJSONObject("departure_time").getString("text")
        leg.arrival = json.getJSONObject("arrival_time").getString("text")
        leg.duration = json.getJSONObject("duration").getString("text")

        val steps = json.getJSONArray("steps")
        for (k in 0 until steps.length())
            leg.steps.add(init_step(steps.getJSONObject(k)))

        return leg
    }

    fun init_step(json: JSONObject): Step {
        var step = Step()

        step.instructions = json.getString("html_instructions")

        step.start_location = Location(json.getJSONObject("start_location").getDouble("lat"), json.getJSONObject("start_location").getDouble("lng"))
        step.end_location = Location(json.getJSONObject("end_location").getDouble("lat"), json.getJSONObject("end_location").getDouble("lng"))


        step.distance = json.getJSONObject("distance").getString("text")
        step.duration = json.getJSONObject("duration").getString("text")

        step.polyline = json.getJSONObject("polyline").getString("points")
        step.travel_mode = json.getString("travel_mode")

        if (json.has("steps")) for (l in 0 until json.getJSONArray("steps").length()) step.steps.add(init_step(json.getJSONArray("steps").getJSONObject(l)))
        else if (json.has("transit_details")) step.transit_details = init_transit_details(json.getJSONObject("transit_details"))

        return step
    }

    fun init_transit_details(json: JSONObject) : TransitDetails{
        var transit_details = TransitDetails()


        transit_details.departure_stop = json.getJSONObject("departure_stop").getString("name")
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
        val json = JSONObject()
        val routesArray = JSONArray()

        for (route in routes) {
            val routeObject = JSONObject()
            val legsArray = JSONArray()

            for (leg in route.legs) {
                val legObject = JSONObject()

                legObject.put("start_address", leg.start_address)
                legObject.put("end_address", leg.end_address)
                legObject.put("duration", leg.duration)
                legObject.put("departure", leg.departure)
                legObject.put("arrival", leg.arrival)

                val stepsArray = JSONArray()

                for (step in leg.steps) {
                    val stepObject = JSONObject()

                    stepObject.put("instructions", step.instructions)
                    stepObject.put("travel_mode", step.travel_mode)
                    stepObject.put("distance", step.distance)
                    stepObject.put("duration", step.duration)
                    stepObject.put("polyline", step.polyline)

                    if (step.travel_mode == "TRANSIT") {
                        val transitDetailsObject = JSONObject()

                        transitDetailsObject.put("departure_stop", step.transit_details.departure_stop)
                        transitDetailsObject.put("departure_location", JSONObject()
                            .put("lat", step.transit_details.departure_location.x)
                            .put("lng", step.transit_details.departure_location.y)
                        )
                        transitDetailsObject.put("departure_time", step.transit_details.departure_time)

                        transitDetailsObject.put("arrival_stop", step.transit_details.arrival_stop)
                        transitDetailsObject.put("arrival_location", JSONObject()
                            .put("lat", step.transit_details.arrival_location.x)
                            .put("lng", step.transit_details.arrival_location.y)
                        )
                        transitDetailsObject.put("arrival_time", step.transit_details.arrival_time)

                        transitDetailsObject.put("headsign", step.transit_details.headsign)

                        val lineObject = JSONObject()

                        lineObject.put("name", step.transit_details.line.name)
                        lineObject.put("short_name", step.transit_details.line.short_name)

                        val vehicleObject = JSONObject()

                        vehicleObject.put("icon", step.transit_details.line.vehicle.icon)
                        vehicleObject.put("name", step.transit_details.line.vehicle.name)
                        vehicleObject.put("type", step.transit_details.line.vehicle.type)

                        lineObject.put("vehicle", vehicleObject)

                        val agenciesArray = JSONArray()

                        for (agency in step.transit_details.line.agencies) {
                            val agencyObject = JSONObject()

                            agencyObject.put("name", agency.name)
                            agencyObject.put("phone", agency.phone)
                            agencyObject.put("url", agency.url)

                            agenciesArray.put(agencyObject)
                        }

                        lineObject.put("agencies", agenciesArray)

                        transitDetailsObject.put("line", lineObject)
                        transitDetailsObject.put("num_stops", step.transit_details.num_stops)

                        stepObject.put("transit_details", transitDetailsObject)
                    } else if (step.travel_mode == "WALKING"){
                        val stepStepsArray = JSONArray()

                        for (stepsStep in step.steps){
                            val stepStepsStepObject = JSONObject()

                            stepStepsStepObject.put("instructions", stepsStep.instructions)
                            stepStepsStepObject.put("travel_mode", stepsStep.travel_mode)
                            stepStepsStepObject.put("distance", stepsStep.distance)
                            stepStepsStepObject.put("duration", stepsStep.duration)
                            stepStepsStepObject.put("polyline", stepsStep.polyline)

                            stepStepsArray.put(stepStepsStepObject)
                        }
                    }

                    stepsArray.put(stepObject)
                }

                legObject.put("steps", stepsArray)
                legsArray.put(legObject)
            }

            routeObject.put("legs", legsArray)
            routeObject.put("overview_polyline_points", route.overview_polyline_points)
            routeObject.put("warnings", route.warnings)

            routesArray.put(routeObject)
        }

        json.put("routes", routesArray)

        return json.toString(4)
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
    lateinit var departure_stop: String
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

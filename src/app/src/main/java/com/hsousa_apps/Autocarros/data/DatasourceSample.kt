package com.hsousa_apps.Autocarros.data

import com.hsousa_apps.Autocarros.R

var allRoutes: ArrayList<Route> = arrayListOf()
var avmRoutes: ArrayList<Route> = arrayListOf()
var varelaRoutes: ArrayList<Route> = arrayListOf()
var crpRoutes: ArrayList<Route> = arrayListOf()
var stops: ArrayList<Stop> = arrayListOf()
var correspondence: MutableMap<Stop, MutableList<Stop>> = mutableMapOf()

var favorite: MutableList<List<String>> = mutableListOf()
var currentLanguage: String = "pt"
var loaded: Boolean = false

class Datasource {

    fun load() {
        loadStops()

        loadAVM()
        allRoutes.addAll(avmRoutes)

        loadVARELA()
        allRoutes.addAll(varelaRoutes)

        loadCRP()
        allRoutes.addAll(crpRoutes)

        //setCorrespondence()
    }

    private fun loadStops() {
        /* Create all Bus Stops */
        Stop("Bus Stop 1", Location(0.0, 0.0))
        Stop("Bus Stop 2", Location(0.0, 0.0))
        /* ... */
    }

    private fun loadAVM() {
        val img: Int = R.drawable.avm_logo
        /* For Route 999 */
        var route = "999"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route, mapOf(
                        getStop("Bus Stop 1") to listOf("00h00", "00h00"),
                        getStop("Bus Stop 2") to listOf("00h00", "00h00"),
                    ), TypeOfDay.WEEKDAY/TypeOfDay.SATURDAY/TypeOfDay.SUNDAY, img, optionalInfo
                ),
                Route(
                    route, mapOf(
                        getStop("Bus Stop 1") to listOf("00h00", "00h00"),
                        getStop("Bus Stop 2") to listOf("00h00", "00h00"),
                    ), TypeOfDay.WEEKDAY/TypeOfDay.SATURDAY/TypeOfDay.SUNDAY, img, optionalInfo
                ),
            )
        )
    }

    private fun loadVARELA() {
        val img: Int = R.drawable.varela_logo
        /* For Route 000 */
        var route = "000"
        varelaRoutes.addAll(
            arrayListOf(
                    route, mapOf(
                        getStop("Bus Stop 1") to listOf("00h00", "00h00"),
                        getStop("Bus Stop 2") to listOf("00h00", "00h00"),
                    ), TypeOfDay.WEEKDAY/TypeOfDay.SATURDAY/TypeOfDay.SUNDAY, img, optionalInfo),
            )
        )
    }

    private fun loadCRP() {
        val img: Int = R.drawable.crp_logo
        /* For Route 555 */
        var route = "555"
        crpRoutes.addAll(
            arrayListOf(
                    route, mapOf(
                        getStop("Bus Stop 1") to listOf("00h00", "00h00"),
                        getStop("Bus Stop 2") to listOf("00h00", "00h00"),
                    ), TypeOfDay.WEEKDAY/TypeOfDay.SATURDAY/TypeOfDay.SUNDAY, img, optionalInfo),
            )
        )
    }

    fun getStops(): ArrayList<Stop> {
        return stops
    }

    fun addStop(stop: Stop) {
        stops.add(stop)
    }

    fun getAllRoutes(): ArrayList<Route> {
        return allRoutes
    }

    fun getAvmRoutes(): ArrayList<Route> {
        return avmRoutes
    }

    fun getVarelaRoutes(): ArrayList<Route> {
        return varelaRoutes
    }

    fun getCrpRoutes(): ArrayList<Route> {
        return crpRoutes
    }

    fun getCorrespondence(stop: String): MutableList<Stop>? {
        return correspondence[getStop(stop)]
    }

    fun getStop(stop: String): Stop {
        for (busStop in stops)
            if (busStop.name == stop)
                return busStop
        return Stop("null", Location(0.0, 0.0))
    }

    fun getAllTimes(
        id: String?,
        origin: String?,
        destination: String?,
        day: TypeOfDay
    ): Map<Stop, List<String>> {
        for (route in allRoutes)
            if ((route.id == id) and (route.getStopIdx(origin?.let { getStop(it) }) < route.getStopIdx(
                    destination?.let { getStop(it) })) and (route.day == day)
            )
                return route.stops
        return mapOf()
    }

    fun getTimeIdx(
        route_id: String?,
        timeToFind: String?,
        origin: String?,
        destination: String?
    ): Int {
        for (route in allRoutes) {
            if (route.id == route_id) {
                for (stop in route.stops) {
                    if (stop.key.name == destination)
                        break
                    else if ((stop.key.name == origin) and (destination?.let { getStop(it) } in route.stops.keys)) {
                        val ret = route.getTimeIdx(stop.value, timeToFind)
                        if (ret >= 0) return ret
                    }
                }
            }
        }
        return -1
    }

    fun getAllStopTimes(
        route_id: String?,
        timeToFind: String?,
        origin: String?,
        destination: String?
    ): Map<String, String> {
        val idx = getTimeIdx(route_id, timeToFind, origin, destination)
        var map: MutableMap<String, String> = mutableMapOf()
        for (route in allRoutes) {
            if ((route.id == route_id) and (route.getStopIdx(origin?.let { getStop(it) }) < route.getStopIdx(
                    destination?.let { getStop(it) }))
            ) {
                for (i in route.getStopIdx(origin?.let { getStop(it) }) until route.getStopIdx(
                    destination?.let { getStop(it) }) + 1) {
                    val times: List<String>? =
                        route.stops[getStop(route.stops.keys.toList()[i].toString())]
                    if (times != null) {
                        map[route.stops.keys.toList()[i].toString()] = times[idx]
                    }
                }
            }
        }
        return map
    }

    fun getFavorite(): MutableList<List<String>> {
        return favorite
    }

    fun addFavorite(origin: String?, destination: String?) {
        if (listOf(origin, destination) !in favorite) {
            favorite.add(listOf(origin, destination) as List<String>)
        }
    }

    fun removeFavorite(toRemove: List<String>) {
        favorite.remove(toRemove)
    }

    fun loadFavorite(fav: MutableList<List<String>>) {
        favorite = fav
    }

    fun getCurrentLang(): String {
        return currentLanguage
    }

    fun changeCurrentLang(lang: String) {
        currentLanguage = lang
    }

    fun getLoaded(): Boolean {
        return loaded
    }

    fun loaded() {
        loaded = true
    }

    fun hasInfo(id: String?, origin: String?, destination: String?, typeOfDay: TypeOfDay): String? {
        for (route in allRoutes)
            if ((route.id == id) and (route.getStopIdx(origin?.let { getStop(it) }) < route.getStopIdx(destination?.let { getStop(it) }))and (route.day == typeOfDay))
                return route.info
        return null
    }
}
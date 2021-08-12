package com.hsousa_apps.Autocarros.data

class Functions {

    fun getOptions(origin: String, destination: String): ArrayList<Route>{
        val ret: MutableList<Route> = mutableListOf()
        val originStop: Stop = Datasource().getStop(origin)
        val destinationStop: Stop = Datasource().getStop(destination)
        for (route in Datasource().getAllRoutes())
            if(route.stops.containsKey(originStop) and route.stops.containsKey(destinationStop) and (route.getStopIdx(originStop) < route.getStopIdx(destinationStop)))
                ret.add(route)
        return ret as ArrayList<Route>
    }
}

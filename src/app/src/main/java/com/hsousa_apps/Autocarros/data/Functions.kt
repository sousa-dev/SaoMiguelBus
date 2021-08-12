package com.hsousa_apps.Autocarros.data

class Functions {

    fun getOptions(origin: String, destination: String): ArrayList<Route>{
        val ret: MutableList<Route> = mutableListOf()
        for (route in Datasource().getAllRoutes())
            if(route.stops.containsKey(Datasource().getStop(origin)) and route.stops.containsKey(Datasource().getStop(destination)) and (route.getStopIdx(Datasource().getStop(origin)) < route.getStopIdx(Datasource().getStop(destination))))
                ret.add(route)
        return ret as ArrayList<Route>
    }
}

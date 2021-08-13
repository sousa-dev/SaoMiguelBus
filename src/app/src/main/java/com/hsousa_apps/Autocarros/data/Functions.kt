package com.hsousa_apps.Autocarros.data

import android.provider.ContactsContract

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

    fun getStopRoutes(stop: String): ArrayList<Route>{
        val ret: MutableList<Route> = mutableListOf()
        val getStop: Stop = Datasource().getStop(stop)
        for (route in Datasource().getAllRoutes())
           if (route.stops.containsKey(getStop)) ret.add(route)
        return ret as ArrayList<Route>
    }
}

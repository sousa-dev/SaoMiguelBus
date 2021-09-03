package com.hsousa_apps.Autocarros.data

import android.provider.ContactsContract

class Functions {

    fun getOptions(origin: String, destination: String, TypeOfDay: TypeOfDay = com.hsousa_apps.Autocarros.data.TypeOfDay.WEEKDAY): ArrayList<Route>{
        val ret: MutableList<Route> = mutableListOf()
        val originStop: Stop = Datasource().getStop(origin)
        val destinationStop: Stop = Datasource().getStop(destination)
        for (route in Datasource().getAllRoutes())
            if(route.stops.containsKey(originStop) and route.stops.containsKey(destinationStop) and (route.getStopIdx(originStop) < route.getStopIdx(destinationStop)) and (route.day == TypeOfDay))
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

    fun translateStops(lang: String){
        if (lang == "en"){
            Datasource().getStop("Ajuda - Igreja").name = "Ajuda - Church"
            Datasource().getStop("Remédios - Igreja").name = "Remédios - Church"
            Datasource().getStop("Santo António - Igreja").name = "Santo António - Church"
            Datasource().getStop("São Vicente - Igreja").name = "São Vicente - Church"
            Datasource().getStop("Sete Cidades - Ponte").name = "Sete Cidades - Bridge"
            Datasource().getStop("Sete Cidades - Igreja").name = "Sete Cidades - Church"
            Datasource().getStop("Fenais da Luz - Igreja").name = "Fenais da Luz - Church"
            Datasource().getStop("Mosteiros - Igreja").name = "Mosteiros - Church"
            Datasource().getStop("Ginetes - Igreja").name = "Ginetes - Church"
            Datasource().getStop("Feteiras - Igreja").name = "Feteiras - Church"
            Datasource().getStop("Relva - Igreja").name = "Relva - Church"

        }
    }
}

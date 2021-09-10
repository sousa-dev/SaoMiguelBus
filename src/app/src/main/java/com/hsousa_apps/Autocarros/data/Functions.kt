package com.hsousa_apps.Autocarros.data

import android.util.Log


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

    fun r328(lang: String): String {
        if (lang == "pt")
            return ""
        else if (lang == "de")
            return ""
        return ""
    }

    fun fsaobras(lang: String): String {
        if (lang == "pt")
            return "Saída no Forte de São Brás"
        else if (lang == "de")
            return ""
        return "This service starts at Forte de São Brás"
    }

    fun school(lang: String): String {
        if (lang == "pt")
            return "Período Escolar"
        else if (lang == "de")
            return ""
        return "School Period"
    }

    fun onlySchool(lang: String): String {
        if (lang == "pt")
            return "Só em período escolar"
        else if (lang == "de")
            return ""
        return "Only School Period"
    }

    fun normal(lang: String): String {
        if (lang == "pt")
            return "Período Normal"
        else if (lang == "de")
            return ""
        return "Normal Period"
    }

    fun julyToSep(lang: String): String {
        if (lang == "pt")
            return "De 15 de julho até 15 de setembro"
        else if (lang == "de")
            return ""
        return "From July 15th to September 15th"
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
        else if (lang == "de"){
            Datasource().getStop("Ajuda - Igreja").name = "Ajuda - Kirche"
            Datasource().getStop("Remédios - Igreja").name = "Remédios - Kirche"
            Datasource().getStop("Santo António - Igreja").name = "Santo António - Kirche"
            Datasource().getStop("São Vicente - Igreja").name = "São Vicente - Kirche"
            Datasource().getStop("Sete Cidades - Ponte").name = "Sete Cidades - Brücke"
            Datasource().getStop("Sete Cidades - Igreja").name = "Sete Cidades - Kirche"
            Datasource().getStop("Fenais da Luz - Igreja").name = "Fenais da Luz - Kirche"
            Datasource().getStop("Mosteiros - Igreja").name = "Mosteiros - Kirche"
            Datasource().getStop("Ginetes - Igreja").name = "Ginetes - Kirche"
            Datasource().getStop("Feteiras - Igreja").name = "Feteiras - Kirche"
            Datasource().getStop("Relva - Igreja").name = "Relva - Kirche"
        }
    }
}

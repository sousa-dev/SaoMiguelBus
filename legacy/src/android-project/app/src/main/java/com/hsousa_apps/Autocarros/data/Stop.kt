package com.hsousa_apps.Autocarros.data

class Stop constructor(var name: String, val coordinates: Location) {

    init {
        if (!Datasource().getStops().contains(this)) Datasource().addStop(this)
    }
    override fun toString(): String{
        return name
    }
}
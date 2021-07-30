package com.hsousa_apps.Autocarros.data

class Stop constructor(val name: String, val coordinates: Location) {

    init {
        if (!Datasource().getStops().contains(this)) Datasource().addStop(this)
    }
}
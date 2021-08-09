package com.hsousa_apps.Autocarros.models

import com.hsousa_apps.Autocarros.fragments.RoutePageFragment

class CardModel {
    var id: String? = null
    var from: String? = null
    var to: String? = null
    var time: String? = null
    var img : Int? = null
    var fav = false


    // Constructor
    constructor(id: String, from: String, to: String, time: String, fav: Boolean, img: Int) {
        this.id = id
        this.from = from
        this.to = to
        this.time = time
        this.fav = fav
        this.img = img
    }

    // Getter and Setter

}
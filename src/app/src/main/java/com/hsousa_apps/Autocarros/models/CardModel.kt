package com.hsousa_apps.Autocarros.models

class CardModel {
    private var id: String? = null
    private var from: String? = null
    private var to: String? = null
    private var time: String? = null
    private var img : Int? = null
    private var fav = false


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
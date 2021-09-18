package com.hsousa_apps.Autocarros.models

import com.hsousa_apps.Autocarros.fragments.RoutePageFragment

class CardModel {
    var id: String? = null
    var from: String? = null
    var to: String? = null
    var time: String? = null
    var img : Int? = null
    var info : String? = null
    var delete : Boolean = false
    var unique_id: String = ""


    // Constructor
    constructor(id: String, from: String, to: String, time: String, img: Int, info: String = "", delete: Boolean = false, unique_id: String = "") {
        this.id = id
        this.from = from
        this.to = to
        this.time = time
        this.img = img
        this.info = info
        this.delete = delete
        this.unique_id = unique_id
    }

}
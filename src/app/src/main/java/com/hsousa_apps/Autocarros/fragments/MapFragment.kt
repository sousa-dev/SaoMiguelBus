package com.hsousa_apps.Autocarros.fragments

import android.content.DialogInterface
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.fragment.app.Fragment

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.core.widget.doOnTextChanged
import com.android.volley.Request
import com.android.volley.RequestQueue
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.StringRequest
import com.android.volley.toolbox.Volley
import org.osmdroid.views.MapView

import com.google.android.material.textfield.TextInputEditText
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.*
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.overlay.Marker

class MapFragment : Fragment() {

    private var currentLocation: Location = Location(0.0, 0.0)
    private lateinit var steps_text: TextView

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.map, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        /**
        val map: MapView = view.findViewById<MapView>(R.id.mapview)


        val mapController = map.controller
        mapController.setZoom(11)
        mapController.setCenter(GeoPoint(37.782712259083866, -25.497047075842598))

         Draw Waypoints on the map
        for (stop in Datasource().getStops()){
            if (stop.coordinates.x == 0.0) continue
            val point = GeoPoint(stop.coordinates.x, stop.coordinates.y)
            val marker = Marker(map)
            marker.position = point
            marker.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
            marker.title = stop.name
            map.overlays.add(marker)
        }
        **/
        val getDirections = view.findViewById<Button>(R.id.getDirections)
        val destination = view.findViewById<TextInputEditText>(R.id.find_routes_map)
        var search: String = ""

        steps_text = view.findViewById<TextView>(R.id.steps_text)



        destination.doOnTextChanged { text, start, before, count ->
            search = text.toString()
        }

        getDirections.setOnClickListener{
            if (search != ""){
                /** Send Stats to API **/
                var language : String = Datasource().getCurrentLang()
                var URL= "https://saomiguelbus-api.herokuapp.com/api/v1/stat?request=get_directions&origin=NA&destination=$search&time=NA&language=$language&platform=android&day=NA"
                val requestQueue: RequestQueue = Volley.newRequestQueue(view.context)
                var request: StringRequest = StringRequest(Request.Method.POST, URL, { response -> (Log.d("DEBUG", "Response: $response")) }, { error -> (Log.d("DEBUG", "Error Response: $error")) })
                requestQueue.add(request)
                /***********************/
                //Get Steps for Destination

                fetchSteps(requestQueue, search)

                /** Launch Google Maps Activity
                val search_split: String = search.replace(" ", "+")
                startActivity(
                    Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("google.navigation:q=$search_split")
                    ).setPackage("com.google.android.apps.maps"))
                **/
            }
            else{
                Toast.makeText(context, resources.getString(R.string.map_dest_blank), Toast.LENGTH_SHORT).show()
            }
        }
    }

    fun fetchSteps(requestQueue: RequestQueue, destination: String){
        var lang = Datasource().getCurrentLang()
        if (lang == "pt")
            lang = "pt-pt"
        val mapsURL = "https://maps.googleapis.com/maps/api/directions/json?" +
                "origin=Ponta Delgada" +
                "&destination=" + destination +
                "&mode=transit" +
                "&key=" + resources.getString(R.string.API_KEY) +
                "&language=" + lang
        Log.d("MAPS", mapsURL)
        val mapsRequest: JsonObjectRequest = JsonObjectRequest(
            Request.Method.GET,
            mapsURL,
            null,
            { response ->
                try {
                    steps_text.text = ""
                    val routes: JSONArray = response["routes"] as JSONArray
                    var instructions = Instruction().init_instructions(routes)

                    var new_text = instructions.toString()
                    steps_text.text = new_text
                    Log.d("INSTRUCTIONS", new_text)
                }catch (e: JSONException){
                    Log.d("MAPS", "JSONException: $e")
                }


            },
            { error ->
                Log.d("MAPS", "Failed Response: $error")
            }
        )
        requestQueue.add(mapsRequest)
    }
}
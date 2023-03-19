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
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.core.widget.doOnTextChanged
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.android.volley.Request
import com.android.volley.RequestQueue
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.StringRequest
import com.android.volley.toolbox.Volley
import org.osmdroid.views.MapView

import com.google.android.material.textfield.TextInputEditText
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.*
import com.hsousa_apps.Autocarros.models.CardModel
import com.hsousa_apps.Autocarros.models.RouteCardAdapter
import com.hsousa_apps.Autocarros.models.StepCardAdapter
import com.hsousa_apps.Autocarros.models.StepModel
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.overlay.Marker
import java.util.ArrayList

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

        val swapStops: ImageButton = view.findViewById(R.id.swapStopsMap)

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
        val origin = view.findViewById<TextInputEditText>(R.id.find_routes_origin)
        val destination = view.findViewById<TextInputEditText>(R.id.find_routes_map)
        var search_origin: String = ""
        var search_destination: String = ""

        steps_text = view.findViewById<TextView>(R.id.steps_text)

        destination.doOnTextChanged { text, start, before, count ->
            search_destination = text.toString()
        }

        origin.doOnTextChanged { text, start, before, count ->
            search_origin = text.toString()
        }

        swapStops.setOnClickListener {
            val temp = destination.text
            destination.text = origin.text
            origin.text = temp
        }

        getDirections.setOnClickListener{
            if (search_destination != "" && search_origin != ""){
                /** Send Stats to API **/
                var language : String = Datasource().getCurrentLang()
                var URL= "https://saomiguelbus-api.herokuapp.com/api/v1/stat?request=get_directions&origin=NA&destination=$search_destination&time=NA&language=$language&platform=android&day=NA"
                val requestQueue: RequestQueue = Volley.newRequestQueue(view.context)
                var request: StringRequest = StringRequest(Request.Method.POST, URL, { response -> (Log.d("DEBUG", "Response: $response")) }, { error -> (Log.d("DEBUG", "Error Response: $error")) })
                requestQueue.add(request)
                /***********************/
                //Get Steps for Destination

                fetchSteps(requestQueue, search_origin, search_destination)

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

    private fun createCards(view: View?, steps: List<Step>) {
        val rv = view?.findViewById<RecyclerView>(R.id.map_recyclerView)
        var cards: MutableList<StepModel> = mutableListOf<StepModel>()

        for (step in steps){
            var id = step.travel_mode
            //TODO: Get icon based on travel_mode
            var icon = R.mipmap.logo_round
            if (step.travel_mode == "TRANSIT") icon = R.drawable.bus_icon
            else if (step.travel_mode == "WALKING") icon = R.drawable.walking_icon
            //TODO: Improve action based on travel_mode
            var action = step.instructions
            //TODO: Improve location handling
            var goal = step.end_location.toString()
            var distance = step.distance
            var time = step.duration

            cards.add(StepModel(id, icon, action, goal, distance, time))
        }

        //TODO: Handle cards.size() == 0

        if (rv != null) {
            rv.layoutManager = LinearLayoutManager(view?.context)
            rv?.adapter = StepCardAdapter(view.context, cards as ArrayList<StepModel>)
        }
    }

    fun fetchSteps(requestQueue: RequestQueue, origin: String, destination: String){
        var lang = Datasource().getCurrentLang()
        if (lang == "pt")
            lang = "pt-pt"
        val mapsURL = "https://maps.googleapis.com/maps/api/directions/json?" +
                "origin=" + origin +
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

                    //TODO: Handle requests with no response
                    createCards(view, instructions.routes[0].legs[0].steps)

                    Log.d("INSTRUCTIONS", instructions.toString())
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
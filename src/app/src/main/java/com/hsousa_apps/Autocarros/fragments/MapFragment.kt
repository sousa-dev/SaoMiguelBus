package com.hsousa_apps.Autocarros.fragments

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.DialogInterface
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import androidx.fragment.app.Fragment

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageButton
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.annotation.RequiresApi
import androidx.core.app.ActivityCompat
import androidx.core.widget.doOnTextChanged
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.android.volley.Request
import com.android.volley.RequestQueue
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.StringRequest
import com.android.volley.toolbox.Volley
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.tasks.Task
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
import java.text.SimpleDateFormat
import java.util.*

class MapFragment : Fragment() {

    private var currentLocation: Location = Location(0.0, 0.0)
    lateinit var fusedLocationProviderClient: FusedLocationProviderClient
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.map, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val spinner: Spinner = view.findViewById(R.id.step_spinner)
        val swapStops: ImageButton = view.findViewById(R.id.swapStopsMap)

        fusedLocationProviderClient = activity?.let {
            LocationServices.getFusedLocationProviderClient(
                it
            )
        }!!

        val time: TextView = view.findViewById(R.id.step_time_picker)
        val date: TextView = view.findViewById(R.id.step_date)

        val cal = Calendar.getInstance()
        val now = cal.time

        time.text = SimpleDateFormat("HH:mm").format(now)
        date.text = getString(R.string.today_placeholder)

        Log.d("date", cal.toString() + " " + cal.timeInMillis)

        time.setOnClickListener {
            val timeSetListener = TimePickerDialog.OnTimeSetListener{
                    _, hour, minute ->
                cal.set(Calendar.HOUR_OF_DAY, hour)
                cal.set(Calendar.MINUTE, minute)
                time.text = SimpleDateFormat("HH:mm").format(cal.time)
            }
            //TODO: Set 24hformat true depending on user preference
            TimePickerDialog(this.context, timeSetListener, cal.get(Calendar.HOUR_OF_DAY), cal.get(Calendar.MINUTE), true).show()

        }

        date.setOnClickListener {
            val dateSetListener =
                DatePickerDialog.OnDateSetListener { _, year, month, day -> //Showing the picked value in the textView
                    cal.set(Calendar.YEAR, year)
                    cal.set(Calendar.MONTH, month)
                    cal.set(Calendar.DAY_OF_MONTH, day)
                    date.text = "$day-${month+1}-$year"
                }

            context?.let { it1 ->
                DatePickerDialog(
                    it1,
                    dateSetListener, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)
                )
            }?.show()
        }


        Log.d("spinner", spinner.selectedItem.toString())

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

        var getLocation: Button = view.findViewById(R.id.step_location)

        getLocation.setOnClickListener {
            fetchLocation()
            if (checkLocationPermissions()){
                origin.setText(getString(R.string.my_location))
                search_origin = getString(R.string.my_location)
            }
        }

        if (checkLocationPermissions()){
            fetchLocation()
            //TODO: Improve my location string resource
            origin.setText(getString(R.string.my_location))
            search_origin = getString(R.string.my_location)

        }


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
                val requestQueue: RequestQueue = Volley.newRequestQueue(view.context)
                /** Send Stats to API
                var language : String = Datasource().getCurrentLang()
                var URL= "https://saomiguelbus-api.herokuapp.com/api/v1/stat?request=get_directions&origin=NA&destination=$search_destination&time=NA&language=$language&platform=android&day=NA"
                var request: StringRequest = StringRequest(Request.Method.POST, URL, { response -> (Log.d("DEBUG", "Response: $response")) }, { error -> (Log.d("DEBUG", "Error Response: $error")) })
                requestQueue.add(request)
                /***********************/**/
                //Get Steps for Destination

                fetchSteps(requestQueue, search_origin, search_destination, spinner.selectedItem.toString().lowercase(), cal.timeInMillis / 1000)
                Log.d("spinner", spinner.selectedItem.toString())


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

    private fun fetchLocation() {
        if (checkLocationPermissions()){
            val task = fusedLocationProviderClient.lastLocation
            task.addOnSuccessListener {
                if (it != null){
                    currentLocation.x = it.latitude
                    currentLocation.y = it.longitude
                }
            }
        } else {
            this.activity?.let {
                ActivityCompat.requestPermissions(
                    it,
                    arrayOf(android.Manifest.permission.ACCESS_FINE_LOCATION), 101)
                return
            }
        }
    }

    private fun checkLocationPermissions(): Boolean{
        if (this.context?.let { ActivityCompat.checkSelfPermission(it, android.Manifest.permission.ACCESS_FINE_LOCATION) } != PackageManager.PERMISSION_GRANTED
            && this.context?.let { ActivityCompat.checkSelfPermission(it, android.Manifest.permission.ACCESS_COARSE_LOCATION) } != PackageManager.PERMISSION_GRANTED)
            return false
        return true
        }

    private fun createCards(view: View?, steps: List<Step>) {
        val rv = view?.findViewById<RecyclerView>(R.id.map_recyclerView)
        var cards: MutableList<StepModel> = mutableListOf<StepModel>()

        for (step in steps){
            var leave_card: StepModel? = null
            var id = step.travel_mode
            var icon = R.mipmap.logo_round
            var action = step.instructions
            if (step.travel_mode == "TRANSIT"){
                icon = R.drawable.bus_icon
                //action = getString(R.string.catch_bus)
                var transit_details = step.transit_details

                leave_card = StepModel(step.travel_mode, R.drawable.bus_alert_icon, getString(R.string.leave_at) + " " + transit_details.arrival_stop, transit_details.arrival_stop, transit_details.arrival_time, "")

            }
            else if (step.travel_mode == "WALKING"){
                icon = R.drawable.walking_icon
                //action = getString(R.string.walk_to)
            }
            var goal = step.leg?.end_address

            var distance = step.distance
            var time = step.duration

            cards.add(StepModel(id, icon, action, goal, distance, time))
            if (leave_card != null) cards.add(leave_card)
        }

        if (rv != null) {
            rv.layoutManager = LinearLayoutManager(view?.context)
            rv?.adapter = StepCardAdapter(view.context, cards as ArrayList<StepModel>)
        }
    }
    fun fetchSteps(requestQueue: RequestQueue, origin: String, destination: String, selected: String, time: Long){
        var origin_url = origin
        var destination_url = destination

        val emptymsg = view?.findViewById<TextView>(R.id.step_emptymsg)

        var lang = Datasource().getCurrentLang()
        if (lang == "pt")
            lang = "pt-pt"

        if (origin == getString(R.string.my_location)){
            if (currentLocation.x == 0.0 && currentLocation.y == 0.0){
                //TODO: Use a string resource
                Toast.makeText(this.context, "The app doesn't have permission to access your location", Toast.LENGTH_SHORT).show()
                return
            }
            origin_url = "${currentLocation.x},${currentLocation.y}"

        }
        if (destination == getString(R.string.my_location)){
            if (currentLocation.x == 0.0 && currentLocation.y == 0.0){
                //TODO: Use a string resource
                Toast.makeText(this.context, "The app doesn't have permission to access your location", Toast.LENGTH_SHORT).show()
                return
            }
            destination_url = "${currentLocation.x},${currentLocation.y}"
        }

        var mapsURL = "https://maps.googleapis.com/maps/api/directions/json?" +
                "origin=" + origin_url +
                "&destination=" + destination_url +
                "&mode=transit" +
                "&key=" + resources.getString(R.string.API_KEY) +
                "&language=" + lang

        if (selected == getString(R.string.depart)) mapsURL += "&departure_time=$time"
        else if (selected == getString(R.string.arrive)) mapsURL += "&arrival_time=$time"

        Log.d("MAPS", mapsURL)
        val mapsRequest: JsonObjectRequest = JsonObjectRequest(
            Request.Method.GET,
            mapsURL,
            null,
            { response ->
                val status = response["status"]

                if (status == "OK") {
                    emptymsg?.visibility = View.INVISIBLE
                    try {
                        val routes: JSONArray = response["routes"] as JSONArray
                        var instructions = Instruction().init_instructions(routes)

                        createCards(view, instructions.routes[0].legs[0].steps)

                        Log.d("INSTRUCTIONS", instructions.toString())
                    } catch (e: JSONException){
                        Log.d("MAPS", "JSONException: $e")
                    }
                } else {
                    Log.e("STATUS", "Response NOT OK!")
                    emptymsg?.visibility = View.VISIBLE
                }
            },
            { error ->
                Log.d("MAPS", "Failed Response: $error")
            }
        )
        requestQueue.add(mapsRequest)
    }
}
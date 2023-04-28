package com.hsousa_apps.Autocarros.fragments

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.*
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.core.app.ActivityCompat
import androidx.core.widget.doOnTextChanged
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.android.volley.Request
import com.android.volley.RequestQueue
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.material.textfield.TextInputEditText
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.*
import com.hsousa_apps.Autocarros.models.StepCardAdapter
import com.hsousa_apps.Autocarros.models.StepModel
import org.json.JSONArray
import org.json.JSONException
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Polyline
import java.text.SimpleDateFormat
import java.util.*

class MapFragment(private var redirected_origin: String? = null, private var redirected_destination: String? = null) : Fragment() {

    private var currentLocation: Location = Location(0.0, 0.0)
    private var overview_polyline: String = ""
    private var locations: Map<String, String> = Datasource().getStopLocations()
    lateinit var fusedLocationProviderClient: FusedLocationProviderClient
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.map, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {

        if (Datasource().getUseMap() == true) {

            super.onViewCreated(view, savedInstanceState)

            val spinner: Spinner = view.findViewById(R.id.step_spinner)
            val swapStops: ImageButton = view.findViewById(R.id.swapStopsMap)
            val show_map: ImageButton = view.findViewById(R.id.show_map)

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

            time.setOnClickListener {
                val timeSetListener = TimePickerDialog.OnTimeSetListener { _, hour, minute ->
                    cal.set(Calendar.HOUR_OF_DAY, hour)
                    cal.set(Calendar.MINUTE, minute)
                    time.text = SimpleDateFormat("HH:mm").format(cal.time)
                }
                //TODO: Set 24hformat true depending on user preference
                TimePickerDialog(
                    this.context,
                    timeSetListener,
                    cal.get(Calendar.HOUR_OF_DAY),
                    cal.get(Calendar.MINUTE),
                    true
                ).show()

            }

            date.setOnClickListener {
                val dateSetListener =
                    DatePickerDialog.OnDateSetListener { _, year, month, day -> //Showing the picked value in the textView
                        cal.set(Calendar.YEAR, year)
                        cal.set(Calendar.MONTH, month)
                        cal.set(Calendar.DAY_OF_MONTH, day)
                        date.text = "$day-${month + 1}-$year"
                    }

                context?.let { it1 ->
                    DatePickerDialog(
                        it1,
                        dateSetListener,
                        cal.get(Calendar.YEAR),
                        cal.get(Calendar.MONTH),
                        cal.get(Calendar.DAY_OF_MONTH)
                    )
                }?.show()
            }


            Log.d("spinner", spinner.selectedItem.toString())


            val map: MapView = view.findViewById<MapView>(R.id.mapview)
            map.visibility = View.GONE


            val mapController = map.controller
            mapController.setZoom(11)
            // Disable all map interactions
            map.setClickable(false)
            map.setLongClickable(false)
            map.setFocusable(false)
            map.setMultiTouchControls(false)

            // Disable double tap zooming
            val doubleTapDetector =
                GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
                    override fun onDoubleTap(e: MotionEvent): Boolean {
                        return true
                    }
                })
            map.setOnTouchListener { _, event ->
                doubleTapDetector.onTouchEvent(event)
                true
            }

            mapController.setCenter(GeoPoint(37.782712259083866, -25.497047075842598))
            show_map.setOnClickListener {
                if (map.visibility == View.GONE) {
                    if (overview_polyline != "") {
                        val decodedPolyline: List<GeoPoint> = decodePolyline(overview_polyline)
                        val line = Polyline()
                        line.setPoints(decodedPolyline)
                        line.setColor(Color.RED)
                        line.setWidth(5F)
                        map.getOverlayManager().add(line)
                        map.invalidate()
                    }
                    map.visibility = View.VISIBLE
                    show_map.rotation = (-90.0).toFloat()
                } else {
                    map.visibility = View.GONE
                    show_map.rotation = (90.0).toFloat()
                }
            }

            /**
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

            var getLocation: ImageButton = view.findViewById(R.id.step_location)

            getLocation.setOnClickListener {
                fetchLocation()
                if (checkLocationPermissions()) {
                    origin.setText(getString(R.string.map_my_location))
                    search_origin = getString(R.string.map_my_location)
                }
            }

            if (checkLocationPermissions()) {
                fetchLocation()
                origin.setText(getString(R.string.map_my_location))
                search_origin = getString(R.string.map_my_location)

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

            getDirections.setOnClickListener {
                if (search_destination != "" && search_origin != "") {
                    val requestQueue: RequestQueue = Volley.newRequestQueue(view.context)
                    /** Send Stats to API
                    var language : String = Datasource().getCurrentLang()
                    var URL= "https://saomiguelbus-api.herokuapp.com/api/v1/stat?request=get_directions&origin=NA&destination=$search_destination&time=NA&language=$language&platform=android&day=NA"
                    var request: StringRequest = StringRequest(Request.Method.POST, URL, { response -> (Log.d("DEBUG", "Response: $response")) }, { error -> (Log.d("DEBUG", "Error Response: $error")) })
                    requestQueue.add(request)
                    /***********************/**/
                    //Get Steps for Destination

                    fetchSteps(
                        requestQueue,
                        search_origin,
                        search_destination,
                        spinner.selectedItem.toString().lowercase(),
                        cal.timeInMillis / 1000
                    )
                    map.overlayManager.removeAll(map.overlays)
                    map.invalidate()


                    /** Launch Google Maps Activity
                    val search_split: String = search.replace(" ", "+")
                    startActivity(
                    Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("google.navigation:q=$search_split")
                    ).setPackage("com.google.android.apps.maps"))
                     **/
                } else {
                    Toast.makeText(
                        context,
                        resources.getString(R.string.map_dest_blank),
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }

            if (redirected_origin != null && redirected_destination != null) {
                search_origin = redirected_origin as String
                origin.setText(redirected_origin)
                search_destination = redirected_destination as String
                destination.setText(redirected_destination)

                val requestQueue: RequestQueue = Volley.newRequestQueue(view.context)
                //TODO: Uncomment all send stats to api
                /** Send Stats to API
                var language : String = Datasource().getCurrentLang()
                var URL= "https://saomiguelbus-api.herokuapp.com/api/v1/stat?request=get_directions&origin=NA&destination=$search_destination&time=NA&language=$language&platform=android&day=NA"
                var request: StringRequest = StringRequest(Request.Method.POST, URL, { response -> (Log.d("DEBUG", "Response: $response")) }, { error -> (Log.d("DEBUG", "Error Response: $error")) })
                requestQueue.add(request)
                /***********************/**/
                //Get Steps for Destination

                fetchSteps(
                    requestQueue,
                    search_origin,
                    search_destination,
                    spinner.selectedItem.toString().lowercase(),
                    cal.timeInMillis / 1000
                )

                map.overlayManager.removeAll(map.overlays)
                map.invalidate()
            }
        } else if (Datasource().getUseMap() == false) {
            val builder = context?.let { AlertDialog.Builder(it) }
            builder?.setTitle(getString(R.string.monthly_limit_reached_title))
            builder?.setMessage(getString(R.string.monthly_limit_reached_body))

            builder?.setPositiveButton(android.R.string.yes) { dialog, which ->
                swapFrags(HomeFragment())
            }

            builder?.show()
        } else {
            val builder = context?.let { AlertDialog.Builder(it) }
            builder?.setTitle(getString(R.string.failed_response_title))
            builder?.setMessage(getString(R.string.failed_response_desc))

            builder?.setPositiveButton(android.R.string.yes) { dialog, which ->
                swapFrags(HomeFragment())
            }

            builder?.show()
        }
    }
    fun decodePolyline(polyline: String): List<GeoPoint> {
        val poly = ArrayList<GeoPoint>()
        var index = 0
        val len = polyline.length
        var lat = 0
        var lng = 0

        while (index < len) {
            var b: Int
            var shift = 0
            var result = 0

            do {
                b = polyline[index++].toInt() - 63
                result = result or (b and 0x1f shl shift)
                shift += 5
            } while (b >= 0x20)

            val dlat = if (result and 1 != 0) -(result shr 1) else result shr 1

            shift = 0
            result = 0

            do {
                b = polyline[index++].toInt() - 63
                result = result or (b and 0x1f shl shift)
                shift += 5
            } while (b >= 0x20)

            val dlng = if (result and 1 != 0) -(result shr 1) else result shr 1

            lat += dlat
            lng += dlng

            val p = GeoPoint(lat.toDouble() / 1E5, lng.toDouble() / 1E5)
            poly.add(p)
        }

        return poly
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

    private fun swapFrags(f : Fragment) {
        val t = activity?.supportFragmentManager?.beginTransaction()
        if (t != null) {
            t.replace(R.id.frag_container, f)
            t.addToBackStack(null)
            t.commit()
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
        val map = view?.findViewById<MapView>(R.id.mapview)
        val show_map = view?.findViewById<ImageButton>(R.id.show_map)
        var cards: MutableList<StepModel> = mutableListOf<StepModel>()

        if (rv != null){
            rv?.layoutManager = LinearLayoutManager(view?.context)
            rv?.adapter = StepCardAdapter(view.context, cards as ArrayList<StepModel>)
        }

        for (step in steps){
            var leave_card: StepModel? = null
            var id = step.travel_mode
            var icon = R.mipmap.logo_round
            var action = step.instructions
            var details = ""
            if (step.travel_mode == "TRANSIT"){
                icon = R.drawable.bus_icon
                //action = getString(R.string.catch_bus)
                var transit_details = step.transit_details

                leave_card = StepModel(step.travel_mode, R.drawable.bus_alert_icon, getString(R.string.leave_at) + " " + transit_details.arrival_stop, transit_details.arrival_stop, transit_details.arrival_time.replace(":", "h"), "", "")
                details = getDetails(step.transit_details)
            }
            else if (step.travel_mode == "WALKING"){
                icon = R.drawable.walking_icon
                //action = getString(R.string.walk_to)
            }
            var goal = step.leg?.end_address

            var distance = step.distance
            var time = step.duration

            if (step.travel_mode == "TRANSIT"){
                distance = step.transit_details.departure_time.replace(":", "h")
            }

            cards.add(StepModel(id, icon, action, goal, distance, time, details))
            if (leave_card != null) cards.add(leave_card)
        }

        if (rv != null) {
            rv.layoutManager = LinearLayoutManager(view?.context)
            rv?.adapter = StepCardAdapter(view.context, cards as ArrayList<StepModel>)
            if (overview_polyline != ""){
                val decodedPolyline: List<GeoPoint> = decodePolyline(overview_polyline)
                val line = Polyline()
                line.setPoints(decodedPolyline)
                line.setColor(Color.RED)
                line.setWidth(5F)
                map?.getOverlayManager()?.add(line)
                map?.invalidate()
            }
            map?.visibility = View.VISIBLE
            show_map?.rotation = (-90.0).toFloat()
        }
    }

    fun getDetails(transitDetails: TransitDetails): String {
        var details = ""
        details += "${transitDetails.line.name}\n\n"
        /**
        details += "\t${transitDetails.departure_stop} -> ${transitDetails.arrival_stop}\n"
        details += "\t${transitDetails.departure_time} -> ${transitDetails.arrival_time}\n"
        **/
        if (transitDetails.line.agencies.size > 0){
            for (agency in transitDetails.line.agencies){
                var phone = agency.phone
                if (phone.startsWith("011")) phone = phone.replace("011 ", "+")
                details += "${getString(R.string.service_run)} "
                details += agency.name + "\n\t" + phone /**+ "\n\t" + agency.url**/
            }
        }
        return details
    }

    fun fetchSteps(requestQueue: RequestQueue, origin: String, destination: String, selected: String, time: Long){
        var origin_url = origin
        var destination_url = destination

        val emptymsg = view?.findViewById<TextView>(R.id.step_emptymsg)

        var lang = Datasource().getCurrentLang()
        if (lang == "pt")
            lang = "pt-pt"

        if (origin == getString(R.string.map_my_location)){
            if (currentLocation.x == 0.0 && currentLocation.y == 0.0){
                //TODO: Use a string resource
                Toast.makeText(this.context, "The app doesn't have permission to access your location", Toast.LENGTH_SHORT).show()
                return
            }
            origin_url = "${currentLocation.x},${currentLocation.y}"

        }
        if (destination == getString(R.string.map_my_location)){
            if (currentLocation.x == 0.0 && currentLocation.y == 0.0){
                //TODO: Use a string resource
                Toast.makeText(this.context, "The app doesn't have permission to access your location", Toast.LENGTH_SHORT).show()
                return
            }
            destination_url = "${currentLocation.x},${currentLocation.y}"
        }

        if (origin.strip().lowercase().replace("-", "").replace(" ", "") in locations.keys){
            origin_url = locations[origin.strip().lowercase().replace("-", "").replace(" ", "")].toString()
        }
        if (destination.strip().lowercase().replace(" ", "") in locations.keys){
            destination_url = locations[destination.strip().lowercase().replace("-", "").replace(" ", "")].toString()
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
                Log.d("DEBUG", "response: $response")
                val status = response["status"]

                if (status == "OK") {
                    emptymsg?.visibility = View.INVISIBLE
                    try {
                        val routes: JSONArray = response["routes"] as JSONArray
                        var instructions = Instruction().init_instructions(routes)

                        overview_polyline = instructions.routes[0].overview_polyline_points

                        createCards(view, instructions.routes[0].legs[0].steps)

                        Log.d("INSTRUCTIONS", instructions.toString())
                    } catch (e: JSONException){
                        Log.d("MAPS", "JSONException: $e")
                    }
                } else {
                    Log.e("STATUS", "Response NOT OK!")

                    val rv = view?.findViewById<RecyclerView>(R.id.map_recyclerView)
                    var cards: MutableList<StepModel> = mutableListOf<StepModel>()

                    if (rv != null){
                        rv?.layoutManager = LinearLayoutManager(view?.context)
                        rv?.adapter = view?.let { StepCardAdapter(it.context, cards as ArrayList<StepModel>) }
                    }
                    val map = view?.findViewById<MapView>(R.id.mapview)
                    val show_map = view?.findViewById<ImageButton>(R.id.show_map)
                    map?.overlayManager?.removeAll(map.overlays)
                    map?.invalidate()
                    map?.visibility = View.GONE
                    show_map?.rotation = (90.0).toFloat()
                    emptymsg?.visibility = View.VISIBLE
                    overview_polyline = ""
                }
            },
            { error ->
                Log.d("MAPS", "Failed Response: $error")
            }
        )
        requestQueue.add(mapsRequest)
    }
}
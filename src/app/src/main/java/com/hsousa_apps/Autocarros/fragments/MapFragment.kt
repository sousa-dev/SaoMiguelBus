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
import android.widget.Toast
import androidx.core.widget.doOnTextChanged
import org.osmdroid.views.MapView

import com.google.android.material.textfield.TextInputEditText
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.Datasource
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.overlay.Marker

class MapFragment : Fragment() {


    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.map, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val map: MapView = view.findViewById<MapView>(R.id.mapview)


        val mapController = map.controller
        mapController.setZoom(11)
        mapController.setCenter(GeoPoint(37.782712259083866, -25.497047075842598))

        for (stop in Datasource().getStops()){
            if(stop.coordinates.x == 0.0) continue
            val point = GeoPoint(stop.coordinates.x, stop.coordinates.y)
            val marker = Marker(map)
            marker.position = point
            marker.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
            marker.title = stop.name
            map.overlays.add(marker)
        }

        val getDirections = view.findViewById<Button>(R.id.getDirections)
        val destination = view.findViewById<TextInputEditText>(R.id.find_routes_map)
        var search: String = ""



        destination.doOnTextChanged { text, start, before, count ->
            search = text.toString()
        }

        getDirections.setOnClickListener{
            if (search != ""){
                val search_split: String = search.replace(" ", "+")
                startActivity(
                    Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("google.navigation:q=$search_split")
                    ).setPackage("com.google.android.apps.maps"))
            }
            else{
                Toast.makeText(context, resources.getString(R.string.map_dest_blank), Toast.LENGTH_SHORT).show()
            }
        }
    }
}
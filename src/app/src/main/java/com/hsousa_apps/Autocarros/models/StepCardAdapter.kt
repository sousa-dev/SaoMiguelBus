 package com.hsousa_apps.Autocarros.models

import android.content.Context
import android.content.DialogInterface
import android.content.Intent
import android.net.Uri
import android.opengl.Visibility
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.GestureDetector
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.annotation.Nullable
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.content.ContextCompat.startActivity
import androidx.recyclerview.widget.RecyclerView
import com.google.gson.Gson
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.data.Functions
import com.hsousa_apps.Autocarros.data.TypeOfDay
import com.hsousa_apps.Autocarros.fragments.HomeFragment
import com.hsousa_apps.Autocarros.fragments.SearchFragment
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import java.util.ArrayList

class StepCardAdapter(private val context: Context, private val StepsArrayList: ArrayList<StepModel>) : RecyclerView.Adapter<StepCardAdapter.Viewholder>() {
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Viewholder {
        // to inflate the layout for each item of recycler view.
        val view: View =
            LayoutInflater.from(parent.context).inflate(R.layout.instruction_step_layout, parent, false)
        return Viewholder(view)

    }

    override fun onBindViewHolder(holder: Viewholder, position: Int) {
        // to set data to textview and imageview of each card layout
        holder.details_group.visibility = View.GONE
        val step: StepModel = StepsArrayList[position]
        holder.id.text = step.id
        step.icon?.let { holder.icon.setImageResource(it) }
        holder.action.text = step.action
        holder.goal.text = step.goal
        holder.distance.text = step.distance
        holder.time.text = step.time
        holder.details.text = step.details
        if (step.details == "") holder.show_details.visibility = View.INVISIBLE

        var loc_intent = "${step.destinationLocation.x},${step.destinationLocation.y}"
        var intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://maps.google.com/maps?daddr=$loc_intent&travelmode=walking"))
        var options: Bundle? = null
        if (step.icon.toString() == "2131230865"){
            intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/search/?api=1&query=$loc_intent"))
        }

        if (step.destinationLocation.x != 0.0 && step.destinationLocation.y != 0.0){

            val mapController = holder.map.controller
            mapController.setZoom(15)
            // Disable all map interactions
            holder.map.setClickable(false)
            holder.map.setLongClickable(false)
            holder.map.setFocusable(false)
            holder.map.setMultiTouchControls(false)

            // Disable double tap zooming
            val doubleTapDetector =
                GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
                    override fun onDoubleTap(e: MotionEvent): Boolean {
                        startActivity(context, intent, options)
                        return true
                    }
                })
            holder.map.setOnTouchListener { _, event ->
                Toast.makeText(context, context.getString(R.string.double_tap_maps), Toast.LENGTH_SHORT).show()

                doubleTapDetector.onTouchEvent(event)

                true

            }

            val goal_point = GeoPoint(step.destinationLocation.x, step.destinationLocation.y)
            val goal_marker = Marker(holder.map)
            goal_marker.position = goal_point
            goal_marker.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
            goal_marker.title = step.goal

            val current_point = GeoPoint(step.currentLocation.x, step.currentLocation.y)
            val current_marker = Marker(holder.map)
            current_marker.position = current_point
            current_marker.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
            current_marker.title = context.getString(R.string.map_my_location)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                goal_marker.icon = context.getDrawable(R.drawable.baseline_location_on_24)
                current_marker.icon = context.getDrawable(R.drawable.baseline_my_location_24_blue)
            }
            holder.map.overlays.add(goal_marker)

            mapController.setCenter(GeoPoint(step.destinationLocation.x, step.destinationLocation.y))
        }

        holder.show_details.setOnClickListener {
            if (step.destinationLocation.y != 0.0 && step.destinationLocation.y != 0.0){
                if (holder.walk_details_group.visibility == View.GONE){
                    holder.walk_details_group.visibility = View.VISIBLE
                    holder.map.visibility = View.VISIBLE
                    holder.show_details.setImageResource(R.drawable.baseline_arrow_drop_up_24)
                }
                else {
                    holder.walk_details_group.visibility = View.GONE
                    holder.map.visibility = View.GONE
                    holder.show_details.setImageResource(R.drawable.baseline_arrow_drop_down_24)
                }
            } else{
                if (holder.details_group.visibility == View.GONE){
                    holder.details_group.visibility = View.VISIBLE

                    holder.show_details.setImageResource(R.drawable.baseline_arrow_drop_up_24)
                }
                else {
                    holder.details_group.visibility = View.GONE

                    holder.show_details.setImageResource(R.drawable.baseline_arrow_drop_down_24)
                }
            }
        }

    }

    override fun getItemCount(): Int {
        // this method is used for showing number
        // of card items in recycler view.
        return StepsArrayList.size
    }

    // View holder class for initializing of
    // your views such as TextView and Imageview.
    inner class Viewholder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val id: TextView
        val icon: ImageView
        var action: TextView
        val goal: TextView
        val distance: TextView
        val time: TextView
        val details: TextView
        val details_group: ConstraintLayout
        val walk_details_group: ConstraintLayout
        val map: MapView
        val show_details: ImageButton
        init {
            id = itemView.findViewById(R.id.step_id)
            icon = itemView.findViewById(R.id.step_icon)
            action = itemView.findViewById(R.id.step_action)
            goal = itemView.findViewById(R.id.step_goal)
            distance = itemView.findViewById(R.id.step_distance)
            time = itemView.findViewById(R.id.step_time)
            details = itemView.findViewById(R.id.step_details)
            details_group = itemView.findViewById(R.id.step_details_group)
            walk_details_group = itemView.findViewById(R.id.walk_details_group)
            map = itemView.findViewById(R.id.walk_mapview)
            show_details = itemView.findViewById(R.id.step_spoiler)
        }
    }

}
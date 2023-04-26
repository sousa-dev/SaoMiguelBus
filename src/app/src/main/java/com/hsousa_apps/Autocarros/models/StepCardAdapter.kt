 package com.hsousa_apps.Autocarros.models

import android.content.Context
import android.opengl.Visibility
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.recyclerview.widget.RecyclerView
import com.google.gson.Gson
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.data.Functions
import com.hsousa_apps.Autocarros.data.TypeOfDay
import com.hsousa_apps.Autocarros.fragments.HomeFragment
import com.hsousa_apps.Autocarros.fragments.SearchFragment
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
        holder.show_details.setOnClickListener {
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
            show_details = itemView.findViewById(R.id.step_spoiler)
        }
    }

}
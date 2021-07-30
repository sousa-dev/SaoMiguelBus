package com.hsousa_apps.Autocarros.models

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.Route
import java.util.ArrayList

class RouteCardAdapter(private val context: Context, private val RoutesArrayList: ArrayList<CardModel>) : RecyclerView.Adapter<RouteCardAdapter.Viewholder>() {
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Viewholder {
        // to inflate the layout for each item of recycler view.
        val view: View =
            LayoutInflater.from(parent.context).inflate(R.layout.route_layout, parent, false)
        return Viewholder(view)

    }

    override fun onBindViewHolder(holder: Viewholder, position: Int) {
        // to set data to textview and imageview of each card layout
        val route: CardModel = RoutesArrayList[position]
        holder.id.text = route.id
        holder.from.text = route.from
        holder.to.text = route.to
        holder.time.text = route.time
    }

    override fun getItemCount(): Int {
        // this method is used for showing number
        // of card items in recycler view.
        return RoutesArrayList.size
    }

    // View holder class for initializing of
    // your views such as TextView and Imageview.
    inner class Viewholder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val id: TextView
        val from: TextView
        val to: TextView
        val time: TextView
        val company: ImageView
        val fav: ImageButton

        init {
            id = itemView.findViewById(R.id.route_id)
            from = itemView.findViewById(R.id.route_origin)
            to = itemView.findViewById(R.id.route_destination)
            time = itemView.findViewById(R.id.route_time)
            company = itemView.findViewById(R.id.route_company)
            fav = itemView.findViewById(R.id.favorite)
        }
    }

}
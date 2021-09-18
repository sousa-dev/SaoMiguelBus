package com.hsousa_apps.Autocarros.models

import android.content.Context
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.recyclerview.widget.RecyclerView
import com.google.gson.Gson
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.data.Functions
import com.hsousa_apps.Autocarros.data.TypeOfDay
import com.hsousa_apps.Autocarros.fragments.HomeFragment
import com.hsousa_apps.Autocarros.fragments.SearchFragment
import java.util.ArrayList

class RouteCardAdapter(private val context: Context, private val RoutesArrayList: ArrayList<CardModel>, private val op: Int = 0, private val day: TypeOfDay = TypeOfDay.WEEKDAY) : RecyclerView.Adapter<RouteCardAdapter.Viewholder>() {
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
        if(route.delete) holder.delete.visibility = View.VISIBLE

        holder.delete.setOnClickListener {
            Datasource().removeFavorite(listOf(route.from, route.to) as List<String>)
            Toast.makeText(
                context,
                Functions().removeFav(Datasource().getCurrentLang()),
                Toast.LENGTH_SHORT
            ).show()
            HomeFragment().getVieww()?.let { it1 -> HomeFragment().notifyDataChange(it1) }
        }

        route.img?.let { holder.company.setImageResource(it) }
        holder.click.setOnClickListener {
            if (op == 2){
                HomeFragment().openFavRoute(holder.from.text.toString(), holder.to.text.toString(), holder.itemView)
            }
            else
                route.info?.let { it1 -> SearchFragment().openRoutePage(holder.id.text.toString(), holder.from.text.toString(), holder.to.text.toString(), holder.time.text.toString(), holder.itemView, op, day, info = it1) }
        }
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
        val click: Button
        val delete: ImageButton

        init {
            id = itemView.findViewById(R.id.route_id)
            from = itemView.findViewById(R.id.route_origin)
            to = itemView.findViewById(R.id.route_destination)
            time = itemView.findViewById(R.id.route_time)
            company = itemView.findViewById(R.id.route_company)
            click = itemView.findViewById(R.id.go_to_route_page)
            delete = itemView.findViewById(R.id.remove_fav_home)

        }
    }

}
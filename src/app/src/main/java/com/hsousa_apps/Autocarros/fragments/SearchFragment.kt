package com.hsousa_apps.Autocarros.fragments

import android.content.Context
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.RadioGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.android.volley.Request
import com.android.volley.RequestQueue
import com.android.volley.toolbox.JsonArrayRequest
import com.android.volley.toolbox.StringRequest
import com.android.volley.toolbox.Volley
import com.google.gson.Gson
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.data.Functions
import com.hsousa_apps.Autocarros.data.Route
import com.hsousa_apps.Autocarros.data.TypeOfDay
import com.hsousa_apps.Autocarros.models.CardModel
import com.hsousa_apps.Autocarros.models.RouteCardAdapter
import kotlin.collections.ArrayList


class SearchFragment(private var origin: String? = null, private var destination: String? = null, private var times: ArrayList<Route>? = null, private var unique_id: String = "") : Fragment(), View.OnClickListener {
    private var og_origin = origin
    private var og_destination = destination
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.search_layout, container, false);
    }


    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val from: TextView = view.findViewById(R.id.from_search)
        val to: TextView = view.findViewById(R.id.to_search)
        var TypeOfDay: TypeOfDay = TypeOfDay.WEEKDAY

        origin = origin?.let { Datasource().getStop(it).name }
        destination = destination?.let { Datasource().getStop(it).name }

        from.text = origin
        to.text = destination

        val swapStops: ImageButton = view.findViewById(R.id.swapStopsSearch)

        if (origin != null && destination != null) {
            createCards(this.view, origin!!, destination!!)
        }

        swapStops.setOnClickListener {
            val temp = from.text
            from.text = to.text
            to.text = temp

            origin = from.text.toString()
            destination = to.text.toString()

            if (listOf(origin, destination) !in Datasource().getFavorite()) {
                val fav = view.findViewById<ImageButton>(R.id.favorite)
                fav.setImageResource(R.mipmap.heartoff)
                fav.tag = R.mipmap.heartoff
            }
            else{
                val fav = view.findViewById<ImageButton>(R.id.favorite)
                fav.setImageResource(R.mipmap.hearton)
                fav.tag = R.mipmap.hearton
            }

            times = Functions().getOptions(from.text as String, to.text as String, TypeOfDay)
            createCards(this.view, from.text as String, to.text as String)
        }

        val SelectedTypeOfDay: RadioGroup = view.findViewById(R.id.weekdays)
        SelectedTypeOfDay.setOnCheckedChangeListener { _, checkedId ->
            if (checkedId == R.id.weekday_check) {
                TypeOfDay = com.hsousa_apps.Autocarros.data.TypeOfDay.WEEKDAY
                times = Functions().getOptions(from.text as String, to.text as String, TypeOfDay)
                createCards(this.view, from.text as String, to.text as String)
            } else if (checkedId == R.id.saturday_check) {
                TypeOfDay = com.hsousa_apps.Autocarros.data.TypeOfDay.SATURDAY
                times = Functions().getOptions(from.text as String, to.text as String, TypeOfDay)
                createCards(this.view, from.text as String, to.text as String)
            } else {
                TypeOfDay = com.hsousa_apps.Autocarros.data.TypeOfDay.SUNDAY
                times = Functions().getOptions(from.text as String, to.text as String, TypeOfDay)
                createCards(this.view, from.text as String, to.text as String)
            }
        }

        val fav = view.findViewById<ImageButton>(R.id.favorite)

        if (listOf(origin, destination) in Datasource().getFavorite()) {
            fav.setImageResource(R.mipmap.hearton)
            fav.tag = R.mipmap.hearton
        }

        fav.setOnClickListener {
            if (fav.tag == R.mipmap.hearton) {
                fav.setImageResource(R.mipmap.heartoff)
                fav.tag = R.mipmap.heartoff
                Datasource().removeFavorite(listOf(origin, destination) as List<String>)
                Toast.makeText(
                    context,
                    resources.getString(R.string.remove_fav_toast_message),
                    Toast.LENGTH_SHORT
                ).show()
            } else {
                fav.setImageResource(R.mipmap.hearton)
                fav.tag = R.mipmap.hearton
                Datasource().addFavorite(origin, destination)
                Toast.makeText(
                    context,
                    resources.getString(R.string.add_fav_toast_message),
                    Toast.LENGTH_SHORT
                ).show()
            }
            val pref = requireActivity().getPreferences(Context.MODE_PRIVATE)
            val editor = pref.edit()
            val gson = Gson()

            val json: String = gson.toJson(Datasource().getFavorite())

            editor.putString("favorites", json)
            editor.commit()
        }
    }

    private fun createCards(view: View?, origin: String, destination: String){
        val rv = view?.findViewById<RecyclerView>(R.id.routes_recyclerView)
        val emptymsg = view?.findViewById<TextView>(R.id.emptymsg)
        emptymsg?.visibility = View.INVISIBLE
        var cards: MutableList<CardModel> = mutableListOf<CardModel>()

        if (times != null) {
            for(route in times!!){
                for (i in 0 until route.getNStops(route.getOrigin())!!)
                    if (route.getStopTime(Datasource().getStop(origin), i) != "---" && route.getStopTime(Datasource().getStop(destination), i) != "---")
                    {
                        route.getStopTime(Datasource().getStop(origin), i)?.let {
                            route.info?.let { it1 ->
                                CardModel(route.id, origin, destination,
                                    it, route.company, info = it1, unique_id = route.unique_id
                                )
                            }
                        }?.let {
                            cards.add(it) }
                    }
            }
        }


        if(cards.size > 1){
            /** Send Stats to API **/
            var language : String = Datasource().getCurrentLang()
            var URL= "https://saomiguelbus-api.herokuapp.com/api/v1/stat?request=get_route&origin=$origin&destination=$destination&time=NA&language=$language&platform=android&day=NA"
            val requestQueue: RequestQueue = Volley.newRequestQueue(view?.context)
            var request: StringRequest = StringRequest(Request.Method.POST, URL, { response -> (Log.d("DEBUG", "Response: $response")) }, { error -> (Log.d("DEBUG", "Error Response: $error")) })
            requestQueue.add(request)
            /***********************/
            cards = cards.sortedWith(compareBy { it.time }).toList() as MutableList<CardModel>
        }

        if (rv != null) {
            rv.layoutManager = LinearLayoutManager(view?.context)
            rv?.adapter = RouteCardAdapter(view.context, cards as java.util.ArrayList<CardModel>)
        }
        if (cards.size == 0){
            emptymsg?.text = resources.getString(R.string.no_routes_found)
            emptymsg?.visibility = View.VISIBLE
            redirectToMap()
        }

    }

    fun redirectToMap(){
        if (Datasource().getUseMap() == true)
            swapFrags(MapFragment(og_origin?.split("-")?.get(0), og_destination?.split("-")?.get(0)))
    }

    fun openRoutePage(
        id: String,
        origin: String,
        destination: String,
        time: String,
        view: View,
        op: Int = 0,
        TypeOfDay: TypeOfDay = com.hsousa_apps.Autocarros.data.TypeOfDay.WEEKDAY,
        info : String = "",
        unique_id: String = ""
    ){
        val ctx: AppCompatActivity = view?.context as AppCompatActivity
        val f : Fragment = RoutePageFragment(id, origin, destination, time, op, TypeOfDay, info, unique_id = unique_id)
        val t = ctx.supportFragmentManager.beginTransaction()

        if (t != null) {
            t.replace(R.id.frag_container, f)
            t.addToBackStack(null)
            t.commit()
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

    override fun onClick(v: View?) {
        if (v != null) {
            when (v.id) {
                /*
                R.id.bttnStores -> {
                    swapFrags(StoresFragment())
                }

                R.id.bttnProds -> {
                    swapFrags(CategoriesFragment())
                }

                R.id.searchBar -> {
                    view?.findViewById<SearchView>(R.id.searchBar)?.onActionViewExpanded()
                }*/
            }
        }
    }

}
package com.hsousa_apps.Autocarros.fragments

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.android.volley.Request
import com.android.volley.RequestQueue
import com.android.volley.toolbox.StringRequest
import com.android.volley.toolbox.Volley
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.*
import com.hsousa_apps.Autocarros.models.CardModel
import com.hsousa_apps.Autocarros.models.RouteCardAdapter
import java.util.ArrayList


class FindFragment(private var times: ArrayList<Route>? = null, private var unique_id: String = ""): Fragment(), View.OnClickListener {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.find, container, false);
    }


    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Functions().checkForCustomAd(view, requireActivity())

        val stop: AutoCompleteTextView = view.findViewById(R.id.find_routes_map)
        val actv: ImageView = view.findViewById(R.id.actv_find)
        var TypeOfDay: TypeOfDay = TypeOfDay.WEEKDAY

        val find: Button = view.findViewById(R.id.find_button)

        stop.threshold = 2

        val adapter: ArrayAdapter<Stop> = ArrayAdapter(view.context, android.R.layout.simple_dropdown_item_1line,  Datasource().getStops().sortedWith(compareBy { it.name }))
        stop.setAdapter(adapter)

        actv.setOnClickListener {
            stop.showDropDown()
        }

        createCards(this.view, TypeOfDay)

        find.setOnClickListener {
            if(stop.editableText.toString() != ""){
                val on = "None -> ${stop.editableText}"
                Functions().checkForCustomAd(view, requireActivity(), on)
                times = Functions().getStopRoutes(stop.editableText.toString())
                createCards(this.view, TypeOfDay)
                /** Send Stats to API **/
                var language : String = Datasource().getCurrentLang()
                var URL= "https://saomiguelbus-api.herokuapp.com/api/v1/stat?request=find_routes&origin=${stop.editableText.toString()}&destination=NA&time=NA&language=$language&platform=android&day=$TypeOfDay"
                val requestQueue: RequestQueue = Volley.newRequestQueue(view.context)
                var request: StringRequest = StringRequest(Request.Method.POST, URL, { response -> (Log.d("DEBUG", "Response: $response")) }, { error -> (Log.d("DEBUG", "Error Response: $error")) })
                requestQueue.add(request)
                /***********************/
            }
            else
                Toast.makeText(context, resources.getString(R.string.toast_search_message), Toast.LENGTH_SHORT).show()
        }
        val SelectedTypeOfDay: RadioGroup = view.findViewById(R.id.weekdays1)
        SelectedTypeOfDay.setOnCheckedChangeListener { _, checkedId ->
            if (checkedId == R.id.weekday_check1){
                TypeOfDay = com.hsousa_apps.Autocarros.data.TypeOfDay.WEEKDAY
                createCards(this.view, TypeOfDay)
            }
            else if (checkedId == R.id.saturday_check1){
                TypeOfDay = com.hsousa_apps.Autocarros.data.TypeOfDay.SATURDAY
                createCards(this.view, TypeOfDay)
            }

            else {
                TypeOfDay = com.hsousa_apps.Autocarros.data.TypeOfDay.SUNDAY
                createCards(this.view, TypeOfDay)
            }
        }
    }

    private fun createCards(view: View?, typeOfDay: TypeOfDay){
        val rv = view?.findViewById<RecyclerView>(R.id.find_recycler)

        var cards: MutableList<CardModel> = mutableListOf<CardModel>()

        if (times != null)
            for(route in times!!){
                if (route.day == typeOfDay) route.info?.let { CardModel(route.id, route.getOrigin().toString(), route.getDestination().toString(), "      ", route.company, info = it, unique_id = route.unique_id) }
                    ?.let { cards.add(it) }
            }

        if(cards.size > 1) cards = cards.sortedWith(compareBy { it.id }).toList() as MutableList<CardModel>
        if (rv != null) {
            rv.layoutManager = LinearLayoutManager(view?.context)
            rv?.adapter = RouteCardAdapter(view.context, cards as ArrayList<CardModel>, 1, typeOfDay)
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
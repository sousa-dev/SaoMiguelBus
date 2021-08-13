package com.hsousa_apps.Autocarros.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.data.Functions
import com.hsousa_apps.Autocarros.data.Route
import com.hsousa_apps.Autocarros.data.Stop
import com.hsousa_apps.Autocarros.models.CardModel
import com.hsousa_apps.Autocarros.models.RouteCardAdapter
import java.util.ArrayList


class FindFragment(private var times: ArrayList<Route>? = null): Fragment(), View.OnClickListener {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.find, container, false);
    }


    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val stop: AutoCompleteTextView = view.findViewById(R.id.find_routes)
        val actv: ImageView = view.findViewById(R.id.actv_find)

        val find: Button = view.findViewById(R.id.find_button)

        stop.threshold = 2

        val adapter: ArrayAdapter<Stop> = ArrayAdapter(view.context, android.R.layout.simple_dropdown_item_1line, Datasource().getStops())
        stop.setAdapter(adapter)

        actv.setOnClickListener {
            stop.showDropDown()
        }

        createCards(this.view)

        find.setOnClickListener {
            times = Functions().getStopRoutes(stop.editableText.toString())
            createCards(this.view)
        }
    }

    private fun createCards(view: View?){
        val rv = view?.findViewById<RecyclerView>(R.id.find_recycler)

        var cards: MutableList<CardModel> = mutableListOf<CardModel>()

        if (times != null)
            for(route in times!!)
                CardModel(route.id, route.getOrigin().toString(), route.getDestination().toString(), "      ", R.drawable.ic_launcher_background)?.let { cards.add(it) }


        if (rv != null) {
            rv.layoutManager = LinearLayoutManager(view?.context)
            rv?.adapter = RouteCardAdapter(view.context, cards as ArrayList<CardModel>)
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
package com.hsousa_apps.Autocarros

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.models.CardModel
import com.hsousa_apps.Autocarros.models.RouteCardAdapter
import java.util.*
import kotlin.collections.ArrayList


class SearchFragment : Fragment(), View.OnClickListener {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.search_layout, container, false);
    }


    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val rv = view?.findViewById<RecyclerView>(R.id.routes_recycleView)

        val cards: ArrayList<CardModel> = arrayListOf()

        for(route in Datasource().getAvmRoutes()){
            for (i in 0 until route.getNStops(route.getOrigin())!!-1)
            route.getStopTime(route.getOrigin(), i)?.let {
                route.getDestination()?.let { it1 ->
                    CardModel(route.id, route.getOrigin()!!.name, it1.name,
                        it, false, R.drawable.ic_launcher_background)
                }
            }?.let { cards.add(it) }
        }

        rv.layoutManager = LinearLayoutManager(view?.context)
        rv?.adapter = RouteCardAdapter(view?.context, cards)

        print(Datasource().getStops())

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
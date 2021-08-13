package com.hsousa_apps.Autocarros.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.data.Functions
import com.hsousa_apps.Autocarros.data.Route
import com.hsousa_apps.Autocarros.models.CardModel
import com.hsousa_apps.Autocarros.models.RouteCardAdapter
import kotlin.collections.ArrayList


class SearchFragment(private val origin: String? = null, private val destination: String? = null, private var times: ArrayList<Route>? = null) : Fragment(), View.OnClickListener {
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

        from.text = origin
        to.text = destination

        val swapStops: ImageButton = view.findViewById(R.id.swapStopsSearch)

        if (origin != null && destination != null) {
            createCards(this.view, origin, destination)
        }

        swapStops.setOnClickListener {
            val temp = from.text
            from.text = to.text
            to.text = temp

            times = Functions().getOptions(from.text as String, to.text as String)
            createCards(this.view, from.text as String, to.text as String)
       }

    }

    private fun createCards(view: View?, origin: String, destination: String){
        val rv = view?.findViewById<RecyclerView>(R.id.routes_recycleView)
        val emptymsg = view?.findViewById<TextView>(R.id.emptymsg)
        emptymsg?.visibility = View.INVISIBLE
        var cards: MutableList<CardModel> = mutableListOf<CardModel>()

        if (times != null) {
            for(route in times!!)
                for (i in 0 until route.getNStops(route.getOrigin())!!)
                    if (route.getStopTime(Datasource().getStop(origin), i) != "---" && route.getStopTime(Datasource().getStop(destination), i) != "---")
                        route.getStopTime(Datasource().getStop(origin), i)?.let {
                            CardModel(route.id, origin, destination,
                                it, R.drawable.ic_launcher_background
                            )
                        }?.let { cards.add(it) }
        }

        if(cards.isNotEmpty()) cards = cards.sortedWith(compareBy { it.time }).toList() as MutableList<CardModel>

        if (rv != null) {
            rv.layoutManager = LinearLayoutManager(view?.context)
            rv?.adapter = RouteCardAdapter(view.context, cards as java.util.ArrayList<CardModel>)
        }
        if (cards.size == 0){
            emptymsg?.text = "Não há rotas diretas de " + origin + " para " + destination + " :("
            emptymsg?.visibility = View.VISIBLE
        }

    }

    fun openRoutePage(id: String, origin: String, destination: String, time: String, view: View){
        val ctx: AppCompatActivity = view?.context as AppCompatActivity
        val f : Fragment = RoutePageFragment(id, origin, destination, time)
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
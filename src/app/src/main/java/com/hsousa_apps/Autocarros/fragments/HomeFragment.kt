package com.hsousa_apps.Autocarros.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.data.Functions
import com.hsousa_apps.Autocarros.data.Stop
import com.hsousa_apps.Autocarros.models.CardModel
import com.hsousa_apps.Autocarros.models.RouteCardAdapter
import java.util.ArrayList


class HomeFragment : Fragment(), View.OnClickListener {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.home, container, false);
    }


    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val from: AutoCompleteTextView = view.findViewById(R.id.from_home)
        val to: AutoCompleteTextView = view.findViewById(R.id.to_home)
        val actv_from: ImageView = view.findViewById(R.id.actv1)
        val actv_to: ImageView = view.findViewById(R.id.actv2)

        val search: Button = view.findViewById(R.id.homeSearch)
        val swapStops: ImageButton = view.findViewById(R.id.swapStops)

        from.threshold = 2
        to.threshold = 2

        val adapter1: ArrayAdapter<Stop> = ArrayAdapter(view.context, android.R.layout.simple_dropdown_item_1line, Datasource().getStops().sortedWith(compareBy { it.name }))
        from.setAdapter(adapter1)
        val adapter2: ArrayAdapter<Stop> = ArrayAdapter(view.context, android.R.layout.simple_dropdown_item_1line, Datasource().getStops().sortedWith(compareBy { it.name }))
        to.setAdapter(adapter2)

        createCards(this.view)

        actv_from.setOnClickListener {
            //from.setAdapter(ArrayAdapter(view.context, android.R.layout.simple_dropdown_item_1line, Datasource().getCorrespondence(to.text.toString()) as MutableList<Stop>))
            from.showDropDown()
        }

        actv_to.setOnClickListener {
            //to.setAdapter(ArrayAdapter(view.context, android.R.layout.simple_dropdown_item_1line, Datasource().getCorrespondence(to.text.toString()) as MutableList<Stop>))
            to.showDropDown()
        }

        swapStops.setOnClickListener {
            val temp = from.text
            from.text = to.text
            to.text = temp
        }

        search.setOnClickListener{
            if (from.editableText.toString() != "" && to.editableText.toString() != "")
                swapFrags(SearchFragment(from.editableText.toString(), to.editableText.toString(), Functions().getOptions(from.editableText.toString(), to.editableText.toString())))
        }
    }

    private fun createCards(view: View?){
        val rv = view?.findViewById<RecyclerView>(R.id.home_recyclerview)
        val emptymsg = view?.findViewById<TextView>(R.id.home_emptymsg)
        emptymsg?.visibility = View.INVISIBLE
        var cards: MutableList<CardModel> = mutableListOf<CardModel>()

        for (fav in Datasource().getFavorite())
            cards.add(CardModel("", fav[0], fav[1], "", 0))

        if (rv != null) {
            rv.layoutManager = LinearLayoutManager(view?.context)
            rv?.adapter = RouteCardAdapter(view.context, cards as ArrayList<CardModel>, 2)
        }
        if (cards.size == 0){
            emptymsg?.text = resources.getString(R.string.no_fav_message)
            emptymsg?.visibility = View.VISIBLE
        }

    }

    fun openFavRoute(origin: String, destination: String, view: View){
            val ctx: AppCompatActivity = view?.context as AppCompatActivity
            val f : Fragment = SearchFragment(origin, destination, Functions().getOptions(origin, destination))
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
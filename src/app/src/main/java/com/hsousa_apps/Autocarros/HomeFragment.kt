package com.hsousa_apps.Autocarros

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.data.Functions
import com.hsousa_apps.Autocarros.data.Stop


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

        val adapter1: ArrayAdapter<Stop> = ArrayAdapter(view.context, android.R.layout.simple_dropdown_item_1line, Datasource().getStops())
        from.setAdapter(adapter1)
        val adapter2: ArrayAdapter<Stop> = ArrayAdapter(view.context, android.R.layout.simple_dropdown_item_1line, Datasource().getStops())
        to.setAdapter(adapter2)

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
            swapFrags(SearchFragment(from.editableText.toString(), to.editableText.toString(), Functions().getOptions(from.editableText.toString(), to.editableText.toString())))
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
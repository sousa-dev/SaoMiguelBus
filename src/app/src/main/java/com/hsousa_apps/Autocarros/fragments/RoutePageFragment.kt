package com.hsousa_apps.Autocarros.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.Route
import org.w3c.dom.Text

class RoutePageFragment(private val id: String? = null, private val origin: String? = null, private val destination: String? = null, private val time: String? = null) : Fragment(), View.OnClickListener {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.route_page, container, false);
    }


    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val orig = view?.findViewById<TextView>(R.id.route_page_origin)
        val dest = view?.findViewById<TextView>(R.id.route_page_destination)
        val route_id = view?.findViewById<TextView>(R.id.route_page_id)

        orig.text = origin
        dest.text = destination
        route_id.text = id

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
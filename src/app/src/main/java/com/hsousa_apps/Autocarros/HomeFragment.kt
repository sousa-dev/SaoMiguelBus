package com.hsousa_apps.Autocarros

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.SearchView
import androidx.fragment.app.Fragment


class HomeFragment : Fragment(), View.OnClickListener {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.home, container, false);
    }


    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        /*
        val bttnStores = view.findViewById<Button>(com.example.ezshop.R.id.bttnStores)
        bttnStores.setOnClickListener(this)

        val bttnCat = view.findViewById<Button>(R.id.bttnProds)
        bttnCat.setOnClickListener(this)


        var sv = view.findViewById<SearchView>(R.id.from_search)
        sv.setOnClickListener(this)

        sv.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?): Boolean {
                //swapFrags(ProductListFragment(query=query))
                return true
            }

            override fun onQueryTextChange(newText: String?): Boolean {
                return false
            }
        })*/
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
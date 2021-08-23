package com.hsousa_apps.Autocarros.fragments

import android.content.Context
import android.os.Bundle
import android.text.Editable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.ImageView
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.google.gson.Gson
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.data.Stop

class SettingsFragment: Fragment(), View.OnClickListener {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.settings, container, false);
    }


    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val language: AutoCompleteTextView = view.findViewById(R.id.language)
        val actv_language: ImageView = view.findViewById(R.id.actv_language)
        val flag: ImageView = view.findViewById(R.id.flag)

        language.setText(Datasource().getCurrentLang())

        when (Datasource().getCurrentLang()){
            "Português" -> flag.setImageResource(R.drawable.portugal)
            "English" -> flag.setImageResource(R.drawable.english)
            "Deutsch" -> flag.setImageResource(R.drawable.germany)

        }

        //TODO: set language text to current selected language

        language.threshold = 2

        val adapter: ArrayAdapter<String> = ArrayAdapter(view.context, android.R.layout.simple_dropdown_item_1line, arrayListOf("Português", "English", "Deutsch"))
        language.setAdapter(adapter)

        actv_language.setOnClickListener {
            language.showDropDown()
        }
        language.setOnItemClickListener { _, _, position, _ ->
            val pref = requireActivity().getPreferences(Context.MODE_PRIVATE)
            val editor = pref.edit()
            var str = ""

            if (position == 0){
                flag.setImageResource(R.drawable.portugal)
                str = "Português"
            }
            else if (position == 1){
                flag.setImageResource(R.drawable.english)
                str = "English"
            }

            else{
                flag.setImageResource(R.drawable.germany)
                str = "Deutsch"
            }

            editor.putString("lang", str)
            editor.commit()
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
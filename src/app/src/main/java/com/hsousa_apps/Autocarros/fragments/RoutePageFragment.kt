package com.hsousa_apps.Autocarros.fragments

import android.content.Context
import android.content.DialogInterface
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.gson.Gson
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.data.TypeOfDay
import com.hsousa_apps.Autocarros.models.*
import java.util.ArrayList

class RoutePageFragment(private val id: String? = null, private val origin: String? = null, private val destination: String? = null, private val time: String? = null, private val op: Int? = 0, private val typeOfDay: TypeOfDay = com.hsousa_apps.Autocarros.data.TypeOfDay.WEEKDAY, private val info: String = "", private val unique_id: String = "") : Fragment(), View.OnClickListener {
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
        val routeId = view?.findViewById<TextView>(R.id.route_page_id)

        orig.text = origin
        dest.text = destination
        routeId.text = id
        routeId.tag = unique_id


        if (op == 0){
            createStops(this.view)
        }
        else {
            val day = view?.findViewById<TextView>(R.id.route_day)

            var type = when (typeOfDay) {
                TypeOfDay.WEEKDAY -> resources.getString(R.string.weekdays)
                TypeOfDay.SATURDAY -> resources.getString(R.string.saturday)
                TypeOfDay.SUNDAY -> resources.getString(R.string.sunday_only)
            }

            day.text = type

            createStops(this.view, 2)
        }

        val fav = view?.findViewById<ImageButton>(R.id.favorite)

        if (listOf(origin, destination) in Datasource().getFavorite()){
            fav.setImageResource(R.mipmap.hearton)
            fav.tag = R.mipmap.hearton
        }
        var ret: String? = info
        if (ret != ""){
            val info = view?.findViewById<TextView>(R.id.obs)
            info.text = ret.toString()
            info.visibility = View.VISIBLE
        }

        if (op == 1) fav.visibility = View.INVISIBLE
        fav.setOnClickListener {
            if (fav.tag == R.mipmap.hearton){
                fav.setImageResource(R.mipmap.heartoff)
                fav.tag = R.mipmap.heartoff
                Datasource().removeFavorite(listOf(origin, destination) as List<String>)
                Toast.makeText(context, resources.getString(R.string.remove_fav_toast_message), Toast.LENGTH_SHORT).show()
            }
            else{
                fav.setImageResource(R.mipmap.hearton)
                fav.tag = R.mipmap.hearton
                Datasource().addFavorite(origin, destination)
                Toast.makeText(context, resources.getString(R.string.add_fav_toast_message), Toast.LENGTH_SHORT).show()
            }
            val pref = requireActivity().getPreferences(Context.MODE_PRIVATE)
            val editor = pref.edit()
            val gson = Gson()

            val json: String = gson.toJson(Datasource().getFavorite())

            editor.putString("favorites", json)
            editor.commit()

        }

    }

    private fun createStops(view: View?, op: Int? = 1) {
        val rv = view?.findViewById<RecyclerView>(R.id.routepage_rv)
        var times: MutableList<StopModel> = mutableListOf()

        if (op == 2) {
            val allTimes = Datasource().getAllTimes(unique_id, origin, destination, typeOfDay)

            if (allTimes != null) {
                if (allTimes.isEmpty())
                    handleError(id.toString())
                else {
                    for (stop in allTimes) {
                        var str = ""
                        var count = 0
                        for (value in stop.value)
                            if (value != "---"){
                                if ((count%4 == 0) and (count != 0)) str += "\n"
                                str = String.format("%s%5s   ", str, value)
                                count += 1
                            }
                        times.add(StopModel(stop.key.toString(), str))
                    }
                }
            }

        } else {
            val allStops = Datasource().getAllStopTimes(unique_id, time, origin, destination, typeOfDay)
            if ("ERROR" in allStops) {
                handleError(id.toString())
            } else {
                for (stop in allStops)
                    if (stop.value != "---") times.add(StopModel(stop.key, stop.value, (stop.key == origin) || (stop.key == destination)))
            }
        }

        if (rv != null) {
            rv.layoutManager = LinearLayoutManager(view?.context)
            rv?.adapter = StopTimesAdapter(view.context, times as ArrayList<StopModel>)
        }

        view?.findViewById<TextView>(R.id.wrong)?.setOnClickListener {
            var dialog = Dialog(getString(R.string.page_dialog_title) + "$id?", getString(R.string.page_dialog_message), getString(R.string.route_dialog_positive), DialogInterface.OnClickListener { dialog, which ->
                val intent = Intent(
                    Intent.ACTION_SENDTO, Uri.fromParts(
                        "mailto", "sousadev@yahoo.com", null
                    )
                )
                intent.putExtra(Intent.EXTRA_SUBJECT, "São Miguel Bus: Route $id")
                startActivity(Intent.createChooser(intent, "Choose an Email client:"))
            }, getString(R.string.route_dialog_negative));
            dialog.isCancelable = false
            dialog.show(parentFragmentManager, "Route error")
        }
    }

    private fun handleError(info: String = "") {
        var dialog = Dialog(getString(R.string.route_dialog_title) + info, getString(R.string.route_dialog_message), getString(R.string.route_dialog_positive), DialogInterface.OnClickListener { dialog, which ->
            val intent = Intent(
                Intent.ACTION_SENDTO, Uri.fromParts(
                    "mailto", "sousadev@yahoo.com", null
                )
            )
            intent.putExtra(Intent.EXTRA_SUBJECT, "São Miguel Bus: Route $id")
            startActivity(Intent.createChooser(intent, "Choose an Email client:"))
        }, getString(R.string.route_dialog_negative));
        dialog.isCancelable = false
        dialog.show(parentFragmentManager, "Route error")
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
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
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.android.volley.Request
import com.android.volley.RequestQueue
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import com.bumptech.glide.Glide
import com.google.android.gms.ads.AdView
import com.google.gson.Gson
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.data.Functions
import com.hsousa_apps.Autocarros.data.Stop
import com.hsousa_apps.Autocarros.models.CardModel
import com.hsousa_apps.Autocarros.models.Dialog
import com.hsousa_apps.Autocarros.models.RouteCardAdapter
import org.json.JSONObject

private var vieww: View? = null

class HomeFragment : Fragment(), View.OnClickListener {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.home, container, false);
    }


    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        checkForHomeAd(view)

        val from: AutoCompleteTextView = view.findViewById(R.id.from_home)
        val to: AutoCompleteTextView = view.findViewById(R.id.to_home)
        val actv_from: ImageView = view.findViewById(R.id.actv1)
        val actv_to: ImageView = view.findViewById(R.id.actv2)
        setVieww(view)

        val search: Button = view.findViewById(R.id.homeSearch)
        val swapStops: ImageButton = view.findViewById(R.id.swapStopsMap)

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
            {
                var origin = ""
                for (word in from.editableText.toString().split(' ')) {
                    if (word != "" && word != " "){
                        origin += if (word.toLowerCase() != "do" && word.toLowerCase() != "da" && word.toLowerCase() != "de" && word.toLowerCase() != "dos" && word.toLowerCase() != "das") {
                            " " + word.capitalize()
                        } else {
                            " " + word.toLowerCase()
                        }
                    }
                }
                origin = origin.trim()
                var destination = ""
                for (word in to.editableText.toString().split(' ')){
                    if (word != "" && word != " "){
                        destination += if (word.toLowerCase() != "do" && word.toLowerCase()  != "da" && word.toLowerCase()  != "de" && word.toLowerCase() != "dos" && word.toLowerCase() != "das"){
                            " " + word.capitalize()
                        } else {
                            " " + word.toLowerCase()
                        }
                    }

                }
                destination = destination.trim()
                swapFrags(SearchFragment(origin, destination, Functions().getOptions(origin, destination)))
            }

            else
                Toast.makeText(context, resources.getString(R.string.toast_search_message), Toast.LENGTH_SHORT).show()
        }

        saveFav()

        view?.findViewById<TextView>(R.id.test_the_map)?.setOnClickListener {
           swapFrags(MapFragment())
        }
        view?.findViewById<TextView>(R.id.warning)?.setOnClickListener {
            var dialog = Dialog(getString(R.string.warning_dialog_title), getString(R.string.warning_dialog_message), "OK", DialogInterface.OnClickListener { dialog, which ->
            });
            dialog.isCancelable = false
            dialog.show(parentFragmentManager, "App Info Warning")
        }
    }

    private fun checkForHomeAd(view: View, on: String = "home"){
        var URL = "https://api.saomiguelbus.com/api/v1/ad?on=$on&platform=android"
        val requestQueue: RequestQueue = Volley.newRequestQueue(view.context)
        val objectRequest: JsonObjectRequest = JsonObjectRequest(
            Request.Method.GET,
            URL,
            null,
            { response ->
                //TODO: Deal with blank response
                Log.d("RESPONSE", "Response: $response")
                loadPersonalizedAd(response, view)
            },
            { error ->
                Log.d("ERROR", "Failed Response: $error")
                val gAd_banner = requireActivity().findViewById<AdView>(R.id.adView)
                gAd_banner.visibility = View.VISIBLE

                val customAd_banner = requireActivity().findViewById<ImageButton>(R.id.customAd)
                customAd_banner.visibility = View.INVISIBLE
            }
        )
        requestQueue.add(objectRequest)
    }

    private fun loadPersonalizedAd(response: JSONObject, view: View){

        val gAd_banner = requireActivity().findViewById<AdView>(R.id.adView)
        gAd_banner.visibility = View.INVISIBLE
        val customAd_banner = requireActivity().findViewById<ImageButton>(R.id.customAd)


        var media_url = response.getString("media")
        var action = response.getString("action")
        var target = response.getString("target")


        if (media_url != ""){
            Glide.with(view.context)
                .load(media_url)
                .into(customAd_banner)
        }

        customAd_banner.setOnClickListener {
            if (action != null && target != null) {
                when (action) {
                    "open" -> {
                        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(target))
                        startActivity(browserIntent)
                    }

                    "directions" -> {
                        val gmmIntentUri = Uri.parse("google.navigation:q=$target&mode=transit")
                        val mapIntent = Intent(Intent.ACTION_VIEW, gmmIntentUri)
                        startActivity(mapIntent)
                    }

                    "call" -> {
                        val intent = Intent(Intent.ACTION_DIAL)
                        intent.data = Uri.parse("tel:$target")
                        startActivity(intent)
                    }

                    "sms" -> {
                        val intent = Intent(Intent.ACTION_SENDTO)
                        intent.data = Uri.parse("smsto:$target")
                        startActivity(intent)
                    }

                    "email" -> {
                        val intent = Intent(Intent.ACTION_SENDTO)
                        intent.data = Uri.parse("mailto:$target")
                        startActivity(intent)
                    }

                    "whatsapp" -> {//TODO: Test this one
                        val intent = Intent(Intent.ACTION_SENDTO)
                        intent.data = Uri.parse("https://wa.me/$target")
                        startActivity(intent)
                    }

                    "share" -> { //TODO: Test this one
                        val sendIntent: Intent = Intent().apply {
                            action = Intent.ACTION_SEND
                            putExtra(Intent.EXTRA_TEXT, target)
                            type = "text/plain"
                        }

                        val shareIntent = Intent.createChooser(sendIntent, null)
                        startActivity(shareIntent)
                    }
                }
            } else {
                //TODO: Add a general action that points to my website explaining how to advertise on the app
                Log.d("TODO", "Add a general action that points to my website explaining how to advertise on the app")
            }
        }


        customAd_banner.visibility = View.VISIBLE



        Log.d("DEBUG", "Loaded Personalized Ad")

    }

    private fun saveFav(){
        val pref = requireActivity().getPreferences(Context.MODE_PRIVATE)
        val editor = pref.edit()
        val gson = Gson()

        val json: String = gson.toJson(Datasource().getFavorite())

        editor.putString("favorites", json)
        editor.commit()
    }

    private fun createCards(view: View?){
        val rv = view?.findViewById<RecyclerView>(R.id.home_recyclerview)
        val emptymsg = view?.findViewById<TextView>(R.id.home_emptymsg)
        emptymsg?.visibility = View.INVISIBLE
        var cards: MutableList<CardModel> = mutableListOf<CardModel>()

        for (fav in Datasource().getFavorite())
            cards.add(CardModel("", fav[0], fav[1], "", 0, delete = true))

        if (rv != null) {
            rv.layoutManager = LinearLayoutManager(view?.context)
            var adapter = RouteCardAdapter(view.context, cards as ArrayList<CardModel>, 2)
            rv?.adapter = adapter
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

    private fun setVieww(view: View){
        vieww = view
    }
    fun getVieww(): View? {
        return vieww
    }

    fun notifyDataChange(view: View){

        var RV = view.findViewById<RecyclerView>(R.id.home_recyclerview)
        var emptymsg = view.findViewById<TextView>(R.id.home_emptymsg)
        var cards: MutableList<CardModel> = mutableListOf<CardModel>()

        for (fav in Datasource().getFavorite())
            cards.add(CardModel("", fav[0], fav[1], "", 0, delete = true))

        if (cards.isEmpty())
            emptymsg.visibility = View.VISIBLE
        else
            emptymsg.visibility = View.INVISIBLE

        var adapter = RouteCardAdapter(view.context, cards as ArrayList<CardModel>, 2)
        RV.adapter = adapter
        adapter.notifyDataSetChanged()
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
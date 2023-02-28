package com.hsousa_apps.Autocarros

import android.content.DialogInterface
import android.content.SharedPreferences
import org.osmdroid.config.Configuration.*
import android.os.Bundle
import android.preference.PreferenceManager
import android.util.Log
import android.view.View
import android.widget.ProgressBar
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.constraintlayout.widget.Group
import androidx.fragment.app.Fragment
import com.android.volley.Request
import com.android.volley.RequestQueue
import com.android.volley.toolbox.JsonArrayRequest
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.StringRequest
import com.android.volley.toolbox.Volley
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.MobileAds
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.reflect.TypeToken
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.data.Functions
import com.hsousa_apps.Autocarros.fragments.*
import com.hsousa_apps.Autocarros.models.Dialog
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.util.*
import kotlin.reflect.typeOf


class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
        val URL = "https://api.saomiguelbus.com/api/v1/android/load"
        loadData()
        super.onCreate(savedInstanceState)
        try { this.supportActionBar!!.hide() } catch (e: NullPointerException) { }
        setContentView(R.layout.main)

        Datasource().changeCurrentLang(Locale.getDefault().language)

        /** Fetch routes from API **/
        val progressBar: ConstraintLayout = findViewById(R.id.loadingGroup)
        val requestQueue: RequestQueue = Volley.newRequestQueue(this)
        val objectRequest: JsonArrayRequest = JsonArrayRequest(
            Request.Method.GET,
            URL,
            null,
            { response ->
                try {
                    progressBar.visibility = View.VISIBLE
                    Datasource().loadStopsFromAPI()
                    for(i in 0 until response.length()){
                        val JSONobject: JSONObject? = response.getJSONObject(i)
                        if (JSONobject != null) {
                            val id: Int = JSONobject.get("id") as Int
                            val route: String = JSONobject.get("route") as String
                            val stops: JSONArray = JSONobject.get("stops") as JSONArray
                            val times: JSONArray = JSONobject.get("times") as JSONArray
                            val type_of_day: String = JSONobject.get("weekday") as String
                            val information: String = JSONobject.get("information") as String

                            Datasource().loadFromAPI(id, route, stops, times, type_of_day, information);

                        }
                    }

                    if (Locale.getDefault().language != "pt"){
                        Functions().translateStops(Locale.getDefault().language)
                    }

                    progressBar.visibility = View.GONE

                    swapFrags(HomeFragment())
                }catch (e: JSONException){
                    Log.d("ERROR", "JSONException: $e")
                    Datasource().load()

                    if (Locale.getDefault().language != "pt"){
                        Functions().translateStops(Locale.getDefault().language)
                    }

                    progressBar.visibility = View.GONE


                    val builder = AlertDialog.Builder(this)
                    builder.setTitle(getString(R.string.failed_response_title))
                    builder.setMessage(getString(R.string.failed_response_desc))

                    builder.setPositiveButton(android.R.string.yes) { dialog, which ->
                    }

                    builder.show()

                    swapFrags(HomeFragment())
                }


            },
            { error ->
                Log.d("ERROR", "Failed Response: $error")
                Datasource().load()

                if (Locale.getDefault().language != "pt"){
                    Functions().translateStops(Locale.getDefault().language)
                }

                progressBar.visibility = View.GONE


                val builder = AlertDialog.Builder(this)
                builder.setTitle(getString(R.string.failed_response_title))
                builder.setMessage(getString(R.string.failed_response_desc))

                builder.setPositiveButton(android.R.string.yes) { dialog, which ->
                }

                builder.show()

                swapFrags(HomeFragment())
            }
        )
        if (!Datasource().getLoaded()) requestQueue.add(objectRequest)

        /** Send Stats to API **/
        var URL_load= "https://saomiguelbus-api.herokuapp.com/api/v1/stat?request=android_load&origin=NA&destination=NA&time=NA&language=${Locale.getDefault().language}&platform=android&day=NA"
        var request: StringRequest = StringRequest(Request.Method.POST, URL_load, { response -> (Log.d("DEBUG", "Response: $response")) }, { error -> (Log.d("DEBUG", "Error Response: $error")) })
        requestQueue.add(request)
        /***********************/

        val randomInt: Int = (0..10).random()
        if (randomInt == 7){
            val builder = AlertDialog.Builder(this)
            builder.setTitle(getString(R.string.warning_dialog_title))
            builder.setMessage(getString(R.string.warning_dialog_message))

            builder.setPositiveButton(android.R.string.yes) { dialog, which ->
            }

            builder.show()
        }


        getInstance().load(this, PreferenceManager.getDefaultSharedPreferences(this));

        Datasource().loaded()

        MobileAds.initialize(this) {}

        val mAdView = findViewById<AdView>(R.id.adView)
        val adRequest = AdRequest.Builder().build()
        mAdView.loadAd(adRequest)

        val bn = findViewById<BottomNavigationView>(R.id.bottom_navigation)!!
        var target : Fragment

        bn.setOnNavigationItemSelectedListener { item ->
            target = HomeFragment()
            when (item.itemId) {

                R.id.home_nb -> {
                    target = HomeFragment()
                }

                R.id.search_nb -> {
                    target = FindFragment(Datasource().getFindRoutes())
                }

                R.id.map_nb -> {
                    target = MapFragment()
                }

                R.id.settings_nb -> {
                    target = SettingsFragment()
                }

                else -> print("")
            }

            swapFrags(target)

            true
        }

    }

    fun saveData(op: String){
        val sp = getSharedPreferences("userData", MODE_PRIVATE)
        val editor = sp.edit()
        val gson = Gson()

        if (op == "fav"){
            val json: String = gson.toJson(Datasource().getFavorite())

            editor.putString("favorites", json)
            editor.commit()
        }
        else if (op == "lang"){

        }

    }

    private fun loadData(){
        val sp: SharedPreferences = getPreferences(MODE_PRIVATE)
        val gson = Gson()
        val json: String? = sp.getString("favorites", null)
        val type = object : TypeToken<MutableList<List<String>>>() {}.type

        if (json != null) Datasource().loadFavorite(gson.fromJson(json, type))

        //val lang: String? = sp.getString("lang", "pt")

        /*if (lang != null) {
            Datasource().changeCurrentLang(lang)
        }*/

    }

    private fun swapFrags(f : Fragment) {
        val t = supportFragmentManager.beginTransaction()
        t.replace(R.id.frag_container, f)
        t.addToBackStack(null)
        t.commit()
    }

    override fun onBackPressed() {
        if ((supportFragmentManager.backStackEntryCount > 1) || (supportFragmentManager.findFragmentById(R.id.frag_container)  !is HomeFragment)) {
            supportFragmentManager.popBackStack()
        }
        else {
            finish()
        }
    }
}
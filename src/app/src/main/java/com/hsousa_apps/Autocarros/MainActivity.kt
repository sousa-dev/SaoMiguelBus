package com.hsousa_apps.Autocarros

import android.app.VoiceInteractor
import android.content.SharedPreferences
import org.osmdroid.config.Configuration.*
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.preference.PreferenceManager
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.app.ActivityCompat
import androidx.fragment.app.Fragment
import com.android.volley.Request
import com.android.volley.RequestQueue
import com.android.volley.Response
import com.android.volley.toolbox.JsonArrayRequest
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.MobileAds
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.data.Functions
import com.hsousa_apps.Autocarros.fragments.*
import java.util.*


class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
        val URL = "https://saomiguelbus-api.herokuapp.com/api/v1/android/load"
        loadData()
        super.onCreate(savedInstanceState)
        try { this.supportActionBar!!.hide() } catch (e: NullPointerException) { }
        setContentView(R.layout.main)

        Datasource().changeCurrentLang(Locale.getDefault().language)

        /** Fetch routes from API **/
        val requestQueue: RequestQueue = Volley.newRequestQueue(this)
        val objectRequest: JsonArrayRequest = JsonArrayRequest(
            Request.Method.GET,
            URL,
            null,
            Response.Listener { response ->
                Log.d("RESPONSE", response.toString())
                /**TODO: populate static files with response routes**/
            },
            Response.ErrorListener { error ->
                Log.d("FAILED RESPONSE", error.toString())
                if (!Datasource().getLoaded()) Datasource().load()
            }
        )
        requestQueue.add(objectRequest)

        if (Locale.getDefault().language != "pt"){
            Functions().translateStops(Locale.getDefault().language)
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
                    target = FindFragment(Datasource().getAllRoutes())
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

        swapFrags(HomeFragment())
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
package com.hsousa_apps.Autocarros

import android.content.SharedPreferences
import android.content.SharedPreferences.Editor
import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.fragment.app.Fragment
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.MobileAds
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.data.Functions
import com.hsousa_apps.Autocarros.data.Language
import com.hsousa_apps.Autocarros.data.Route
import com.hsousa_apps.Autocarros.fragments.FindFragment
import com.hsousa_apps.Autocarros.fragments.HomeFragment
import com.hsousa_apps.Autocarros.fragments.SearchFragment
import com.hsousa_apps.Autocarros.fragments.SettingsFragment
import java.io.Console
import java.lang.reflect.Type
import java.util.*


class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
        loadData()
        super.onCreate(savedInstanceState)
        try { this.supportActionBar!!.hide() } catch (e: NullPointerException) { }
        setContentView(R.layout.main)

        Datasource().changeCurrentLang(Locale.getDefault().language)
        if (!Datasource().getLoaded()) Datasource().load()

        if (Locale.getDefault().language != "pt"){
            Functions().translateStops(Locale.getDefault().language)
        }

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
                    target = SearchFragment("null", "null", arrayListOf())
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
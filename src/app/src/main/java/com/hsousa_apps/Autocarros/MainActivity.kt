package com.hsousa_apps.Autocarros

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.hsousa_apps.Autocarros.data.Datasource
import com.hsousa_apps.Autocarros.fragments.FindFragment
import com.hsousa_apps.Autocarros.fragments.HomeFragment
import com.hsousa_apps.Autocarros.fragments.SearchFragment
import com.hsousa_apps.Autocarros.fragments.SettingsFragment

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try { this.supportActionBar!!.hide() } catch (e: NullPointerException) { }
        setContentView(R.layout.main)

        Datasource().load()

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
package com.hsousa_apps.Autocarros.fragments

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.MobileAds
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.data.Datasource


class SettingsFragment: Fragment(), View.OnClickListener {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.settings, container, false);
    }


    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        MobileAds.initialize(this.context) {}

        val mAdView = view.findViewById<AdView>(R.id.settingsAd)
        val adRequest = AdRequest.Builder().build()
        mAdView.loadAd(adRequest)

        val language: AutoCompleteTextView = view.findViewById(R.id.language)
        val actv_language: ImageView = view.findViewById(R.id.actv_language)
        val flag: ImageView = view.findViewById(R.id.flag)

        val rate: Button = view.findViewById(R.id.rate)
        val patreon: Button = view.findViewById(R.id.patreon)
        val paypal: Button = view.findViewById(R.id.paypal)
        val mail: Button = view.findViewById(R.id.mail)

        rate.setOnClickListener {
            Toast.makeText(context, resources.getString(R.string.toast_link_message), Toast.LENGTH_SHORT).show()

            val appPackageName: String? = activity?.packageName

            try {
                startActivity(
                    Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("market://details?id=$appPackageName")
                    )
                )
            } catch (anfe: ActivityNotFoundException) {
                startActivity(
                    Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("https://play.google.com/store/apps/details?id=$appPackageName")
                    )
                )
            }
        }

        patreon.setOnClickListener {
            Toast.makeText(context, resources.getString(R.string.toast_link_message), Toast.LENGTH_SHORT).show()

            try {
                startActivity(
                    Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("https://www.patreon.com/sousadev")
                    )
                )
            } catch (anfe: ActivityNotFoundException) {
                startActivity(
                    Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("https://www.patreon.com/sousadev")
                    )
                )
            }
        }

        paypal.setOnClickListener {
            Toast.makeText(context, resources.getString(R.string.toast_link_message), Toast.LENGTH_SHORT).show()

            try {
                startActivity(
                    Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("https://paypal.me/Wiky")
                    )
                )
            } catch (anfe: ActivityNotFoundException) {
                startActivity(
                    Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("https://paypal.me/Wiky")
                    )
                )
            }
        }

        mail.setOnClickListener {
            val intent = Intent(
                Intent.ACTION_SENDTO, Uri.fromParts(
                    "mailto", "sousadev@yahoo.com", null
                )
            )
            intent.putExtra(Intent.EXTRA_SUBJECT, "São Miguel Bus: [Problem]")
            startActivity(Intent.createChooser(intent, "Choose an Email client:"))
        }


        language.setText(Datasource().getCurrentLang())

        when (Datasource().getCurrentLang()){
            "Português" -> flag.setImageResource(R.drawable.portugal)
            "English" -> flag.setImageResource(R.drawable.english)
            "Deutsch" -> flag.setImageResource(R.drawable.germany)

        }

        language.threshold = 2

        val adapter: ArrayAdapter<String> = ArrayAdapter(view.context, android.R.layout.simple_dropdown_item_1line, arrayListOf("Português", "English", "Deutsch"))
        language.setAdapter(adapter)

        actv_language.setOnClickListener {
            language.showDropDown()
        }
        language.setOnClickListener {
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

            Datasource().changeCurrentLang(str)
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
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

        val rate: Button = view.findViewById(R.id.rate)
        val patreon: Button = view.findViewById(R.id.patreon)
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
                        Uri.parse("https://linktr.ee/sousadev_")
                    )
                )
            } catch (anfe: ActivityNotFoundException) {
                startActivity(
                    Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("https://linktr.ee/sousadev_")
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
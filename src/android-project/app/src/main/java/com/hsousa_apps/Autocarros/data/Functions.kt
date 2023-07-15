package com.hsousa_apps.Autocarros.data

import android.content.Intent
import android.net.Uri
import android.util.Log
import android.view.View
import android.widget.ImageButton
import androidx.fragment.app.FragmentActivity
import com.android.volley.Request
import com.android.volley.RequestQueue
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import com.bumptech.glide.Glide
import com.google.android.gms.ads.AdView
import com.hsousa_apps.Autocarros.R
import org.json.JSONObject
import android.widget.*
import com.android.volley.toolbox.StringRequest


class Functions {

    fun checkForCustomAd(view: View, mainActivity: FragmentActivity, on: String = "home"){
        var URL = "https://api.saomiguelbus.com/api/v1/ad?on=$on&platform=android"
        val requestQueue: RequestQueue = Volley.newRequestQueue(view.context)
        val objectRequest: JsonObjectRequest = JsonObjectRequest(
            Request.Method.GET,
            URL,
            null,
            { response ->
                //TODO: Deal with blank response
                Log.d("RESPONSE", "Response: $response")
                loadPersonalizedAd(view, mainActivity, response)
            },
            { error ->
                Log.d("ERROR", "Failed Response: $error")
                val gAd_banner = mainActivity.findViewById<AdView>(R.id.adView)
                gAd_banner.visibility = View.VISIBLE

                val customAd_banner = mainActivity.findViewById<ImageButton>(R.id.customAd)
                customAd_banner.visibility = View.INVISIBLE
            }
        )
        requestQueue.add(objectRequest)
    }

    private fun loadPersonalizedAd(view: View, mainActivity: FragmentActivity, response: JSONObject){

        val gAd_banner = mainActivity.findViewById<AdView>(R.id.adView)
        gAd_banner.visibility = View.INVISIBLE
        val customAd_banner = mainActivity.findViewById<ImageButton>(R.id.customAd)


        var media_url = response.getString("media")


        if (media_url != ""){
            Glide.with(view.context)
                .load(media_url)
                .transition(com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions.withCrossFade(500))
                .placeholder(R.drawable.ad_loading)
                .into(customAd_banner)
        }

        customAd_banner.setOnClickListener {
            adOnClick(view, response)
        }

        customAd_banner.visibility = View.VISIBLE

        Log.d("DEBUG", "Loaded Personalized Ad")

    }

    private fun adOnClick(view: View, response: JSONObject){
        adClickIncrement(view, response.getString("id"))

        var entity = response.getString("entity")
        var action = response.getString("action")
        var target = response.getString("target")
        //TODO: Change this to the correct url
        var intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://saomiguelbus.com"))
        var toast_msg = view.context.getString(R.string.toast_link_message)
        if (action != null && target != null) {
            when (action) {
                "open" -> {
                    intent = Intent(Intent.ACTION_VIEW, Uri.parse(target))
                }

                "directions" -> {
                    val gmmIntentUri = Uri.parse("google.navigation:q=$target&mode=transit")
                    intent = Intent(Intent.ACTION_VIEW, gmmIntentUri)
                    toast_msg = "${view.context.getString(R.string.toast_directions_message)} '$entity'..."
                }

                "call" -> {
                    intent = Intent(Intent.ACTION_DIAL)
                    intent.data = Uri.parse("tel:$target")
                    toast_msg = "${view.context.getString(R.string.toast_calling_message)} '${entity}'..."
                }

                "sms" -> {
                    intent = Intent(Intent.ACTION_SENDTO)
                    intent.data = Uri.parse("smsto:$target")
                    toast_msg = "${view.context.getString(R.string.toast_send_message)} '${entity}'..."
                }

                "email" -> {
                    intent = Intent(Intent.ACTION_SENDTO)
                    intent.data = Uri.parse("mailto:$target")
                    toast_msg = "${view.context.getString(R.string.toast_email_message)} '${entity}'..."
                }

                "whatsapp" -> {
                    intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$target"))
                    toast_msg = "${view.context.getString(R.string.toast_send_message)} '${entity}'..."
                }

                else -> {Log.d("WARN", "Unknown action: $action") }
            }
        }
        view.context.startActivity(intent)
        Toast.makeText(view.context, toast_msg, Toast.LENGTH_SHORT).show()
    }

    private fun adClickIncrement(view: View, id: String){
        var URL = "https://saomiguelbus-api.herokuapp.com/api/v1/ad/click?id=$id"
        val requestQueue: RequestQueue = Volley.newRequestQueue(view.context)
        var request = StringRequest(Request.Method.POST, URL, { response -> (Log.d("DEBUG", "Response: $response")) }, { error -> (Log.d("DEBUG", "Error Response: $error")) })
        requestQueue.add(request)
    }

    fun getOptions(origin: String, destination: String, TypeOfDay: TypeOfDay = com.hsousa_apps.Autocarros.data.TypeOfDay.WEEKDAY): ArrayList<Route>{
        val ret: MutableList<Route> = mutableListOf()
        val originStop: Stop = Datasource().getStop(origin)
        val destinationStop: Stop = Datasource().getStop(destination)
        for (route in Datasource().getAllRoutes()){
            if(route.stops.containsKey(originStop) and route.stops.containsKey(destinationStop) and (route.getStopIdx(originStop) < route.getStopIdx(destinationStop)) and (route.day == TypeOfDay)){
                ret.add(route)
            }
        }
        return ret as ArrayList<Route>
    }

    fun getStopRoutes(stop: String): ArrayList<Route>{
        val ret: MutableList<Route> = mutableListOf()
        val getStop: Stop = Datasource().getStop(stop)
        for (route in Datasource().getFindRoutes())
           if (route.stops.containsKey(getStop)) ret.add(route)
        return ret as ArrayList<Route>
    }

    fun r318(lang: String): String {
        if (lang == "pt")
            return "a) De Segunda a Quinta // b) Só à Sexta"
        else if (lang == "de")
            return "a) Von Montag bis Donnerstag // b) Nur am Freitag"
        else if (lang == "fr")
            return "a) Du lundi au jeudi // b) Uniquement le vendredi"
        else if (lang == "es")
            return "a) De lunes a jueves // b) Solo viernes"
        return "a) From Monday to Thursday // b) Just Friday"
    }

    fun onlyTT(lang: String): String {
        if (lang == "pt")
            return "*Só Terças e Quintas"
        else if (lang == "de")
            return "*Nur Dienstag und Donnerstag"
        else if (lang == "fr")
            return "*Uniquement le mardi et le jeudi"
        else if (lang == "es")
            return "*Solo martes y jueves"
        return "*Only Tuesday and Thursday"
    }

    fun avDHenrique(lang: String): String {
        if (lang == "pt")
            return "Saída no lado Sul da Av. Infante D.Henrique"
        else if (lang == "de")
            return "Dieser Service beginnt in der Südseite der Av. Infante D. Henrique."
        else if (lang == "fr")
            return "Ce service commence dans le côté sud de l'Av. Infante D. Henrique."
        else if (lang == "es")
            return "Este servicio se inicia en el lado sur de la Av. Infante D. Henrique."
        return "This service starts in the South Side of Av. Infante D.Henrique."
    }
    fun tourismOffice(lang: String): String {
        if (lang == "pt")
            return "Saída junto ao Posto de Turismo"
        else if (lang == "de")
            return "Dieser Service beginnt neben dem Tourismusbüro."
        else if (lang == "fr")
            return "Ce service démarre à côté de l'Office de Tourisme."
        else if (lang == "es")
            return "Este servicio comienza junto a la Oficina de Turismo."
        return "This service starts next to the Tourism Office."
    }
    fun fsaobras(lang: String): String {
        if (lang == "pt")
            return "Saída no Forte de São Brás"
        else if (lang == "de")
            return "Dieser Service beginnt bei Forte de São Brás"
        else if (lang == "fr")
            return "Ce service commence à Forte de São Brás"
        else if (lang == "es")
            return "Este servicio comienza en Forte de São Brás"
        return "This service starts at Forte de São Brás"
    }

    fun justFriday(lang: String): String {
        if (lang == "pt")
            return "Só à Sexta-Feira"
        else if (lang == "de")
            return "Nur Freitag"
        else if (lang == "fr")
            return "Juste vendredi"
        else if (lang == "es")
            return "Solo viernes"
        return "Just Friday"
    }

    fun school(lang: String): String {
        if (lang == "pt")
            return "Período Escolar"
        else if (lang == "de")
            return "Schulzeit"
        else if (lang == "fr")
            return "Période Scolaire"
        else if (lang == "es")
            return "Periodo Escolar"
        return "School Period"
    }

    fun onlySchool(lang: String): String {
        if (lang == "pt")
            return "Só em período escolar"
        else if (lang == "de")
            return "Nur Schulzeit"
        else if (lang == "fr")
            return "Période scolaire uniquement"
        else if (lang == "es")
            return "Solo período escolar"
        return "Only School Period"
    }

    fun normal(lang: String): String {
        if (lang == "pt")
            return "Período Normal"
        else if (lang == "de")
            return "Normale Periode"
        else if (lang == "fr")
            return "Période normale"
        else if (lang == "es")
            return "Periodo normal"
        return "Normal Period"
    }

    fun julyToSep(lang: String): String {
        if (lang == "pt")
            return "De 15 de julho até 15 de setembro"
        else if (lang == "de")
            return "Vom 15. Juli bis 15. September"
        else if (lang == "fr")
            return "Du 15 juillet au 15 septembre"
        else if (lang == "es")
            return "Del 15 de julio al 15 de septiembre"
        return "From July 15th to September 15th"
    }

    fun translateStops(lang: String) {
        when (lang) {
            "en" -> {
                Datasource().getStop("Ajuda - Igreja").name = "Ajuda - Church"
                Datasource().getStop("Remédios - Igreja").name = "Remédios - Church"
                Datasource().getStop("Santo António - Igreja").name = "Santo António - Church"
                Datasource().getStop("São Vicente - Igreja").name = "São Vicente - Church"
                Datasource().getStop("Sete Cidades - Ponte").name = "Sete Cidades - Bridge"
                Datasource().getStop("Sete Cidades - Igreja").name = "Sete Cidades - Church"
                Datasource().getStop("Fenais da Luz - Igreja").name = "Fenais da Luz - Church"
                Datasource().getStop("Mosteiros - Igreja").name = "Mosteiros - Church"
                Datasource().getStop("Ginetes - Igreja").name = "Ginetes - Church"
                Datasource().getStop("Feteiras - Igreja").name = "Feteiras - Church"
                Datasource().getStop("Relva - Igreja").name = "Relva - Church"
                Datasource().getStop("Maia - Escola").name = "Maia - School"
                Datasource().getStop("Furnas - Águas Quentes").name = "Furnas - Hot Springs"
            }
            "de" -> {
                Datasource().getStop("Ajuda - Igreja").name = "Ajuda - Kirche"
                Datasource().getStop("Remédios - Igreja").name = "Remédios - Kirche"
                Datasource().getStop("Santo António - Igreja").name = "Santo António - Kirche"
                Datasource().getStop("São Vicente - Igreja").name = "São Vicente - Kirche"
                Datasource().getStop("Sete Cidades - Ponte").name = "Sete Cidades - Brücke"
                Datasource().getStop("Sete Cidades - Igreja").name = "Sete Cidades - Kirche"
                Datasource().getStop("Fenais da Luz - Igreja").name = "Fenais da Luz - Kirche"
                Datasource().getStop("Mosteiros - Igreja").name = "Mosteiros - Kirche"
                Datasource().getStop("Ginetes - Igreja").name = "Ginetes - Kirche"
                Datasource().getStop("Feteiras - Igreja").name = "Feteiras - Kirche"
                Datasource().getStop("Relva - Igreja").name = "Relva - Kirche"
                Datasource().getStop("Maia - Escola").name = "Maia - Schule"
                Datasource().getStop("Furnas - Águas Quentes").name = "Furnas - Heiße Quellen"
            }
            "fr" -> {
                Datasource().getStop("Ajuda - Igreja").name = "Ajuda - Église"
                Datasource().getStop("Remédios - Igreja").name = "Remédios - Église"
                Datasource().getStop("Santo António - Igreja").name = "Santo António - Église"
                Datasource().getStop("São Vicente - Igreja").name = "São Vicente - Église"
                Datasource().getStop("Sete Cidades - Ponte").name = "Sete Cidades - Pont"
                Datasource().getStop("Sete Cidades - Igreja").name = "Sete Cidades - Église"
                Datasource().getStop("Fenais da Luz - Igreja").name = "Fenais da Luz - Église"
                Datasource().getStop("Mosteiros - Igreja").name = "Mosteiros - Église"
                Datasource().getStop("Ginetes - Igreja").name = "Ginetes - Église"
                Datasource().getStop("Feteiras - Igreja").name = "Feteiras - Église"
                Datasource().getStop("Relva - Igreja").name = "Relva - Église"
                Datasource().getStop("Maia - Escola").name = "Maia - L'école"
                Datasource().getStop("Furnas - Águas Quentes").name = "Furnas - Sources Chaudes"
            }
            "es" -> {
                Datasource().getStop("Ajuda - Igreja").name = "Ajuda - Iglesia"
                Datasource().getStop("Remédios - Igreja").name = "Remédios - Iglesia"
                Datasource().getStop("Santo António - Igreja").name = "Santo António - Iglesia"
                Datasource().getStop("São Vicente - Igreja").name = "São Vicente - Iglesia"
                Datasource().getStop("Sete Cidades - Ponte").name = "Sete Cidades - Puente"
                Datasource().getStop("Sete Cidades - Igreja").name = "Sete Cidades - Iglesia"
                Datasource().getStop("Fenais da Luz - Igreja").name = "Fenais da Luz - Iglesia"
                Datasource().getStop("Mosteiros - Igreja").name = "Mosteiros - Iglesia"
                Datasource().getStop("Ginetes - Igreja").name = "Ginetes - Iglesia"
                Datasource().getStop("Feteiras - Igreja").name = "Feteiras - Iglesia"
                Datasource().getStop("Relva - Igreja").name = "Relva - Iglesia"
                Datasource().getStop("Maia - Escola").name = "Maia - Colegio"
                Datasource().getStop("Furnas - Águas Quentes").name = "Furnas - Aguas Termales"
            }
        }
    }

    fun removeFav(lang: String): String {
        if (lang == "pt")
            return "Rota Removida dos Favoritos!"
        else if (lang == "de")
            return "Route aus Favoriten entfernt!"
        else if (lang == "fr")
            return "Itinéraire supprimé des favoris!"
        else if (lang == "es")
            return "¡Ruta eliminada de favoritos!"
        return "Route Removed from Favorites!"
    }

    fun rossioBanif(lang: String): String? {
        if (lang == "pt")
            return "Passagem em 'Capelas - Rossio' junto ao Santander"
        else if (lang == "de")
            return "Bushaltestelle in 'Capelas - Rossio' bei Santander"
        else if (lang == "fr")
            return "Arrêt de bus à 'Capelas - Rossio' près de Santander"
        else if (lang == "es")
            return "Parada de autobús en 'Capelas - Rossio' cerca de Santander"
        return "Bus Stop in 'Capelas - Rossio' near Santander"
    }

    fun rossioCaixa(lang: String): String? {
        if (lang == "pt")
            return "Passagem em 'Capelas - Rossio' junto à escola"
        else if (lang == "de")
            return "Bushaltestelle in 'Capelas - Rossio' in der Nähe der Schule"
        else if (lang == "fr")
            return "Arrêt de bus à 'Capelas - Rossio' près de l'école"
        else if (lang == "es")
            return "Parada de autobús en 'Capelas - Rossio' cerca de la escuela"
        return "Bus Stop in 'Capelas - Rossio' near the School"
    }
}

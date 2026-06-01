package com.hsousa_apps.Autocarros.data

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import com.hsousa_apps.Autocarros.R
import com.hsousa_apps.Autocarros.fragments.HomeFragment
import java.lang.Exception

var allRoutes: ArrayList<Route> = arrayListOf()
var avmRoutes: ArrayList<Route> = arrayListOf()
var varelaRoutes: ArrayList<Route> = arrayListOf()
var crpRoutes: ArrayList<Route> = arrayListOf()
var stops: ArrayList<Stop> = arrayListOf()
var correspondence: MutableMap<Stop, MutableList<Stop>> = mutableMapOf()
var routeHash: HashMap<String, Route> = hashMapOf()

var favorite: MutableList<List<String>> = mutableListOf()
var currentLanguage: String = "pt"
var loaded: Boolean = false

class Datasource {

    fun load() {
        loadStops()

        loadAVM()
        allRoutes.addAll(avmRoutes)

        loadVARELA()
        allRoutes.addAll(varelaRoutes)

        loadCRP()
        allRoutes.addAll(crpRoutes)

        //setCorrespondence()
    }

    private fun loadStops() {
        /* AVM Routes */
        Stop("João Bom", Location(37.895577553977084, -25.787295651866142))
        Stop("Ajuda - Igreja", Location(37.89874231024076, -25.75499373056614))
        Stop("Ajuda - Ramal", Location(37.89783537154173, -25.756172272894258))
        Stop("Remédios", Location(37.88587538247784, -25.7383151882382))
        Stop("Remédios - Igreja", Location(37.88791418587119, -25.739511713371254))
        Stop("Santa Bárbara - Ramal", Location(37.87704319712277, -25.72452408638708))
        Stop("Santa Bárbara - Cavalo Branco", Location(37.875606, -25.725700))
        Stop("Santo António - Cruz", Location(37.86720085865056, -25.709795544059023))
        Stop("Santo António - Moagem", Location(37.859692180572246, -25.706757241085928))
        Stop("Santo António - Igreja", Location(37.859473349512314, -25.703178626215493))
        Stop("Teatro Novo", Location(37.82815142215653, -25.686025404301123))
        Stop("Grota do Morro", Location(37.8424858335519, -25.694985241942106))
        Stop("Capelas - Rossio", Location(37.83301338165615, -25.688487412566573))
        Stop("Capelas - Navio", Location(37.830411202830774, -25.675464756985647))
        Stop("São Vicente - Atafona", Location(37.819045476073924, -25.670334710367257))
        Stop("São Vicente - Igreja", Location(37.82022134054216, -25.66157813095841))
        Stop("Fenais da Luz - Bairro", Location(37.828469644934245, -25.646826006627105))
        Stop("Fenais da Luz - Igreja", Location(37.8278423178853, -25.641078638957627))
        Stop("Farropo", Location(37.82289890761316, -25.63396145123809))
        Stop("Batalha", Location(37.80532203070736, -25.638199510967528))
        Stop("Fajã de Cima", Location(37.77100215299734, -25.659067628717533))
        Stop("Ponta Delgada - Hospital", Location(37.75196550967875, -25.673909700128846))
        Stop("Ponta Delgada", Location(37.738344758623185, -25.669294137448684))
        Stop("Ponta Delgada - Ramalho", Location(0.0, 0.0))
        Stop("Av Principe Mónaco", Location(0.0, 0.0))
        Stop("Calhetas", Location(37.824127906252514, -25.616667428971603))
        Stop("Sete Cidades - Ponte", Location(37.85521769081564, -25.786546561254422))
        Stop("Sete Cidades - Igreja", Location(0.0, 0.0))
        Stop("Lomba do Vasco", Location(0.0, 0.0))
        Stop("Varzea", Location(37.86637544956329, -25.834110730566838))
        Stop("Mosteiros - Ramal", Location(37.87776007046853, -25.825109917074368))
        Stop("Mosteiros - Banda de Além", Location(0.0, 0.0))
        Stop("Mosteiros - Igreja", Location(0.0, 0.0))
        Stop("Ginetes - Igreja", Location(0.0, 0.0))
        Stop("Candelária - Socorro", Location(0.0, 0.0))
        Stop("Candelária - Centro", Location(0.0, 0.0))
        Stop("Feteiras - Biscoito", Location(0.0, 0.0))
        Stop("Feteiras - Igreja", Location(0.0, 0.0))
        Stop("Covoada - Encruzilhada", Location(0.0, 0.0))
        Stop("Relva - Igreja", Location(0.0, 0.0))
        Stop("Relva - Canto da Pia", Location(0.0, 0.0))
        Stop("Ramal Cruz", Location(0.0, 0.0))
        Stop("Ramal Ajuda", Location(0.0, 0.0))
        Stop("Canada da Cova", Location(0.0, 0.0))
        Stop("Ramal Cruz", Location(0.0, 0.0))

        /* Varela Routes */
        Stop("São Roque", Location(0.0, 0.0))
        Stop("Praia do Pópulo", Location(0.0, 0.0))
        Stop("Livramento", Location(0.0, 0.0))
        Stop("Lagoa", Location(0.0, 0.0))
        Stop("Cabouco", Location(0.0, 0.0))
        Stop("Remédios da Lagoa", Location(0.0, 0.0))
        Stop("Água de Pau", Location(0.0, 0.0))
        Stop("Ribeira Chã", Location(0.0, 0.0))
        Stop("Vila Franca", Location(0.0, 0.0))
        Stop("Furnas", Location(0.0, 0.0))
        Stop("Povoação", Location(0.0, 0.0))
        Stop("Covoada", Location(0.0, 0.0))
        Stop("Quartel", Location(0.0, 0.0))
        Stop("Bom Despacho", Location(0.0, 0.0))
        Stop("Arribanas", Location(0.0, 0.0))
        Stop("Milagres", Location(0.0, 0.0))
        Stop("Grotinha", Location(0.0, 0.0))
        Stop("Caminho da Levada", Location(0.0, 0.0))
        Stop("Fajã de Baixo", Location(0.0, 0.0))
        Stop("Laranjeiras", Location(0.0, 0.0))
        Stop("Belém", Location(0.0, 0.0))
        Stop("Santa Rita", Location(0.0, 0.0))
        Stop("Largo da Fonte", Location(0.0, 0.0))
        Stop("Ponta Garça", Location(0.0, 0.0))
        Stop("Caminho Novo", Location(0.0, 0.0))
        Stop("Ribeira das Tainhas", Location(0.0, 0.0))
        Stop("Ribeira Quente", Location(0.0, 0.0))
        Stop("Agua Retorta", Location(0.0, 0.0))
        Stop("Faial da Terra", Location(0.0, 0.0))
        Stop("Lomba do Alcaide", Location(0.0, 0.0))
        Stop("Lomba do Loução", Location(0.0, 0.0))
        Stop("Lomba do Botão", Location(0.0, 0.0))
        Stop("Lomba do Pomar", Location(0.0, 0.0))
        Stop("Lomba do Carro", Location(0.0, 0.0))

        /* CRP Routes */
        Stop("Moviarte", Location(0.0, 0.0))
        Stop("Caldeirão", Location(0.0, 0.0))
        Stop("Pico da Pedra", Location(0.0, 0.0))
        Stop("Rabo de Peixe", Location(0.0, 0.0))
        Stop("Ribeira Seca", Location(0.0, 0.0))
        Stop("Ribeira Grande", Location(0.0, 0.0))
        Stop("Ribeirinha", Location(0.0, 0.0))
        Stop("Porto Formoso", Location(0.0, 0.0))
        Stop("São Brás", Location(0.0, 0.0))
        Stop("Maia - Escola", Location(0.0, 0.0))
        Stop("Maia - Largo S.António", Location(0.0, 0.0))
        Stop("Gorreana", Location(0.0, 0.0))
        Stop("Lomba da Maia", Location(0.0, 0.0))
        Stop("Fenais da Ajuda", Location(0.0, 0.0))
        Stop("Lomba de S.Pedro", Location(0.0, 0.0))
        Stop("Salga", Location(0.0, 0.0))
        Stop("Lomba da Achadinha", Location(0.0, 0.0))
        Stop("Achada", Location(0.0, 0.0))
        Stop("Algarvia", Location(0.0, 0.0))
        Stop("Santo António Nordestinho", Location(0.0, 0.0))
        Stop("São Pedro Nordestinho", Location(0.0, 0.0))
        Stop("Lomba da Fazenda", Location(0.0, 0.0))
        Stop("Lomba da Cruz", Location(0.0, 0.0))
        Stop("Lomba da Pedreira", Location(0.0, 0.0))
        Stop("Vila do Nordeste", Location(0.0, 0.0))
        Stop("Gramas", Location(0.0, 0.0))
        Stop("Pico do Fogo", Location(0.0, 0.0))
        Stop("Santa Bárbara - Ribeira Grande", Location(0.0, 0.0))
        Stop("Furnas - Águas Quentes", Location(0.0, 0.0))
        Stop("Furnas - Caldeiras", Location(0.0, 0.0))


    }

    private fun loadAVM() {
        val img: Int = R.drawable.avm_logo
        /* Weekdays */
        /* Route 208 */
        var route = "208"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"i", mapOf(
                        getStop("Mosteiros - Ramal") to listOf("09h15", "16h45"),
                        getStop("João Bom") to listOf("09h25", "16h55"),
                        getStop("Ajuda - Ramal") to listOf("09h35", "17h05"),
                        getStop("Remédios") to listOf("09h40", "17h10"),
                        getStop("Santa Bárbara - Ramal") to listOf("09h45", "17h15"),
                        getStop("Santo António - Cruz") to listOf("09h50", "17h20"),
                        getStop("Capelas - Rossio") to listOf("09h57", "17h27"),
                        getStop("Capelas - Navio") to listOf("09h59", "17h29"),
                        getStop("São Vicente - Atafona") to listOf("10h02", "17h32"),
                        getStop("Fajã de Cima") to listOf("10h02", "17h32"),
                        getStop("Ponta Delgada - Hospital") to listOf("10h11", "17h41"),
                        getStop("Ponta Delgada") to listOf("10h35", "18h05"),
                    ), TypeOfDay.WEEKDAY, img, Functions().rossioBanif(currentLanguage)
                ),
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("07h15", "14h35"),
                        getStop("Av Principe Mónaco") to listOf("07h20", "14h40"),
                        getStop("Ponta Delgada - Hospital") to listOf("07h27", "14h47"),
                        getStop("Fajã de Cima") to listOf("07h35", "14h55"),
                        getStop("São Vicente - Atafona") to listOf("07h48", "15h08"),
                        getStop("Capelas - Navio") to listOf("07h51", "15h11"),
                        getStop("Capelas - Rossio") to listOf("07h53", "15h13"),
                        getStop("Santo António - Cruz") to listOf("07h58", "15h18"),
                        getStop("Santa Bárbara - Ramal") to listOf("08h04", "15h24"),
                        getStop("Remédios") to listOf("08h08", "15h28"),
                        getStop("Ajuda - Ramal") to listOf("08h15", "15h35"),
                        getStop("João Bom") to listOf("08h23", "15h43"),
                        getStop("Mosteiros - Ramal") to listOf("08h35", "15h55"),
                    ), TypeOfDay.WEEKDAY, img, Functions().rossioBanif(currentLanguage)
                ),
            )
        )
        /* Route 219 */
        route = "219"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"i", mapOf(
                        getStop("João Bom") to listOf("06h00", "07h10", "08h30", "12h30", "15h00"),
                        getStop("Ajuda - Igreja") to listOf(
                            "06h13",
                            "07h23",
                            "08h43",
                            "12h43",
                            "15h13"
                        ),
                        getStop("Remédios") to listOf("06h18", "07h28", "---", "12h48", "15h18"),
                        getStop("Remédios - Igreja") to listOf("---", "---", "08h48", "---", "---"),
                        getStop("Santa Bárbara - Ramal") to listOf(
                            "06h23",
                            "07h33",
                            "---",
                            "12h53",
                            "15h23"
                        ),
                        getStop("Santa Bárbara - Cavalo Branco") to listOf(
                            "---",
                            "---",
                            "08h53",
                            "---",
                            "---"
                        ),
                        getStop("Santo António - Cruz") to listOf(
                            "06h28",
                            "07h38",
                            "08h57",
                            "12h58",
                            "15h28"
                        ),
                        getStop("Capelas - Rossio") to listOf(
                            "06h35",
                            "07h45",
                            "09h04",
                            "13h05",
                            "15h35"
                        ),
                        getStop("Capelas - Navio") to listOf(
                            "06h36",
                            "07h46",
                            "09h05",
                            "13h06",
                            "15h36"
                        ),
                        getStop("São Vicente - Atafona") to listOf(
                            "06h40",
                            "07h50",
                            "09h14",
                            "13h10",
                            "15h40"
                        ),
                        getStop("Fajã de Cima") to listOf(
                            "06h52",
                            "08h02",
                            "---",
                            "13h22",
                            "15h27"
                        ),
                        getStop("Ponta Delgada - Hospital") to listOf(
                            "---",
                            "08h11",
                            "09h31",
                            "13h31",
                            "---"
                        ),
                        getStop("Ponta Delgada") to listOf(
                            "07h10",
                            "08h25",
                            "09h45",
                            "13h45",
                            "16h10"
                        ),
                    ), TypeOfDay.WEEKDAY, img, Functions().rossioBanif(currentLanguage)
                ),
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf(
                            "09h30",
                            "12h30",
                            "16h00",
                            "18h15",
                            "19h00"
                        ),
                        getStop("Ponta Delgada - Hospital") to listOf(
                            "09h42",
                            "12h42",
                            "16h12",
                            "18h27",
                            "---"
                        ),
                        getStop("Fajã de Cima") to listOf(
                            "09h48",
                            "12h48",
                            "16h18",
                            "18h33",
                            "19h18"
                        ),
                        getStop("São Vicente - Atafona") to listOf(
                            "10h00",
                            "13h00",
                            "16h30",
                            "17h45",
                            "19h30"
                        ),
                        getStop("Capelas - Navio") to listOf(
                            "10h04",
                            "13h04",
                            "16h34",
                            "18h49",
                            "19h34"
                        ),
                        getStop("Capelas - Rossio") to listOf(
                            "10h05",
                            "13h05",
                            "16h35",
                            "18h50",
                            "19h35"
                        ),
                        getStop("Santo António - Cruz") to listOf(
                            "10h12",
                            "13h12",
                            "16h42",
                            "18h57",
                            "19h42"
                        ),
                        getStop("Santa Bárbara - Ramal") to listOf(
                            "10h17",
                            "13h17",
                            "16h47",
                            "19h02",
                            "19h47"
                        ),
                        getStop("Remédios") to listOf("10h22", "13h22", "16h52", "19h07", "19h52"),
                        getStop("Ajuda - Igreja") to listOf(
                            "10h27",
                            "13h27",
                            "16h57",
                            "19h12",
                            "19h57"
                        ),
                        getStop("João Bom") to listOf("10h40", "13h40", "17h08", "19h25", "20h10"),
                    ), TypeOfDay.WEEKDAY, img, Functions().rossioBanif(currentLanguage)
                ),
            )
        )
        /* Route 207 */
        route = "207"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"i", mapOf(
                        getStop("Sete Cidades - Ponte") to listOf("---", "16h25"),
                        getStop("Varzea") to listOf("09h05", "16h40"),
                        getStop("Mosteiros - Ramal") to listOf("09h15", "16h45"),
                        getStop("Ajuda - Ramal") to listOf("09h35", "17h05"),
                        getStop("Remédios") to listOf("09h40", "17h10"),
                        getStop("Santa Bárbara - Ramal") to listOf("09h45", "17h15"),
                        getStop("Santo António - Cruz") to listOf("09h50", "17h20"),
                        getStop("Capelas - Rossio") to listOf("09h57", "17h27"),
                        getStop("Capelas - Navio") to listOf("09h58", "17h28"),
                        getStop("São Vicente - Atafona") to listOf("10h02", "17h32"),
                        getStop("Fajã de Cima") to listOf("10h13", "17h43"),
                        getStop("Ponta Delgada - Hospital") to listOf("10h21", "17h51"),
                        getStop("Ponta Delgada") to listOf("10h33", "18h03"),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("07h15", "14h35"),
                        getStop("Ponta Delgada - Hospital") to listOf("07h27", "14h47"),
                        getStop("Fajã de Cima") to listOf("07h36", "14h56"),
                        getStop("São Vicente - Atafona") to listOf("07h48", "15h08"),
                        getStop("Capelas - Navio") to listOf("07h52", "15h12"),
                        getStop("Capelas - Rossio") to listOf("07h53", "15h13"),
                        getStop("Santo António - Cruz") to listOf("08h00", "15h20"),
                        getStop("Santa Bárbara - Ramal") to listOf("08h05", "15h25"),
                        getStop("Remédios") to listOf("08h10", "15h30"),
                        getStop("Ajuda - Ramal") to listOf("08h15", "15h35"),
                        getStop("Mosteiros - Ramal") to listOf("08h35", "15h55"),
                        getStop("Varzea") to listOf("08h45", "16h05"),
                        getStop("Sete Cidades - Ponte") to listOf("---", "16h15"),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"vs", mapOf(
                        getStop("Ponta Delgada") to listOf("07h15", "14h35"),
                        getStop("Av Principe Mónaco") to listOf("07h20", "14h40"),
                        getStop("Ponta Delgada - Hospital") to listOf("07h27", "14h47"),
                        getStop("Fajã de Cima") to listOf("07h35", "14h55"),
                        getStop("São Vicente - Atafona") to listOf("07h48", "15h08"),
                        getStop("São Vicente - Igreja") to listOf("07h50", "15h10"),
                        getStop("Fenais da Luz - Igreja") to listOf("07h53", "15h13"),
                        getStop("Fenais da Luz - Bairro") to listOf("07h54", "15h14"),
                        getStop("Capelas - Navio") to listOf("07h57", "15h17"),
                        getStop("Capelas - Rossio") to listOf("07h59", "15h19"),
                        getStop("Santo António - Cruz") to listOf("08h04", "15h24"),
                        getStop("Santa Bárbara - Ramal") to listOf("08h10", "15h30"),
                        getStop("Remédios") to listOf("08h14", "15h34"),
                        getStop("Ajuda - Ramal") to listOf("08h21", "15h41"),
                        getStop("João Bom") to listOf("08h29", "15h49"),
                        getStop("Mosteiros - Ramal") to listOf("08h41", "16h01"),
                        getStop("Varzea") to listOf("08h46", "16h06"),
                        getStop("Sete Cidades - Igreja") to listOf("08h56", "16h16"),
                        getStop("Sete Cidades - Ponte") to listOf("09h01", "16h21"),
                    ), TypeOfDay.SATURDAY, img
                ),
                Route(
                    route, route+"is", mapOf(
                        getStop("Sete Cidades - Ponte") to listOf("08h55", "16h25"),
                        getStop("Sete Cidades - Igreja") to listOf("09h00", "16h30"),
                        getStop("Varzea") to listOf("09h10", "16h40"),
                        getStop("Mosteiros - Ramal") to listOf("09h15", "16h45"),
                        getStop("João Bom") to listOf("09h25", "16h55"),
                        getStop("Ajuda - Ramal") to listOf("09h35", "17h05"),
                        getStop("Remédios") to listOf("09h40", "17h10"),
                        getStop("Santa Bárbara - Ramal") to listOf("09h45", "17h15"),
                        getStop("Santo António - Cruz") to listOf("09h48", "17h18"),
                        getStop("Capelas - Rossio") to listOf("09h57", "17h27"),
                        getStop("Capelas - Navio") to listOf("09h59", "17h29"),
                        getStop("Fenais da Luz - Bairro") to listOf("10h17", "17h47"),
                        getStop("Fenais da Luz - Igreja") to listOf("10h18", "17h48"),
                        getStop("São Vicente - Igreja") to listOf("10h21", "17h51"),
                        getStop("São Vicente - Atafona") to listOf("10h23", "17h53"),
                        getStop("Fajã de Cima") to listOf("10h32", "18h02"),
                        getStop("Ponta Delgada - Hospital") to listOf("10h43", "18h13"),
                        getStop("Ponta Delgada") to listOf("10h59", "18h29"),
                    ), TypeOfDay.SATURDAY, img
                ),
                Route(
                    route, route+"vd", mapOf(
                        getStop("Ponta Delgada") to listOf("08h30", "16h15"),
                        getStop("Av Principe Mónaco") to listOf("08h35", "16h20"),
                        getStop("Ponta Delgada - Hospital") to listOf("08h42", "16h27"),
                        getStop("Fajã de Cima") to listOf("08h50", "16h35"),
                        getStop("São Vicente - Atafona") to listOf("---", "16h48"),
                        getStop("Batalha") to listOf("08h59", "---"),
                        getStop("Farropo") to listOf("09h04", "---"),
                        getStop("Fenais da Luz - Igreja") to listOf("09h08", "---"),
                        getStop("Fenais da Luz - Bairro") to listOf("09h09", "---"),
                        getStop("São Vicente - Igreja") to listOf("09h13", "---"),
                        getStop("São Vicente - Atafona") to listOf("09h15", "---"),
                        getStop("Capelas - Navio") to listOf("09h17", "16h50"),
                        getStop("Capelas - Rossio") to listOf("09h20", "16h53"),
                        getStop("Santo António - Cruz") to listOf("09h25", "16h58"),
                        getStop("Santa Bárbara - Ramal") to listOf("09h31", "17h04"),
                        getStop("Remédios") to listOf("09h35", "17h08"),
                        getStop("Ajuda - Ramal") to listOf("09h42", "17h15"),
                        getStop("João Bom") to listOf("09h50", "17h23"),
                        getStop("Mosteiros - Ramal") to listOf("10h02", "17h35"),
                        getStop("Varzea") to listOf("10h12", "17h35"),
                        getStop("Sete Cidades - Igreja") to listOf("10h22", "17h55"),
                        getStop("Sete Cidades - Ponte") to listOf("10h27", "18h00"),
                    ), TypeOfDay.SUNDAY, img
                ),
                Route(
                    route, route+"id", mapOf(
                        getStop("Sete Cidades - Ponte") to listOf("10h45", "18h05"),
                        getStop("Sete Cidades - Igreja") to listOf("10h50", "18h10"),
                        getStop("Varzea") to listOf("11h00", "18h20"),
                        getStop("Mosteiros - Ramal") to listOf("11h10", "18h25"),
                        getStop("João Bom") to listOf("11h20", "18h35"),
                        getStop("Ajuda - Ramal") to listOf("11h30", "18h45"),
                        getStop("Remédios") to listOf("11h35", "18h50"),
                        getStop("Santa Bárbara - Ramal") to listOf("11h40", "18h55"),
                        getStop("Santo António - Cruz") to listOf("11h45", "19h00"),
                        getStop("Grota do Morro") to listOf("11h49", "---"),
                        getStop("Capelas - Rossio") to listOf("11h52", "19h07"),
                        getStop("Capelas - Navio") to listOf("11h54", "19h09"),
                        getStop("São Vicente - Atafona") to listOf("11h57", "19h12"),
                        getStop("São Vicente - Igreja") to listOf("11h59", "19h14"),
                        getStop("Fenais da Luz - Bairro") to listOf("12h04", "19h19"),
                        getStop("Fenais da Luz - Igreja") to listOf("12h05", "19h20"),
                        getStop("Farropo") to listOf("12h09", "19h24"),
                        getStop("Batalha") to listOf("12h14", "19h29"),
                        getStop("Fajã de Cima") to listOf("12h19", "19h34"),
                        getStop("Ponta Delgada - Hospital") to listOf("12h30", "---"),
                        getStop("Ponta Delgada") to listOf("12h44", "19h59"),
                    ), TypeOfDay.SUNDAY, img
                ),
            )
        )
        /* Route 214 */
        route = "214"
        avmRoutes.addAll(arrayListOf(
            Route(
                route, route+"vd", mapOf(
                    getStop("Ponta Delgada") to listOf("18h05"),
                    getStop("Fajã de Cima") to listOf("18h20"),
                    getStop("Batalha") to listOf("18h28"),
                    getStop("Farropo") to listOf("18h33"),
                    getStop("Fenais da Luz - Igreja") to listOf("18h37"),
                    getStop("Fenais da Luz - Bairro") to listOf("18h38"),
                    getStop("Calhetas") to listOf("18h44"),
                    getStop("Capelas - Navio") to listOf("19h00"),
                    getStop("Capelas - Rossio") to listOf("19h01"),
                    getStop("Grota do Morro") to listOf("19h05"),
                    ), TypeOfDay.SUNDAY, img
            ),
        ))
        /* Route 218 */
        route = "218"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"i", mapOf(
                        getStop("Remédios") to listOf("---", "07h05", "---", "---", "---", "---"),
                        getStop("Santa Bárbara - Cavalo Branco") to listOf(
                            "---",
                            "07h14",
                            "---",
                            "---",
                            "---",
                            "---"
                        ),
                        getStop("Santo António - Moagem") to listOf(
                            "06h15",
                            "07h16",
                            "08h45",
                            "13h45",
                            "15h00",
                            "17h15"
                        ),
                        getStop("Santo António - Igreja") to listOf(
                            "06h18",
                            "07h19",
                            "06h18",
                            "08h48",
                            "13h48",
                            "15h03",
                            "17h18"
                        ),
                        getStop("Capelas - Rossio") to listOf(
                            "06h24",
                            "07h26",
                            "08h58",
                            "13h54",
                            "15h09",
                            "17h24"
                        ),
                        getStop("Teatro Novo") to listOf(
                            "06h29",
                            "07h31",
                            "08h59",
                            "13h59",
                            "15h14",
                            "17h29"
                        ),
                        getStop("Fajã de Cima") to listOf(
                            "06h52",
                            "07h43",
                            "09h12",
                            "14h12",
                            "15h27",
                            "17h42"
                        ),
                        getStop("Ponta Delgada - Hospital") to listOf(
                            "---",
                            "07h51",
                            "09h21",
                            "---",
                            "15h36",
                            "---"
                        ),
                        getStop("Ponta Delgada") to listOf(
                            "06h58",
                            "08h03",
                            "09h33",
                            "14h28",
                            "15h48",
                            "18h00"
                        ),
                    ), TypeOfDay.WEEKDAY, img, Functions().rossioCaixa(currentLanguage)
                ),
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf(
                            "07h45",
                            "12h00",
                            "14h00",
                            "16h15",
                            "17h30",
                            "18h20"
                        ),
                        getStop("Ponta Delgada - Hospital") to listOf(
                            "07h57",
                            "---",
                            "---",
                            "---",
                            "17h42",
                            "---"
                        ),
                        getStop("Fajã de Cima") to listOf(
                            "---",
                            "12h18",
                            "14h18",
                            "16h33",
                            "17h51",
                            "18h38"
                        ),
                        getStop("Teatro Novo") to listOf(
                            "08h16",
                            "12h31",
                            "14h31",
                            "16h46",
                            "18h04",
                            "18h51"
                        ),
                        getStop("Capelas - Rossio") to listOf(
                            "08h21",
                            "12h36",
                            "14h36",
                            "16h51",
                            "18h09",
                            "18h56"
                        ),
                        getStop("Santo António - Igreja") to listOf(
                            "08h27",
                            "12h42",
                            "14h42",
                            "16h57",
                            "18h16",
                            "19h02"
                        ),
                        getStop("Santo António - Moagem") to listOf(
                            "08h30",
                            "12h45",
                            "14h45",
                            "17h00",
                            "18h19",
                            "19h05"
                        ),
                        getStop("Santa Bárbara - Cavalo Branco") to listOf(
                            "---",
                            "---",
                            "---",
                            "---",
                            "18h21",
                            "---"
                        ),
                        getStop("Remédios") to listOf("---", "---", "---", "---", "18h25", "---"),
                    ), TypeOfDay.WEEKDAY, img, Functions().rossioCaixa(currentLanguage)
                ),
            )
        )
        /* Route 212 */
        route = "212"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"i", mapOf(
                        getStop("Santo António - Moagem") to listOf("---", "---", "12h10", "---"),
                        getStop("Grota do Morro") to listOf("07h00", "08h55", "12h30", "18h00"),
                        getStop("Capelas - Rossio") to listOf("07h03", "08h58", "12h33", "18h03"),
                        getStop("Capelas - Navio") to listOf("07h04", "08h59", "12h34", "18h04"),
                        getStop("São Vicente - Igreja") to listOf(
                            "07h10",
                            "09h05",
                            "12h40",
                            "18h10"
                        ),
                        getStop("Fajã de Cima") to listOf("07h22", "09h17", "12h52", "18h22"),
                        getStop("Ponta Delgada - Hospital") to listOf(
                            "07h31",
                            "09h26",
                            "13h01",
                            "---"
                        ),
                        getStop("Ponta Delgada") to listOf("07h42", "09h37", "13h12", "18h37"),
                    ), TypeOfDay.WEEKDAY, img, Functions().rossioCaixa(currentLanguage)
                ),
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf(
                            "07h45",
                            "10h15",
                            "15h30",
                            "18h00",
                            "19h05"
                        ),
                        getStop("Fajã de Cima") to listOf(
                            "08h01",
                            "10h31",
                            "15h46",
                            "18h16",
                            "19h21"
                        ),
                        getStop("São Vicente - Igreja") to listOf(
                            "08h14",
                            "10h44",
                            "15h59",
                            "18h29",
                            "19h34"
                        ),
                        getStop("Capelas - Navio") to listOf(
                            "08h20",
                            "10h50",
                            "16h05",
                            "18h35",
                            "19h40"
                        ),
                        getStop("Capelas - Rossio") to listOf(
                            "08h21",
                            "10h51",
                            "16h06",
                            "18h36",
                            "19h41"
                        ),
                        getStop("Grota do Morro") to listOf(
                            "08h25",
                            "10h55",
                            "16h10",
                            "18h10",
                            "19h45"
                        ),
                        getStop("Santo António - Moagem") to listOf(
                            "---",
                            "11h01",
                            "---",
                            "---",
                            "---"
                        ),
                    ), TypeOfDay.WEEKDAY, img, Functions().rossioCaixa(currentLanguage)
                )
            )
        )
        /* Route 211 */
        route = "211"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"i", mapOf(
                        getStop("Fenais da Luz - Bairro") to listOf("08h10", "09h40", "15h55"),
                        getStop("Fenais da Luz - Igreja") to listOf("08h11", "09h41", "15h56"),
                        getStop("São Vicente - Igreja") to listOf("08h14", "09h44", "15h59"),
                        getStop("São Vicente - Atafona") to listOf("08h16", "09h46", "16h01"),
                        getStop("Fajã de Cima") to listOf("08h27", "09h57", "16h12"),
                        getStop("Ponta Delgada - Hospital") to listOf("---", "10h05", "---"),
                        getStop("Ponta Delgada") to listOf("08h45", "10h15", "16h30"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("07h30", "12h00", "13h45", "17h00"),
                        getStop("Fajã de Cima") to listOf("07h48", "12h18", "14h03", "17h18"),
                        getStop("São Vicente - Atafona") to listOf(
                            "07h59",
                            "12h29",
                            "14h14",
                            "17h29"
                        ),
                        getStop("São Vicente - Igreja") to listOf(
                            "08h01",
                            "12h31",
                            "14h16",
                            "17h31"
                        ),
                        getStop("Fenais da Luz - Bairro") to listOf(
                            "08h05",
                            "12h35",
                            "14h20",
                            "17h35"
                        ),
                    ), TypeOfDay.WEEKDAY, img
                ),
            )
        )

        /* Route 210 */
        route = "210"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"i", mapOf(
                        getStop("Fenais da Luz - Bairro") to listOf(
                            "06h50",
                            "07h30",
                            "12h45",
                            "14h25",
                            "17h45"
                        ),
                        getStop("Fenais da Luz - Igreja") to listOf(
                            "06h51",
                            "07h31",
                            "12h46",
                            "14h26",
                            "17h46"
                        ),
                        getStop("Farropo") to listOf("06h55", "07h35", "12h50", "14h30", "17h50"),
                        getStop("Batalha") to listOf("07h00", "07h40", "12h55", "14h35", "17h55"),
                        getStop("Fajã de Cima") to listOf(
                            "07h07",
                            "07h47",
                            "13h02",
                            "14h42",
                            "18h02"
                        ),
                        getStop("Ponta Delgada - Hospital") to listOf(
                            "---",
                            "07h56",
                            "13h11",
                            "---",
                            "---"
                        ),
                        getStop("Ponta Delgada") to listOf(
                            "07h25",
                            "08h10",
                            "13h25",
                            "15h00",
                            "18h20"
                        ),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("08h45", "15h15", "17h45", "18h50"),
                        getStop("Ponta Delgada - Hospital") to listOf("---", "---", "17h57", "---"),
                        getStop("Fajã de Cima") to listOf("08h48", "15h33", "18h06", "19h08"),
                        getStop("Batalha") to listOf("09h10", "15h40", "18h13", "19h15"),
                        getStop("Farropo") to listOf("09h15", "15h45", "18h18", "19h20"),
                        getStop("Fenais da Luz - Bairro") to listOf(
                            "09h20",
                            "15h50",
                            "18h23",
                            "19h25"
                        ),
                    ), TypeOfDay.WEEKDAY, img
                ),
            )
        )
        /* Route 216 */
        route = "216"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route,route+"i", mapOf(
                        getStop("Capelas - Rossio") to listOf("08h15", "11h30", "17h15"),
                        getStop("Capelas - Navio") to listOf("08h16", "11h31", "17h16"),
                        getStop("Fenais da Luz - Bairro") to listOf("08h26", "11h41", "17h26"),
                        getStop("Calhetas") to listOf("08h50", "12h05", "17h50"),
                    ), TypeOfDay.WEEKDAY, img, Functions().rossioCaixa(currentLanguage)
                ),
                Route(
                    route, route+"v", mapOf(
                        getStop("Calhetas") to listOf("08h35", "11h50", "17h35"),
                        getStop("Fenais da Luz - Bairro") to listOf("08h39", "11h54", "17h39"),
                        getStop("Capelas - Navio") to listOf("08h49", "12h04", "17h49"),
                        getStop("Capelas - Rossio") to listOf("08h50", "12h05", "17h50"),
                    ), TypeOfDay.WEEKDAY, img, Functions().rossioCaixa(currentLanguage)
                )
            )
        )
        /* Route 215 */
        route = "215"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("21h50", "00h00"),
                        getStop("Ponta Delgada - Hospital") to listOf("22h05", "00h15"),
                        getStop("Fajã de Cima") to listOf("22h14", "00h24"),
                        getStop("Farropo") to listOf("22h26", "00h36"),
                        getStop("Fenais da Luz - Igreja") to listOf("22h30", "00h40"),
                        getStop("São Vicente - Igreja") to listOf("22h37", "00h47"),
                        getStop("São Vicente - Atafona") to listOf("22h40", "00h50"),
                        getStop("Capelas - Navio") to listOf("22h43", "00h53"),
                        getStop("Capelas - Rossio") to listOf("22h45", "00h55"),
                        getStop("Santo António - Igreja") to listOf("22h51", "01h01"),
                        getStop("Ramal Cruz") to listOf("22h55", "01h05"),
                    ), TypeOfDay.WEEKDAY, img, Functions().fsaobras(currentLanguage)
                ),
                Route(
                    route,route+"vs", mapOf(
                        getStop("Ponta Delgada") to listOf("21h50", "00h00"),
                        getStop("Ponta Delgada - Hospital") to listOf("22h05", "00h15"),
                        getStop("Fajã de Cima") to listOf("22h14", "00h24"),
                        getStop("Farropo") to listOf("22h26", "00h36"),
                        getStop("Fenais da Luz - Igreja") to listOf("22h30", "00h40"),
                        getStop("São Vicente - Igreja") to listOf("22h37", "00h47"),
                        getStop("São Vicente - Atafona") to listOf("22h40", "00h50"),
                        getStop("Capelas - Navio") to listOf("22h43", "00h53"),
                        getStop("Capelas - Rossio") to listOf("22h45", "00h55"),
                        getStop("Santo António - Igreja") to listOf("22h51", "01h01"),
                        getStop("Ramal Cruz") to listOf("22h55", "01h05"),
                    ), TypeOfDay.SATURDAY, img, Functions().fsaobras(currentLanguage)
                ),
                Route(
                    route,route+"vd", mapOf(
                        getStop("Ponta Delgada") to listOf("21h50", "00h00"),
                        getStop("Ponta Delgada - Hospital") to listOf("22h05", "00h15"),
                        getStop("Fajã de Cima") to listOf("22h14", "00h24"),
                        getStop("Farropo") to listOf("22h26", "00h36"),
                        getStop("Fenais da Luz - Igreja") to listOf("22h30", "00h40"),
                        getStop("São Vicente - Igreja") to listOf("22h37", "00h47"),
                        getStop("São Vicente - Atafona") to listOf("22h40", "00h50"),
                        getStop("Capelas - Navio") to listOf("22h43", "00h53"),
                        getStop("Capelas - Rossio") to listOf("22h45", "00h55"),
                        getStop("Santo António - Igreja") to listOf("22h51", "01h01"),
                        getStop("Ramal Cruz") to listOf("22h55", "01h05"),
                    ), TypeOfDay.SUNDAY, img, Functions().fsaobras(currentLanguage)),
                Route(
                    route, route+"i", mapOf(
                        getStop("Ramal Cruz") to listOf("22h50"),
                        getStop("Santo António - Igreja") to listOf("22h54"),
                        getStop("Capelas - Rossio") to listOf("22h55"),
                        getStop("Capelas - Navio") to listOf("22h57"),
                        getStop("São Vicente - Atafona") to listOf("22h59"),
                        getStop("São Vicente - Igreja") to listOf("23h01"),
                        getStop("Fenais da Luz - Igreja") to listOf("23h08"),
                        getStop("Fajã de Cima") to listOf("23h24"),
                        getStop("Ponta Delgada - Hospital") to listOf("23h33"),
                        getStop("Ponta Delgada") to listOf("23h50"),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"is", mapOf(
                        getStop("Ramal Cruz") to listOf("22h50"),
                        getStop("Santo António - Igreja") to listOf("22h54"),
                        getStop("Capelas - Rossio") to listOf("22h55"),
                        getStop("Capelas - Navio") to listOf("22h57"),
                        getStop("São Vicente - Atafona") to listOf("22h59"),
                        getStop("São Vicente - Igreja") to listOf("23h01"),
                        getStop("Fenais da Luz - Igreja") to listOf("23h08"),
                        getStop("Fajã de Cima") to listOf("23h24"),
                        getStop("Ponta Delgada - Hospital") to listOf("23h33"),
                        getStop("Ponta Delgada") to listOf("23h50"),
                    ), TypeOfDay.SATURDAY, img
                ),
                Route(
                    route, route+"id", mapOf(
                        getStop("Ramal Cruz") to listOf("22h50"),
                        getStop("Santo António - Igreja") to listOf("22h54"),
                        getStop("Capelas - Rossio") to listOf("22h55"),
                        getStop("Capelas - Navio") to listOf("22h57"),
                        getStop("São Vicente - Atafona") to listOf("22h59"),
                        getStop("São Vicente - Igreja") to listOf("23h01"),
                        getStop("Fenais da Luz - Igreja") to listOf("23h08"),
                        getStop("Fajã de Cima") to listOf("23h24"),
                        getStop("Ponta Delgada - Hospital") to listOf("23h33"),
                        getStop("Ponta Delgada") to listOf("23h50"),
                    ), TypeOfDay.SUNDAY, img
                ),
            )
        )

        /* Saturday */
        /* Route 205 */
        route = "205"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"i", mapOf(
                        getStop("Sete Cidades - Ponte") to listOf("07h00", "09h30", "12h00d)"),
                        getStop("Sete Cidades - Igreja") to listOf("07h05", "09h35", "12h05d)"),
                        getStop("Mosteiros - Ramal") to listOf("---", "---", "12h15d)"),
                        getStop("Varzea") to listOf("07h15", "09h45", "---"),
                        getStop("Ginetes - Igreja") to listOf("07h20", "09h50", "---"),
                        getStop("Candelária - Socorro") to listOf("07h25", "09h55", "---"),
                        getStop("Candelária - Centro") to listOf("07h33", "10h03", "---"),
                        getStop("Feteiras - Biscoito") to listOf("07h35", "10h05", "---"),
                        getStop("Feteiras - Igreja") to listOf("07h38", "10h08", "---"),
                        getStop("Relva - Canto da Pia") to listOf("07h53", "10h23", "---"),
                        getStop("Ponta Delgada - Ramalho") to listOf("07h56", "10h26", "---"),
                        getStop("Ponta Delgada") to listOf("08h05", "10h35", "---"),
                        ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("08h25"),
                        getStop("Av Principe Mónaco") to listOf("08h30"),
                        getStop("Ponta Delgada - Ramalho") to listOf("08h32"),
                        getStop("Relva - Canto da Pia") to listOf("08h37"),
                        getStop("Feteiras - Igreja") to listOf("08h52"),
                        getStop("Feteiras - Biscoito") to listOf("08h55"),
                        getStop("Candelária - Centro") to listOf("09h00"),
                        getStop("Candelária - Socorro") to listOf("09h05"),
                        getStop("Ginetes - Igreja") to listOf("09h10"),
                        getStop("Varzea") to listOf("09h15"),
                        getStop("Sete Cidades - Igreja") to listOf("09h25"),
                        getStop("Sete Cidades - Ponte") to listOf("09h30"),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"iss", mapOf(
                        getStop("Sete Cidades - Ponte") to listOf("07h00"),
                        getStop("Sete Cidades - Igreja") to listOf("07h05"),
                        getStop("Lomba do Vasco") to listOf("07h10"),
                        getStop("Varzea") to listOf("07h15"),
                    ), TypeOfDay.SATURDAY, img
                ),
            )
        )
        /* Route 206 */
        route = "206"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("07h50", "10h40", "12h45", "15h00", "16h30", "17h30", "18h50"),
                        getStop("Ponta Delgada - Hospital") to listOf("---", "---", "---", "14h45", "---", "---", "---"),
                        getStop("Av Principe Mónaco") to listOf("07h55", "10h45", "12h50", "15h05", "16h35", "17h35", "18h55"),
                        getStop("Ponta Delgada - Ramalho") to listOf("07h57", "10h47", "12h52", "15h07", "16h37", "17h37", "18h57"),
                        getStop("Relva - Canto da Pia") to listOf("08h02", "10h52", "12h57", "15h12", "16h42", "17h42", "19h02"),
                        getStop("Feteiras - Igreja") to listOf("08h17", "11h07", "13h12", "15h27", "16h57", "17h57", "19h17"),
                        getStop("Feteiras - Biscoito") to listOf("08h20", "11h10", "13h15", "15h30", "17h00", "18h00", "19h20"),
                        getStop("Candelária - Centro") to listOf("08h25", "11h15", "13h20", "15h35", "17h05", "18h05", "19h25"),
                        getStop("Candelária - Socorro") to listOf("08h30", "11h20", "13h25", "15h40", "17h10", "18h10", "19h30"),
                        getStop("Ginetes - Igreja") to listOf("08h35", "11h25", "13h30", "15h45", "17h15", "18h15", "19h35"),
                        getStop("Varzea") to listOf("08h40", "11h30", "13h35", "15h50", "17h20", "18h20", "19h40"),
                        getStop("Mosteiros - Ramal") to listOf("08h45", "11h35", "13h40", "15h55", "17h25", "18h25", "19h45"),
                        getStop("Mosteiros - Igreja") to listOf("08h50", "11h40", "13h45", "16h00", "17h30", "18h30", "19h50"),
                        getStop("Mosteiros - Banda de Além") to listOf("08h55", "11h45", "13h50", "16h05", "17h35", "18h35", "19h55"),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"i", mapOf(
                        getStop("Mosteiros - Banda de Além") to listOf("06h15", "07h05", "09h05", "12h05", "14h45", "16h35"),
                        getStop("Mosteiros - Igreja") to listOf("06h20", "07h10", "09h10", "12h10", "14h50", "16h40"),
                        getStop("Mosteiros - Ramal") to listOf("06h25", "07h15", "09h15", "12h15", "14h55", "16h45"),
                        getStop("Varzea") to listOf("06h30", "07h20", "09h20", "12h20", "15h00", "16h55"),
                        getStop("Ginetes - Igreja") to listOf("06h35", "07h25", "09h25", "12h25", "15h05", "17h00"),
                        getStop("Candelária - Socorro") to listOf("06h40", "07h30", "09h30", "12h30", "15h10", "17h10"),
                        getStop("Candelária - Centro") to listOf("06h48", "07h38", "09h38", "12h38", "15h18", "17h18"),
                        getStop("Feteiras - Biscoito") to listOf("06h50", "07h40", "09h40", "12h40", "15h20", "17h20"),
                        getStop("Feteiras - Igreja") to listOf("06h53", "07h43", "09h43", "12h43", "15h23", "17h25"),
                        getStop("Relva - Canto da Pia") to listOf("07h08", "07h58", "09h58", "12h58", "15h38", "17h40"),
                        getStop("Ponta Delgada - Ramalho") to listOf("07h11", "08h01", "10h01", "13h01", "15h41", "17h45"),
                        getStop("Ponta Delgada - Hospital") to listOf("07h30", "08h20", "---", "13h20", "---", "---"),
                        getStop("Ponta Delgada") to listOf("07h20", "08h10", "10h10", "13h10", "15h50", "17h55"),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route,route+"is", mapOf(
                        getStop("Mosteiros - Banda de Além") to listOf(
                            "06h15",
                            "07h05",
                            "09h05",
                            "14h45",
                            "16h35"
                        ),
                        getStop("Mosteiros - Igreja") to listOf(
                            "06h20",
                            "07h10",
                            "09h10",
                            "14h50",
                            "16h40"
                        ),
                        getStop("Mosteiros - Ramal") to listOf(
                            "06h25",
                            "07h15",
                            "09h20",
                            "14h55",
                            "16h45"
                        ),
                        getStop("Varzea") to listOf("06h30", "07h20", "09h20", "15h00", "16h50"),
                        getStop("Ginetes - Igreja") to listOf(
                            "06h35",
                            "07h25",
                            "09h25",
                            "15h05",
                            "16h55"
                        ),
                        getStop("Candelária - Socorro") to listOf(
                            "06h40",
                            "07h30",
                            "09h30",
                            "15h10",
                            "17h00"
                        ),
                        getStop("Candelária - Centro") to listOf(
                            "06h45",
                            "07h35",
                            "09h35",
                            "15h15",
                            "17h05"
                        ),
                        getStop("Feteiras - Biscoito") to listOf(
                            "06h50",
                            "07h40",
                            "09h40",
                            "15h20",
                            "17h20"
                        ),
                        getStop("Feteiras - Igreja") to listOf(
                            "06h53",
                            "07h43",
                            "09h43",
                            "15h43",
                            "17h25"
                        ),
                        getStop("Relva - Igreja") to listOf("07h08", "---", "---", "15h38", "---"),
                        getStop("Relva - Canto da Pia") to listOf(
                            "07h13",
                            "07h58",
                            "09h58",
                            "15h41",
                            "17h40"
                        ),
                        getStop("Ponta Delgada - Ramalho") to listOf(
                            "07h16",
                            "08h01",
                            "10h01",
                            "15h44",
                            "17h45"
                        ),
                        getStop("Ponta Delgada - Hospital") to listOf(
                            "07h35",
                            "08h20",
                            "---",
                            "---",
                            "---"
                        ),
                        getStop("Ponta Delgada") to listOf(
                            "07h23",
                            "08h08",
                            "10h08",
                            "15h51",
                            "17h53"
                        ),
                    ), TypeOfDay.SATURDAY, img
                ),
                Route(
                    route, route+"id", mapOf(
                        getStop("Mosteiros - Banda de Além") to listOf(
                            "07h00",
                            "11h00",
                            "15h00",
                            "18h15"
                        ),
                        getStop("Mosteiros - Igreja") to listOf("07h05", "11h05", "15h05", "18h20"),
                        getStop("Mosteiros - Ramal") to listOf("07h10", "11h10", "15h10", "18h25"),
                        getStop("Varzea") to listOf("07h15", "11h15", "15h15", "18h30"),
                        getStop("Ginetes - Igreja") to listOf("07h20", "11h20", "15h20", "18h35"),
                        getStop("Candelária - Socorro") to listOf(
                            "07h25",
                            "11h25",
                            "15h25",
                            "18h40"
                        ),
                        getStop("Candelária - Centro") to listOf(
                            "07h30",
                            "11h30",
                            "15h30",
                            "18h45"
                        ),
                        getStop("Feteiras - Biscoito") to listOf(
                            "07h35",
                            "11h35",
                            "15h35",
                            "18h50"
                        ),
                        getStop("Feteiras - Igreja") to listOf("07h38", "11h38", "15h38", "18h53"),
                        getStop("Relva - Igreja") to listOf("07h53", "11h53", "15h53", "19h08"),
                        getStop("Relva - Canto da Pia") to listOf(
                            "07h58",
                            "11h58",
                            "15h58",
                            "19h13"
                        ),
                        getStop("Ponta Delgada - Ramalho") to listOf(
                            "08h01",
                            "12h01",
                            "16h01",
                            "19h16"
                        ),
                        getStop("Ponta Delgada") to listOf("08h08", "12h08", "16h08", "19h23"),
                        getStop("Ponta Delgada - Hospital") to listOf(
                            "08h20",
                            "12h20",
                            "16h20",
                            "19h35"
                        ),
                    ), TypeOfDay.SUNDAY, img
                ),
                Route(
                    route, route+"vs",mapOf(
                        getStop("Ponta Delgada") to listOf(
                            "07h50",
                            "13h15",
                            "15h00",
                            "17h30",
                            "19h00"
                        ),
                        getStop("Ponta Delgada - Hospital") to listOf(
                            "---",
                            "---",
                            "14h45",
                            "---",
                            "---"
                        ),
                        getStop("Av Principe Mónaco") to listOf(
                            "07h55",
                            "13h20",
                            "15h05",
                            "17h35",
                            "19h05"
                        ),
                        getStop("Ponta Delgada - Ramalho") to listOf(
                            "07h57",
                            "13h22",
                            "15h07",
                            "17h37",
                            "19h07"
                        ),
                        getStop("Relva - Canto da Pia") to listOf(
                            "08h02",
                            "13h27",
                            "15h12",
                            "17h42",
                            "19h12"
                        ),
                        getStop("Relva - Igreja") to listOf("---", "13h30", "15h15", "---", "---"),
                        getStop("Feteiras - Igreja") to listOf(
                            "08h17",
                            "13h45",
                            "15h30",
                            "17h57",
                            "19h27"
                        ),
                        getStop("Feteiras - Biscoito") to listOf(
                            "08h20",
                            "13h48",
                            "15h33",
                            "18h00",
                            "19h30"
                        ),
                        getStop("Candelária - Centro") to listOf(
                            "08h25",
                            "13h53",
                            "15h38",
                            "18h05",
                            "19h35"
                        ),
                        getStop("Candelária - Socorro") to listOf(
                            "08h30",
                            "13h58",
                            "15h43",
                            "18h10",
                            "19h40"
                        ),
                        getStop("Ginetes - Igreja") to listOf(
                            "08h35",
                            "14h03",
                            "15h48",
                            "18h15",
                            "19h45"
                        ),
                        getStop("Varzea") to listOf("08h40", "14h08", "15h53", "18h20", "19h50"),
                        getStop("Mosteiros - Ramal") to listOf(
                            "08h45",
                            "14h13",
                            "15h58",
                            "18h25",
                            "19h55"
                        ),
                        getStop("Mosteiros - Igreja") to listOf(
                            "08h50",
                            "14h18",
                            "16h03",
                            "18h30",
                            "20h00"
                        ),
                        getStop("Mosteiros - Banda de Além") to listOf(
                            "08h55",
                            "14h23",
                            "16h08",
                            "18h35",
                            "20h05"
                        ),
                    ), TypeOfDay.SATURDAY, img
                ),
                Route(
                    route, route+"vd", mapOf(
                        getStop("Ponta Delgada - Hospital") to listOf(
                            "08h45",
                            "12h15",
                            "16h25",
                            "19h35"
                        ),
                        getStop("Ponta Delgada") to listOf("09h00", "12h30", "16h40", "19h45"),
                        getStop("Av Principe Mónaco") to listOf("09h05", "12h35", "16h45", "19h50"),
                        getStop("Ponta Delgada - Ramalho") to listOf(
                            "09h07",
                            "12h37",
                            "16h47",
                            "19h52"
                        ),
                        getStop("Relva - Canto da Pia") to listOf(
                            "09h12",
                            "12h42",
                            "16h52",
                            "19h57"
                        ),
                        getStop("Relva - Igreja") to listOf("09h15", "12h45", "16h55", "20h00"),
                        getStop("Feteiras - Igreja") to listOf("09h30", "13h00", "17h10", "20h15"),
                        getStop("Feteiras - Biscoito") to listOf(
                            "09h33",
                            "13h03",
                            "17h13",
                            "20h18"
                        ),
                        getStop("Candelária - Centro") to listOf(
                            "09h38",
                            "13h08",
                            "17h18",
                            "20h23"
                        ),
                        getStop("Candelária - Socorro") to listOf(
                            "09h43",
                            "13h13",
                            "17h23",
                            "20h28"
                        ),
                        getStop("Ginetes - Igreja") to listOf("09h48", "13h18", "17h28", "20h33"),
                        getStop("Varzea") to listOf("09h53", "13h23", "17h33", "20h38"),
                        getStop("Mosteiros - Ramal") to listOf("09h58", "13h28", "17h38", "20h43"),
                        getStop("Mosteiros - Igreja") to listOf("10h03", "13h33", "17h43", "20h48"),
                        getStop("Mosteiros - Banda de Além") to listOf(
                            "10h08",
                            "13h38",
                            "17h48",
                            "20h53"
                        ),
                    ), TypeOfDay.SUNDAY, img
                )
            )
        )
        /* Route 202 */
        route = "202"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"is", mapOf(
                        getStop("Covoada - Encruzilhada") to listOf("08h50"),
                        getStop("Relva - Canto da Pia") to listOf("08h58"),
                        getStop("Ponta Delgada - Ramalho") to listOf("09h01"),
                        getStop("Ponta Delgada") to listOf("09h08"),
                    ), TypeOfDay.SATURDAY, img
                ),
                Route(
                    route, route+"vs", mapOf(
                        getStop("Ponta Delgada") to listOf("11h30"),
                        getStop("Av Principe Mónaco") to listOf("11h35"),
                        getStop("Ponta Delgada - Ramalho") to listOf("11h37"),
                        getStop("Relva - Canto da Pia") to listOf("11h42"),
                        getStop("Covoada - Encruzilhada") to listOf("11h53"),
                    ), TypeOfDay.SATURDAY, img
                ),
                Route(
                    route,route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("08h25", "11h30", "15h45", "18h10"),
                        getStop("Av Principe Mónaco") to listOf("08h30", "11h35", "15h50", "18h15"),
                        getStop("Ponta Delgada - Ramalho") to listOf("08h32", "11h37", "15h52", "18h17"),
                        getStop("Relva - Canto da Pia") to listOf("08h37", "11h42", "15h57", "18h22"),
                        getStop("Covoada - Encruzilhada") to listOf("08h45", "11h50", "16h05", "18h30"),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"i", mapOf(
                        getStop("Covoada - Encruzilhada") to listOf("07h00", "08h00", "08h50", "13h00"),
                        getStop("Relva - Canto da Pia") to listOf("07h08", "08h08", "08h58", "13h08"),
                        getStop("Ponta Delgada - Ramalho") to listOf("07h11", "08h11", "09h01", "13h11"),
                        getStop("Ponta Delgada") to listOf("07h20", "08h20", "09h10", "13h20")
                    ), TypeOfDay.WEEKDAY, img
                ),
            )
        )
        /* Route 200 */
        route = "200"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route,route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("08h10", "09h10", "10h10", "11h10", "12h10", "14h10", "17h10", "18h10", "19h10", "20h10"),
                        getStop("Av Principe Mónaco") to listOf("08h15", "09h15", "15h15", "11h15", "12h15", "14h15", "17h15", "18h15", "19h15", "20h15"),
                        getStop("Ponta Delgada - Ramalho") to listOf("08h17", "09h17", "17h17", "11h17", "12h17", "14h17", "17h17", "18h17", "19h17", "20h17"),
                        getStop("Relva - Canto da Pia") to listOf("08h22", "09h22", "22h22", "11h22", "12h22", "14h22", "17h22", "18h22", "19h22", "20h22"),
                        getStop("Relva - Igreja") to listOf("08h30", "09h30", "30h30", "11h30", "12h30", "14h30", "17h30", "18h30", "19h30", "20h30"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route, route+"ir", mapOf(
                        getStop("Relva - Igreja") to listOf("07h00", "08h35", "09h35", "10h35","11h35", "12h35", "13h35", "14h35", "16h35", "17h35", "18h35", "19h35"),
                        getStop("Relva - Canto da Pia") to listOf("07h05", "08h40", "09h40", "10h40","11h40", "12h40", "13h40", "14h40", "16h40", "17h40", "18h40", "19h40"),
                        getStop("Ponta Delgada - Ramalho") to listOf("07h10", "08h45", "09h45", "10h45","11h45", "12h45", "13h45", "14h45", "16h45", "17h45", "18h45", "19h45"),
                        getStop("Ponta Delgada") to listOf("07h20", "08h55", "09h55", "10h55","11h55", "12h55", "13h55", "14h55", "16h55", "17h55", "18h55", "19h55"),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"irs", mapOf(
                        getStop("Relva - Igreja") to listOf("07h45", "08h35", "09h35", "10h35", "12h35"),
                        getStop("Relva - Canto da Pia") to listOf("07h50", "08h40", "09h40", "10h40", "12h42"),
                        getStop("Ponta Delgada - Ramalho") to listOf("07h55", "08h45", "09h45", "10h45", "12h46"),
                        getStop("Ponta Delgada") to listOf("08h03", "08h53", "09h53", "10h53", "12h53"),
                    ), TypeOfDay.SATURDAY, img
                ),
                Route(
                    route, route+"vrs", mapOf(
                        getStop("Ponta Delgada") to listOf("08h10", "09h10", "10h10", "12h10"),
                        getStop("Av Principe Mónaco") to listOf("08h15", "09h15", "10h15", "12h15"),
                        getStop("Ponta Delgada - Ramalho") to listOf("08h17", "09h17", "10h17", "12h17"),
                        getStop("Relva - Igreja") to listOf("08h30", "09h30", "10h30", "12h30"),
                    ), TypeOfDay.SATURDAY, img),
            )
        )
        /* Route 201 */
        route = "201"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("13h10", "16h10", "16h40"),
                        getStop("Av Principe Mónaco") to listOf("13h15", "16h15", "16h45"),
                        getStop("Ponta Delgada - Ramalho") to listOf("13h17", "16h17", "16h47"),
                        getStop("Relva - Canto da Pia") to listOf("13h22", "16h22", "16h52"),
                        getStop("Relva - Igreja") to listOf("13h30", "16h30", "17h00"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route, route+"i", mapOf(
                        getStop("Relva - Igreja") to listOf("07h45"),
                        getStop("Relva - Canto da Pia") to listOf("07h50"),
                        getStop("Ponta Delgada - Ramalho") to listOf("07h56"),
                        getStop("Ponta Delgada") to listOf("08h05"),
                    ), TypeOfDay.WEEKDAY, img)
            ))
        /* Route 203 */
        route = "203"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("17h30"),
                        getStop("Av Principe Mónaco") to listOf("17h35"),
                        getStop("Ponta Delgada - Ramalho") to listOf("17h37"),
                        getStop("Relva - Canto da Pia") to listOf("17h42"),
                        getStop("Feteiras - Igreja")to listOf("17h57"),
                        getStop("Feteiras - Biscoito") to listOf("18h00"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route, route+"i", mapOf(
                        getStop("Feteiras - Biscoito") to listOf("08h10"),
                        getStop("Feteiras - Igreja")to listOf("08h13"),
                        getStop("Relva - Canto da Pia") to listOf("08h28"),
                        getStop("Ponta Delgada - Ramalho") to listOf("08h31"),
                        getStop("Ponta Delgada") to listOf("08h40"),
                    ), TypeOfDay.WEEKDAY, img)
            ))
        /* Route 204 */
        route = "204"
        avmRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"i", mapOf(
                        getStop("Candelária - Socorro") to listOf("06h10", "08h30"),
                        getStop("Candelária - Centro")to listOf("06h18", "08h39"),
                        getStop("Feteiras - Biscoito") to listOf("06h20", "08h42"),
                        getStop("Feteiras - Igreja")to listOf("06h23", "08h46"),
                        getStop("Relva - Canto da Pia") to listOf("06h38", "09h04"),
                        getStop("Ponta Delgada - Ramalho") to listOf("06h41", "09h10"),
                        getStop("Ponta Delgada") to listOf("06h50", "09h20"),
                    ), TypeOfDay.WEEKDAY, img)
            ))
    }

    private fun loadVARELA() {
        val img: Int = R.drawable.varela_logo
        /* Weekdays */
        var info: String = ""
        /* Route 301 */
        var route = "301"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"i", mapOf(
                    getStop("Covoada") to listOf("07h45"),
                    getStop("Bom Despacho") to listOf("08h00"),
                    getStop("Ponta Delgada") to listOf("08h10"),
                    ), TypeOfDay.WEEKDAY, img, Functions().justFriday(currentLanguage)),
            )
        )
        route = "301a"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Ponta Delgada") to listOf("14h55"),
                    getStop("Ponta Delgada - Hospital") to listOf("15h05"),
                    getStop("Bom Despacho") to listOf("15h10"),
                    getStop("Covoada") to listOf("15h30"),
                    getStop("Quartel") to listOf("15h35"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"i", mapOf(
                    getStop("Covoada") to listOf("07h00", "12h30"),
                    getStop("Quartel") to listOf("---", "12h35"),
                    getStop("Bom Despacho") to listOf("07h15", "12h50"),
                    getStop("Ponta Delgada - Hospital") to listOf("07h20", "12h55"),
                    getStop("Ponta Delgada") to listOf("07h30", "13h05"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"vs", mapOf(
                    getStop("Ponta Delgada") to listOf("15h30", "18h30"),
                    getStop("Ponta Delgada - Hospital") to listOf("15h40", "18h40"),
                    getStop("Bom Despacho") to listOf("15h45", "18h45"),
                    getStop("Covoada") to listOf("16h00", "19h00"),
                ), TypeOfDay.SATURDAY, img),
                Route(route, route+"is", mapOf(
                    getStop("Covoada") to listOf("07h00", "12h35"),
                    getStop("Bom Despacho") to listOf("07h15", "12h50"),
                    getStop("Ponta Delgada - Hospital") to listOf("07h20","12h55"),
                    getStop("Ponta Delgada") to listOf("07h30","13h05"),
                ), TypeOfDay.SATURDAY, img),
                Route(route, route+"vd", mapOf(
                    getStop("Ponta Delgada") to listOf("18h30"),
                    getStop("Ponta Delgada - Hospital") to listOf("18h40"),
                    getStop("Bom Despacho") to listOf("18h45"),
                    getStop("Covoada") to listOf("19h00"),
                ), TypeOfDay.SUNDAY, img),
                Route(route, route+"id", mapOf(
                    getStop("Covoada") to listOf("12h30"),
                    getStop("Bom Despacho") to listOf("12h45"),
                    getStop("Ponta Delgada - Hospital") to listOf("12h50"),
                    getStop("Ponta Delgada") to listOf("13h00"),
                ), TypeOfDay.SUNDAY, img),
            )
        )
        route = "301b"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Ponta Delgada") to listOf("07h40", "08h55", "10h00", "11h10", "12h05", "13h30", "16h10", "17h30", "18h50", "20h00"),
                    getStop("Ponta Delgada - Hospital") to listOf("---", "---", "---", "---", "---", "---", "16h20", "---", "---", "---"),
                    getStop("Bom Despacho") to listOf("07h50", "09h05", "10h10", "11h20", "12h15", "13h40", "16h25", "17h40", "19h00", "20h10"),
                    getStop("Covoada") to listOf("08h05", "09h20", "10h25", "11h35", "12h30", "13h55", "16h40", "17h55", "19h15", "20h30"),
                    getStop("Quartel") to listOf("---", "09h25", "10h30", "11h40", "12h35", "---", "16h45", "---", "---", "20h20"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"i", mapOf(
                    getStop("Covoada") to listOf("08h10", "09h20", "10h30", "11h40", "14h00", "15h30", "16h40", "18h00"),
                    getStop("Quartel") to listOf("---", "09h25", "10h35", "11h45", "---", "15h35", "16h45", "---"),
                    getStop("Bom Despacho") to listOf("08h25", "09h40", "10h45", "11h55", "14h15", "15h45", "17h00", "18h15"),
                    getStop("Ponta Delgada") to listOf("08h35", "09h50", "10h55", "12h05", "14h25", "16h00", "17h10", "18h25"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"vs", mapOf(
                    getStop("Ponta Delgada") to listOf("07h40", "08h50", "12h00", "13h30"),
                    getStop("Bom Despacho") to listOf("07h50", "09h00", "12h10", "13h40"),
                    getStop("Covoada") to listOf("08h05", "09h15", "12h25", "13h55"),
                ), TypeOfDay.SATURDAY, img),
                Route(route, route+"is", mapOf(
                    getStop("Covoada") to listOf("08h10", "09h20", "14h00", "16h00"),
                    getStop("Bom Despacho") to listOf("08h25", "09h35", "14h15", "16h15"),
                    getStop("Ponta Delgada") to listOf("08h35", "09h45", "14h25", "16h25"),
                ), TypeOfDay.SATURDAY, img),
                Route(route, route+"vd", mapOf(
                    getStop("Ponta Delgada") to listOf("12h00", "16h00"),
                    getStop("Bom Despacho") to listOf("12h10", "16h15"),
                    getStop("Covoada") to listOf("12h25", "16h25"),
                ), TypeOfDay.SUNDAY, img),
                Route(route, route+"id", mapOf(
                    getStop("Covoada") to listOf("09h00", "16h30"),
                    getStop("Quartel") to listOf("09h05", "---"),
                    getStop("Bom Despacho") to listOf("09h20", "16h45"),
                    getStop("Ponta Delgada") to listOf("09h30", "16h55"),
                ), TypeOfDay.SUNDAY, img),
            )
        )
        /* Route 303 */
        route = "303a"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Ponta Delgada") to listOf("08h00", "08h55", "10h00", "11h10", "12h05", "12h40", "14h00", "18h10", "18h40", "19h15","20h00"),
                    getStop("Bom Despacho") to listOf("08h10", "09h05", "10h10", "11h20", "12h15", "12h50", "14h10", "18h20", "18h50", "19h25","20h10"),
                    getStop("Covoada") to listOf("---", "09h20", "10h30", "11h40", "12h30", "---", "---", "---", "---", "---","20h30"),
                    getStop("Quartel") to listOf("08h20", "09h25", "10h35", "11h45", "12h35", "13h00", "14h20", "18h30", "19h00", "19h35","20h20"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"i", mapOf(
                    getStop("Quartel") to listOf("06h45", "07h50", "08h25", "09h25", "10h35", "11h45", "12h35", "13h40", "14h30", "15h35", "16h45", "17h40", "19h10"),
                    getStop("Covoada") to listOf("---", "---", "---", "09h20", "10h30", "11h40", "12h30", "---", "---", "15h30", "16h40", "---", "---"),
                    getStop("Arribanas") to listOf("---", "07h45", "---", "---", "---", "---", "---", "13h35", "---", "---", "---", "---", "---"),
                    getStop("Bom Despacho") to listOf("06h55", "08h00", "08h35", "09h35", "10h45", "11h55", "12h45", "13h45", "14h40", "15h50", "16h50", "17h50", "19h20"),
                    getStop("Ponta Delgada") to listOf("07h05", "08h10", "08h45", "09h45", "10h55", "12h05", "12h55", "13h55", "14h50", "16h00", "17h00", "18h00", "19h30"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"vs", mapOf(
                    getStop("Ponta Delgada") to listOf("08h00", "09h00", "10h00", "11h10"),
                    getStop("Bom Despacho") to listOf("08h10", "09h10", "10h10", "11h20"),
                    getStop("Quartel") to listOf("08h20", "09h20", "10h20", "11h30"),
                ), TypeOfDay.SATURDAY, img),
                Route(route, route+"is", mapOf(
                    getStop("Quartel") to listOf("07h25", "08h25", "09h25", "10h30", "11h40", "13h35"),
                    getStop("Bom Despacho") to listOf("07h35", "08h35", "09h35", "10h40", "11h50", "13h45"),
                    getStop("Ponta Delgada - Hospital") to listOf("07h40", "---", "---", "---", "---", "13h50"),
                    getStop("Ponta Delgada") to listOf("07h50", "08h45", "09h45", "10h50", "12h00", "14h00"),
                ), TypeOfDay.SATURDAY, img),
            )
        )
        route = "303b"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Ponta Delgada") to listOf("13h10", "16h10"),
                    getStop("Ponta Delgada - Hospital") to listOf("13h20", "16h20"),
                    getStop("Bom Despacho") to listOf("13h25", "16h25"),
                    getStop("Covoada") to listOf("---", "16h40"),
                    getStop("Arribanas") to listOf("13h35", "---"),
                    getStop("Quartel") to listOf("13h30", "16h45"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"i", mapOf(
                    getStop("Quartel") to listOf("07h25", "13h05"),
                    getStop("Bom Despacho") to listOf("07h35", "13h15"),
                    getStop("Ponta Delgada - Hospital") to listOf("07h40", "13h20"),
                    getStop("Ponta Delgada") to listOf("07h50", "13h30"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"vs", mapOf(
                    getStop("Ponta Delgada") to listOf("13h10"),
                    getStop("Ponta Delgada - Hospital") to listOf("13h20"),
                    getStop("Bom Despacho") to listOf("13h25"),
                    getStop("Quartel") to listOf("13h35"),
                ), TypeOfDay.SATURDAY, img),
            )
        )
        /* Route 309 */
        route = "309"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Ponta Delgada") to listOf("07h20", "14h55", "16h35", "17h15"),
                    getStop("Bom Despacho") to listOf("07h30", "15h05", "16h45", "17h25"),
                    getStop("Covoada") to listOf("---", "15h30", "---", "---"),
                    getStop("Arribanas") to listOf("07h45", "---", "17h05", "---"),
                    getStop("Quartel") to listOf("07h40", "15h35", "16h55", "17h35"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"i", mapOf(
                    getStop("Quartel") to listOf("17h20"),
                    getStop("Arribanas") to listOf("17h15"),
                    getStop("Bom Despacho") to listOf("17h30"),
                    getStop("Ponta Delgada") to listOf("17h40"),
                ), TypeOfDay.WEEKDAY, img),
            )
        )
        /* Route 315 */
        route = "315"
        varelaRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf(
                            "07h00",
                            "07h25",
                            "11h00",
                            "12h35",
                            "15h00",
                            "17h40",
                            "19h00"
                        ),
                        getStop("São Roque") to listOf(
                            "07h05",
                            "07h30",
                            "11h05",
                            "12h40",
                            "15h05",
                            "17h45",
                            "19h05"
                        ),
                        getStop("Praia do Pópulo") to listOf(
                            "07h10",
                            "---",
                            "---",
                            "12h45",
                            "---",
                            "17h50",
                            "19h10"
                        ),
                        getStop("Livramento") to listOf(
                            "---",
                            "07h35",
                            "11h10",
                            "---",
                            "15h10",
                            "---",
                            "---"
                        ),
                        getStop("Lagoa") to listOf(
                            "07h20",
                            "07h45",
                            "11h20",
                            "12h55",
                            "15h20",
                            "18h00",
                            "19h20"
                        ),
                        getStop("Água de Pau") to listOf(
                            "07h35",
                            "08h00",
                            "11h35",
                            "13h10",
                            "15h35",
                            "18h15",
                            "19h35"
                        ),
                        getStop("Vila Franca") to listOf(
                            "07h50",
                            "08h15",
                            "11h50",
                            "13h25",
                            "15h50",
                            "18h30",
                            "19h50"
                        ),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"i", mapOf(
                        getStop("Vila Franca") to listOf(
                            "06h30",
                            "07h20",
                            "08h00",
                            "09h00",
                            "09h50",
                            "13h00",
                            "14h45",
                            "16h25",
                            "17h40"
                        ),
                        getStop("Água de Pau") to listOf(
                            "06h45",
                            "07h35",
                            "08h15",
                            "09h15",
                            "10h05",
                            "13h15",
                            "15h00",
                            "16h40",
                            "17h55"
                        ),
                        getStop("Lagoa") to listOf(
                            "07h00",
                            "07h50",
                            "08h30",
                            "09h30",
                            "10h20",
                            "13h30",
                            "15h15",
                            "16h55",
                            "18h10"
                        ),
                        getStop("Livramento") to listOf(
                            "07h10",
                            "---",
                            "---",
                            "---",
                            "---",
                            "---",
                            "15h25",
                            "---",
                            "---"
                        ),
                        getStop("Praia do Pópulo") to listOf(
                            "---",
                            "08h00",
                            "08h40",
                            "09h40",
                            "10h30",
                            "13h40",
                            "---",
                            "17h05",
                            "18h20"
                        ),
                        getStop("São Roque") to listOf(
                            "07h15",
                            "08h05",
                            "08h45",
                            "09h45",
                            "10h35",
                            "13h45",
                            "15h30",
                            "17h10",
                            "18h25"
                        ),
                        getStop("Ponta Delgada") to listOf(
                            "07h20",
                            "08h10",
                            "08h50",
                            "09h50",
                            "10h40",
                            "13h50",
                            "15h35",
                            "17h15",
                            "18h30"
                        ),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"vs", mapOf(
                        getStop("Ponta Delgada") to listOf("08h00", "11h00", "12h40", "17h30"),
                        getStop("São Roque") to listOf("08h05", "11h05", "12h45", "17h35"),
                        getStop("Praia do Pópulo") to listOf("---", "---", "12h50", "---"),
                        getStop("Livramento") to listOf("08h10", "11h10", "---", "17h40"),
                        getStop("Lagoa") to listOf("08h20", "11h20", "13h00", "17h50"),
                        getStop("Água de Pau") to listOf("08h30", "11h30", "13h10", "18h00"),
                        getStop("Vila Franca") to listOf("08h50", "11h50", "12h30", "18h20"),
                    ), TypeOfDay.SATURDAY, img
                ),
                Route(
                    route, route+"is", mapOf(
                        getStop("Vila Franca") to listOf("07h10", "08h10", "10h00", "15h00"),
                        getStop("Água de Pau") to listOf("07h25", "08h25", "10h15", "15h15"),
                        getStop("Lagoa") to listOf("07h40", "08h40", "10h30", "15h30"),
                        getStop("Livramento") to listOf("---", "---", "10h40", "---"),
                        getStop("Praia do Pópulo") to listOf("07h50", "08h50", "---", "15h40"),
                        getStop("São Roque") to listOf("07h55", "08h55", "10h45", "15h45"),
                        getStop("Ponta Delgada") to listOf("08h00", "09h00", "10h50", "15h50"),
                    ), TypeOfDay.SATURDAY, img
                ),
                Route(
                    route, route+"vd", mapOf(
                        getStop("Ponta Delgada") to listOf("10h00", "12h30"),
                        getStop("São Roque") to listOf("10h05", "12h35"),
                        getStop("Praia do Pópulo") to listOf("---", "12h40"),
                        getStop("Livramento") to listOf("10h10", "---"),
                        getStop("Lagoa") to listOf("10h20", "12h50"),
                        getStop("Água de Pau") to listOf("10h30", "13h05"),
                        getStop("Vila Franca") to listOf("10h50", "13h20"),
                    ), TypeOfDay.SUNDAY, img
                ),
                Route(
                    route, route+"id", mapOf(
                        getStop("Vila Franca") to listOf("08h10", "15h00", "16h30"),
                        getStop("Água de Pau") to listOf("08h25", "15h15", "16h15"),
                        getStop("Lagoa") to listOf("08h40", "15h30", "17h00"),
                        getStop("Praia do Pópulo") to listOf("08h50", "15h40", "17h10"),
                        getStop("São Roque") to listOf("08h55", "15h45", "17h15"),
                        getStop("Ponta Delgada") to listOf("09h00", "15h50", "17h20"),
                    ), TypeOfDay.SUNDAY, img
                ),
            )
        )
        /* Route 311 */
        route = "311"
        varelaRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf(
                            "07h50",
                            "08h25",
                            "10h10",
                            "13h00",
                            "14h15",
                            "15h30",
                            "16h45",
                            "17h00",
                            "18h05",
                            "18h30",
                            "20h05",
                            "21h15",
                            "23h15"
                        ),
                        getStop("São Roque") to listOf(
                            "07h55",
                            "08h30",
                            "10h15",
                            "13h05",
                            "14h20",
                            "15h35",
                            "16h50",
                            "17h05",
                            "18h10",
                            "18h35",
                            "20h10",
                            "21h30",
                            "23h30"
                        ),
                        getStop("Livramento") to listOf(
                            "08h00",
                            "08h35",
                            "10h20",
                            "13h10",
                            "14h25",
                            "15h40",
                            "16h55",
                            "17h10",
                            "18h15",
                            "18h40",
                            "20h15",
                            "21h35",
                            "23h35"
                        ),
                        getStop("Lagoa") to listOf(
                            "08h15",
                            "08h45",
                            "10h35",
                            "13h25",
                            "14h40",
                            "15h55",
                            "17h10",
                            "17h25",
                            "18h30",
                            "18h55",
                            "20h30",
                            "21h50",
                            "23h50"
                        ),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"i", mapOf(
                        getStop("Lagoa") to listOf(
                            "07h10",
                            "07h20",
                            "08h05",
                            "08h40",
                            "09h15",
                            "11h00",
                            "13h30",
                            "14h50",
                            "16h05",
                            "17h40",
                            "18h40",
                            "22h00"
                        ),
                        getStop("Livramento") to listOf(
                            "07h20",
                            "07h30",
                            "08h15",
                            "08h50",
                            "09h25",
                            "11h10",
                            "13h40",
                            "15h00",
                            "16h15",
                            "17h50",
                            "18h50",
                            "22h10"
                        ),
                        getStop("São Roque") to listOf(
                            "07h25",
                            "07h35",
                            "08h20",
                            "08h50",
                            "09h30",
                            "11h15",
                            "13h45",
                            "15h05",
                            "16h20",
                            "17h55",
                            "18h55",
                            "22h15"
                        ),
                        getStop("Ponta Delgada") to listOf(
                            "07h30",
                            "07h40",
                            "08h25",
                            "08h55",
                            "09h35",
                            "11h20",
                            "13h50",
                            "15h10",
                            "16h25",
                            "18h00",
                            "19h00",
                            "22h35"
                        ),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"vs", mapOf(
                        getStop("Ponta Delgada") to listOf(
                            "09h30",
                            "10h30",
                            "16h00",
                            "19h30",
                            "21h15",
                            "23h15"
                        ),
                        getStop("São Roque") to listOf(
                            "09h35",
                            "10h35",
                            "16h05",
                            "19h35",
                            "21h30",
                            "23h30"
                        ),
                        getStop("Livramento") to listOf(
                            "09h40",
                            "10h40",
                            "16h10",
                            "19h40",
                            "21h35",
                            "23h35"
                        ),
                        getStop("Lagoa") to listOf(
                            "09h50",
                            "10h50",
                            "16h20",
                            "19h50",
                            "21h50",
                            "23h50"
                        ),
                    ), TypeOfDay.SATURDAY, img
                ),
                Route(
                    route, route+"is", mapOf(
                        getStop("Lagoa") to listOf(
                            "07h00",
                            "07h45",
                            "10h00",
                            "11h00",
                            "16h50",
                            "22h00"
                        ),
                        getStop("Livramento") to listOf(
                            "07h10",
                            "07h55",
                            "10h10",
                            "11h10",
                            "17h00",
                            "22h10"
                        ),
                        getStop("São Roque") to listOf(
                            "07h15",
                            "08h00",
                            "10h15",
                            "11h15",
                            "17h05",
                            "22h15"
                        ),
                        getStop("Ponta Delgada") to listOf(
                            "07h20",
                            "08h05",
                            "10h20",
                            "11h20",
                            "17h10",
                            "22h35"
                        ),
                    ), TypeOfDay.SATURDAY, img
                ),
                Route(
                    route, route+"id", mapOf(
                        getStop("Ponta Delgada") to listOf("17h15", "20h00", "21h15", "23h15"),
                        getStop("São Roque") to listOf("17h20", "20h05", "21h30", "23h30"),
                        getStop("Livramento") to listOf("17h25", "20h15", "21h35", "23h35"),
                        getStop("Lagoa") to listOf("17h35", "20h20", "21h50", "23h50"),
                    ), TypeOfDay.SUNDAY, img
                ),
                Route(
                    route, route+"vd", mapOf(
                        getStop("Lagoa") to listOf("17h45", "22h00"),
                        getStop("Livramento") to listOf("17h55", "22h10"),
                        getStop("São Roque") to listOf("18h00", "22h15"),
                        getStop("Ponta Delgada") to listOf("18h05", "22h35"),
                    ), TypeOfDay.SUNDAY, img
                ),
            )
        )
        /* Route 311 */
        route = "311"
        varelaRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf(
                            "07h50",
                            "08h25",
                            "10h10",
                            "13h00",
                            "14h15",
                            "15h30",
                            "16h45",
                            "17h00",
                            "18h05",
                            "18h30",
                            "20h05",
                            "21h15",
                            "23h15"
                        ),
                        getStop("São Roque") to listOf(
                            "07h55",
                            "08h30",
                            "10h15",
                            "13h05",
                            "14h20",
                            "15h35",
                            "16h50",
                            "17h05",
                            "18h10",
                            "18h35",
                            "20h10",
                            "21h30",
                            "23h30"
                        ),
                        getStop("Livramento") to listOf(
                            "08h00",
                            "08h35",
                            "10h20",
                            "13h10",
                            "14h25",
                            "15h40",
                            "16h55",
                            "17h10",
                            "18h15",
                            "18h40",
                            "20h15",
                            "21h35",
                            "23h35"
                        ),
                        getStop("Lagoa") to listOf(
                            "08h15",
                            "08h45",
                            "10h35",
                            "13h25",
                            "14h40",
                            "15h55",
                            "17h10",
                            "17h25",
                            "18h30",
                            "18h55",
                            "20h30",
                            "21h50",
                            "23h50"
                        ),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"i", mapOf(
                        getStop("Lagoa") to listOf(
                            "07h10",
                            "07h20",
                            "08h05",
                            "08h40",
                            "09h15",
                            "11h00",
                            "13h30",
                            "14h50",
                            "16h05",
                            "17h40",
                            "18h40",
                            "22h00"
                        ),
                        getStop("Livramento") to listOf(
                            "07h20",
                            "07h30",
                            "08h15",
                            "08h50",
                            "09h25",
                            "11h10",
                            "13h40",
                            "15h00",
                            "16h15",
                            "17h50",
                            "18h50",
                            "22h10"
                        ),
                        getStop("São Roque") to listOf(
                            "07h25",
                            "07h35",
                            "08h20",
                            "08h50",
                            "09h30",
                            "11h15",
                            "13h45",
                            "15h05",
                            "16h20",
                            "17h55",
                            "18h55",
                            "22h15"
                        ),
                        getStop("Ponta Delgada") to listOf(
                            "07h30",
                            "07h40",
                            "08h25",
                            "08h55",
                            "09h35",
                            "11h20",
                            "13h50",
                            "15h10",
                            "16h25",
                            "18h00",
                            "19h00",
                            "22h35"
                        ),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"vs", mapOf(
                        getStop("Ponta Delgada") to listOf(
                            "09h30",
                            "10h30",
                            "16h00",
                            "19h30",
                            "21h15",
                            "23h15"
                        ),
                        getStop("São Roque") to listOf(
                            "09h35",
                            "10h35",
                            "16h05",
                            "19h35",
                            "21h30",
                            "23h30"
                        ),
                        getStop("Livramento") to listOf(
                            "09h40",
                            "10h40",
                            "16h10",
                            "19h40",
                            "21h35",
                            "23h35"
                        ),
                        getStop("Lagoa") to listOf(
                            "09h50",
                            "10h50",
                            "16h20",
                            "19h50",
                            "21h50",
                            "23h50"
                        ),
                    ), TypeOfDay.SATURDAY, img
                ),
                Route(
                    route, route+"is", mapOf(
                        getStop("Lagoa") to listOf(
                            "07h00",
                            "07h45",
                            "10h00",
                            "11h00",
                            "16h50",
                            "22h00"
                        ),
                        getStop("Livramento") to listOf(
                            "07h10",
                            "07h55",
                            "10h10",
                            "11h10",
                            "17h00",
                            "22h10"
                        ),
                        getStop("São Roque") to listOf(
                            "07h15",
                            "08h00",
                            "10h15",
                            "11h15",
                            "17h05",
                            "22h15"
                        ),
                        getStop("Ponta Delgada") to listOf(
                            "07h20",
                            "08h05",
                            "10h20",
                            "11h20",
                            "17h10",
                            "22h35"
                        ),
                    ), TypeOfDay.SATURDAY, img
                ),
                Route(
                    route, route+"id", mapOf(
                        getStop("Ponta Delgada") to listOf("17h15", "20h00", "21h15", "23h15"),
                        getStop("São Roque") to listOf("17h20", "20h05", "21h30", "23h30"),
                        getStop("Livramento") to listOf("17h25", "20h15", "21h35", "23h35"),
                        getStop("Lagoa") to listOf("17h35", "20h20", "21h50", "23h50"),
                    ), TypeOfDay.SUNDAY, img
                ),
                Route(
                    route, route+"vd", mapOf(
                        getStop("Lagoa") to listOf("17h45", "22h00"),
                        getStop("Livramento") to listOf("17h55", "22h10"),
                        getStop("São Roque") to listOf("18h00", "22h15"),
                        getStop("Ponta Delgada") to listOf("18h05", "22h35"),
                    ), TypeOfDay.SUNDAY, img
                ),
            )
        )
        /* Route 312 */
        route = "312"
        varelaRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("07h40", "11h00", "12h10", "15h50", "17h40", "19h00"),
                        getStop("São Roque") to listOf("07h45", "11h05", "12h15", "15h55", "17h45", "19h05"),
                        getStop("Praia do Pópulo") to listOf("07h50", "---", "---", "---", "18h00", "---"),
                        getStop("Livramento") to listOf("---", "11h10", "12h20", "16h00", "---", "19h10"),
                        getStop("Lagoa") to listOf("08h00", "11h20", "12h30", "16h10", "18h10", "19h20"),
                        getStop("Cabouco") to listOf("08h10", "11h30", "12h40", "16h20", "18h20", "19h35"),
                        getStop("Remédios da Lagoa") to listOf("---", "11h35", "12h45", "---", "---", "19h40"),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"i", mapOf(
                        getStop("Cabouco") to listOf("07h05", "08h05", "16h30", "18h30"),
                        getStop("Lagoa") to listOf("07h10", "08h10", "16h50", "18h35"),
                        getStop("Livramento") to listOf("---", "08h20", "17h00", "---"),
                        getStop("Praia do Pópulo") to listOf("07h20", "---", "---", "18h45"),
                        getStop("São Roque") to listOf("07h25", "08h25", "17h05", "18h50"),
                        getStop("Ponta Delgada") to listOf("07h30", "08h30", "17h10", "18h55"),
                    ), TypeOfDay.WEEKDAY, img
                ),
                Route(
                    route, route+"vs", mapOf(
                        getStop("Ponta Delgada") to listOf("18h00"),
                        getStop("São Roque") to listOf("18h05"),
                        getStop("Praia do Pópulo") to listOf("18h10"),
                        getStop("Livramento") to listOf("---"),
                        getStop("Lagoa") to listOf("18h20"),
                        getStop("Cabouco") to listOf("18h30"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route, route+"is", mapOf(
                        getStop("Cabouco") to listOf("07h05", "18h30"),
                        getStop("Lagoa") to listOf("07h10", "18h35"),
                        getStop("Livramento") to listOf("---" , "18h45"),
                        getStop("Praia do Pópulo") to listOf("07h20", "---"),
                        getStop("São Roque") to listOf("07h25", "18h50"),
                        getStop("Ponta Delgada") to listOf("07h30", "18h55"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route, route+"id", mapOf(
                        getStop("Cabouco") to listOf("08h15"),
                        getStop("Lagoa") to listOf("08h20"),
                        getStop("Livramento") to listOf("08h30"),
                        getStop("São Roque") to listOf("08h35"),
                        getStop("Ponta Delgada") to listOf("08h40"),
                    ), TypeOfDay.SUNDAY, img),
            )
        )
        /* Route 314 */
        route = "314"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Ponta Delgada") to listOf("12h35", "17h45"),
                    getStop("São Roque") to listOf("12h40", "17h50"),
                    getStop("Praia do Pópulo") to listOf("12h45", "17h55"),
                    getStop("Lagoa") to listOf("12h55", "18h05"),
                    getStop("Água de Pau") to listOf("13h15", "18h20"),
                    getStop("Ribeira Chã") to listOf("13h20", "18h25"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"i", mapOf(
                    getStop("Ribeira Chã") to listOf("07h25", "13h30"),
                    getStop("Água de Pau") to listOf("07h30", "13h35"),
                    getStop("Lagoa") to listOf("07h45", "13h50"),
                    getStop("Praia do Pópulo") to listOf("07h55", "14h00"),
                    getStop("São Roque") to listOf("08h00", "14h05"),
                    getStop("Ponta Delgada") to listOf("08h05", "14h10"),
                    ), TypeOfDay.WEEKDAY, img),
            )
        )
        /* Route 318 */
        route = "318"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Ponta Delgada") to listOf("09h00", "13h45", "16h00", "18h10a", "18h30b"),
                    getStop("São Roque") to listOf("09h05", "13h45", "16h05", "18h15a", "18h35b"),
                    getStop("Praia do Pópulo") to listOf("---", "13h50", "16h10", "18h20a", "18h40b"),
                    getStop("Livramento") to listOf("09h10", "---", "---", "---", "---"),
                    getStop("Lagoa") to listOf("09h20", "14h00", "16h20", "18h30a", "18h50b"),
                    getStop("Água de Pau") to listOf("09h35", "14h15", "16h35", "18h45a", "19h05b"),
                    getStop("Vila Franca") to listOf("09h50", "14h30", "16h45", "19h00a", "19h20b"),
                    getStop("Furnas") to listOf("10h30", "15h10", "17h20", "19h40a", "20h00b"),
                    getStop("Povoação") to listOf("10h50", "15h30", "17h40", "20h00a", "20h20b"),
                    ), TypeOfDay.WEEKDAY, img, Functions().r318(currentLanguage)),
                Route(route, route+"i", mapOf(
                    getStop("Povoação") to listOf("06h40", "08h30", "10h15", "16h00"),
                    getStop("Furnas") to listOf("07h00", "08h50", "10h35", "16h20"),
                    getStop("Vila Franca") to listOf("07h40", "09h30", "11h30", "16h55"),
                    getStop("Água de Pau") to listOf("07h55", "09h45", "11h45", "17h10"),
                    getStop("Lagoa") to listOf("08h10", "10h00", "12h00", "17h25"),
                    getStop("Praia do Pópulo") to listOf("08h20", "10h10", "12h10", "17h35"),
                    getStop("São Roque") to listOf("08h25", "10h15", "12h15", "17h40"),
                    getStop("Ponta Delgada") to listOf("08h30", "10h20", "12h20", "17h45"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"vs", mapOf(
                    getStop("Ponta Delgada") to listOf("09h00", "15h00"),
                    getStop("São Roque") to listOf("09h05", "15h05"),
                    getStop("Praia do Pópulo") to listOf("---", "15h10"),
                    getStop("Livramento") to listOf("09h10", "---"),
                    getStop("Lagoa") to listOf("09h20", "15h20"),
                    getStop("Água de Pau") to listOf("09h30", "15h30"),
                    getStop("Vila Franca") to listOf("09h50", "15h50"),
                    getStop("Furnas") to listOf("10h30", "16h30"),
                    getStop("Povoação") to listOf("10h50", "16h50"),
                ), TypeOfDay.SATURDAY, img),
                Route(route, route+"is", mapOf(
                    getStop("Povoação") to listOf("11h00", "17h00"),
                    getStop("Furnas") to listOf("11h20", "17h20"),
                    getStop("Vila Franca") to listOf("12h00", "18h00"),
                    getStop("Água de Pau") to listOf("12h15", "18h15"),
                    getStop("Lagoa") to listOf("12h30", "18h30"),
                    getStop("Praia do Pópulo") to listOf("12h40", "18h40"),
                    getStop("São Roque") to listOf("12h45", "18h45"),
                    getStop("Ponta Delgada") to listOf("12h50", "18h50"),
                ), TypeOfDay.SATURDAY, img),
                Route(route, route+"vd", mapOf(
                    getStop("Ponta Delgada") to listOf("09h00", "15h00", "17h30"),
                    getStop("São Roque") to listOf("09h05", "15h05", "17h35"),
                    getStop("Praia do Pópulo") to listOf("---", "15h10", "---"),
                    getStop("Livramento") to listOf("09h10", "---", "17h40"),
                    getStop("Lagoa") to listOf("09h20", "15h20", "17h50"),
                    getStop("Água de Pau") to listOf("09h30", "15h30", "18h00"),
                    getStop("Vila Franca") to listOf("09h50", "15h50", "18h20"),
                    getStop("Furnas") to listOf("10h30", "16h30", "---"),
                    getStop("Povoação") to listOf("10h50", "16h50", "---"),
                ), TypeOfDay.SUNDAY, img),
                Route(route, route+"sd", mapOf(
                    getStop("Povoação") to listOf("11h00", "17h00"),
                    getStop("Furnas") to listOf("11h20", "17h20"),
                    getStop("Vila Franca") to listOf("12h00", "18h00"),
                    getStop("Água de Pau") to listOf("12h15", "18h15"),
                    getStop("Lagoa") to listOf("12h30", "18h30"),
                    getStop("Praia do Pópulo") to listOf("12h40", "18h40"),
                    getStop("São Roque") to listOf("12h45", "18h45"),
                    getStop("Ponta Delgada") to listOf("12h50", "18h50"),
                ), TypeOfDay.SUNDAY, img),
            )
        )
        /* Route 327 */
        route = "327"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"vs", mapOf(
                    getStop("Ponta Delgada") to listOf("14h30", "16h30", "18h45"),
                    getStop("Ponta Delgada - Hospital") to listOf("14h40", "---", "18h55"),
                    getStop("Bom Despacho") to listOf("14h45", "16h40", "19h00"),
                    getStop("Milagres") to listOf("14h50", "16h45", "19h05"),
                    getStop("Quartel") to listOf("14h55", "16h50", "19h10"),
                ), TypeOfDay.SATURDAY, img),
                Route(route, route+"is", mapOf(
                    getStop("Quartel") to listOf("14h55", "16h50", "19h10"),
                    getStop("Bom Despacho") to listOf("15h00", "17h00", "19h15"),
                    getStop("Ponta Delgada") to listOf("15h10", "17h10", "19h25"),
                ), TypeOfDay.SATURDAY, img),
                Route(route, route+"vd", mapOf(
                    getStop("Ponta Delgada") to listOf("09h30", "12h30", "14h45", "17h30", "18h30"),
                    getStop("Ponta Delgada - Hospital") to listOf("---", "---", "14h55", "---", "18h40"),
                    getStop("Bom Despacho") to listOf("09h40", "12h40", "15h00", "17h40", "18h45"),
                    getStop("Milagres") to listOf("09h45", "12h45", "15h05", "17h45", "18h50"),
                    getStop("Quartel") to listOf("09h50", "12h50", "15h10", "17h50", "---"),
                ), TypeOfDay.SUNDAY, img),
                Route(route, route+"id", mapOf(
                    getStop("Quartel") to listOf("09h50", "12h50", "15h10", "17h50"),
                    getStop("Bom Despacho") to listOf("10h00", "13h00", "15h15", "18h00"),
                    getStop("Ponta Delgada") to listOf("10h10", "13h10", "15h25", "18h10"),
                ), TypeOfDay.SUNDAY, img),
            )
        )
        /* Route 308 */
        route = "308"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"vd", mapOf(
                    getStop("Ponta Delgada") to listOf("07h40", "18h40"),
                    getStop("Ponta Delgada - Hospital") to listOf("07h50", "18h50"),
                    getStop("Grotinha") to listOf("08h00", "19h00"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"id", mapOf(
                    getStop("Milagres") to listOf("---", "---", "09h00"),
                    getStop("Grotinha") to listOf("07h05", "08h00", "09h05"),
                    getStop("Ponta Delgada - Hospital") to listOf("07h15", "08h10", "09h10"),
                    getStop("Ponta Delgada") to listOf("07h25", "08h20", "09h25"),
                ), TypeOfDay.WEEKDAY, img)
            ))
        /* Route 305 */
        route = "305a"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Ponta Delgada") to listOf("07h35", "11h30", "12h40", "17h30", "18h30"),
                    getStop("Bom Despacho") to listOf("07h45", "11h40", "12h50", "17h40", "18h40"),
                    getStop("Milagres") to listOf("07h55", "11h50", "13h00", "17h50", "18h50"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"i", mapOf(
                    getStop("Milagres") to listOf("08h00", "10h45", "11h55", "13h25", "18h00"),
                    getStop("Bom Despacho") to listOf("08h10", "10h55", "12h05", "13h35", "18h10"),
                    getStop("Ponta Delgada") to listOf("08h20", "11h05", "12h15", "13h45", "18h20"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"vs", mapOf(
                    getStop("Ponta Delgada") to listOf("07h35", "11h30", "12h40"),
                    getStop("Bom Despacho") to listOf("07h45", "11h40", "12h50"),
                    getStop("Milagres") to listOf("07h55", "11h50", "13h00"),
                ), TypeOfDay.SATURDAY, img),
                Route(route, route+"is", mapOf(
                    getStop("Milagres") to listOf("08h00", "10h45", "11h55"),
                    getStop("Grotinha") to listOf("08h15", "---", "---"),
                    getStop("Bom Despacho") to listOf("08h10", "10h55", "12h05"),
                    getStop("Ponta Delgada - Hospital") to listOf("08h20", "---", "---"),
                    getStop("Ponta Delgada") to listOf("08h30", "11h05", "12h15"),
                ), TypeOfDay.SATURDAY, img),
            ))
        /* Route 305 */
        route = "305b"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Ponta Delgada") to listOf("08h30", "10h15", "14h40", "16h30"),
                    getStop("Ponta Delgada - Hospital") to listOf("08h40", "10h25", "14h50", "16h40"),
                    getStop("Grotinha") to listOf("08h50", "10h35", "14h45", "16h45"),
                    getStop("Milagres") to listOf("09h00", "10h40", "15h05", "16h55"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"i", mapOf(
                    getStop("Milagres") to listOf("07h00", "15h10", "17h00"),
                    getStop("Grotinha") to listOf("---", "15h20", "---"),
                    getStop("Bom Despacho") to listOf("07h10", "---", "17h10"),
                    getStop("Ponta Delgada - Hospital") to listOf("07h15", "15h30", "17h20"),
                    getStop("Ponta Delgada") to listOf("07h25", "15h40", "17h30"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"vs", mapOf(
                    getStop("Ponta Delgada") to listOf("10h15"),
                    getStop("Ponta Delgada - Hospital") to listOf("10h25"),
                    getStop("Grotinha") to listOf("10h35"),
                    getStop("Milagres") to listOf("10h40"),
                ), TypeOfDay.SATURDAY, img),
                Route(route, route+"is", mapOf(
                    getStop("Milagres") to listOf("07h00"),
                    getStop("Bom Despacho") to listOf("07h10"),
                    getStop("Ponta Delgada - Hospital") to listOf("07h15"),
                    getStop("Ponta Delgada") to listOf("07h25"),
                ), TypeOfDay.SATURDAY, img),
            ))
        /* Route 307 */
        route = "307a"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Ponta Delgada") to listOf("07h30", "08h05", "08h20", "09h05", "12h00", "12h35", "13h10", "14h00", "15h00", "16h00", "17h10", "18h10", "18h45", "19h10", "20h00"),
                    getStop("Caminho da Levada") to listOf("07h40", "08h15", "08h30", "09h15", "12h10", "12h45", "13h20", "14h10", "15h10", "16h10", "17h20", "18h20", "18h55", "19h20", "20h10"),
                    getStop("Fajã de Cima") to listOf("07h50", "08h25", "08h40", "09h25", "12h20", "12h55", "13h30", "14h20", "15h20", "16h20", "17h30", "18h30", "19h05", "19h30", "20h20"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"i", mapOf(
                    getStop("Fajã de Cima") to listOf("06h55", "07h25", "08h25", "09h10", "09h25", "12h20", "13h30", "14h20", "17h30", "18h30", "19h30"),
                    getStop("Caminho da Levada") to listOf("07h05", "07h35", "08h35", "09h20", "09h35", "12h30", "13h40", "14h30", "17h40", "18h40", "19h40"),
                    getStop("Ponta Delgada") to listOf("07h15", "07h45", "08h45", "09h30", "09h45", "12h40", "13h50", "14h40", "17h50", "18h50", "19h50"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"vs", mapOf(
                    getStop("Ponta Delgada") to listOf("07h30", "08h05", "09h05", "10h05", "11h05", "12h10"),
                    getStop("Caminho da Levada") to listOf("07h40", "08h15", "09h15", "10h15", "11h15", "12h20"),
                    getStop("Fajã de Cima") to listOf("07h50", "08h25", "09h25", "10h25", "11h25", "12h30"),
                ), TypeOfDay.SATURDAY, img),
                Route(route, route+"is", mapOf(
                    getStop("Fajã de Cima") to listOf("06h55", "07h50", "08h25", "09h25", "10h25", "11h25", "12h30"),
                    getStop("Caminho da Levada") to listOf("07h05", "08h00", "08h35", "09h35", "10h35", "11h35", "12h40"),
                    getStop("Ponta Delgada") to listOf("07h15", "08h10", "08h45", "09h45", "10h45", "11h45", "12h40"),
                ), TypeOfDay.SATURDAY, img),
            ))
        route = "307b"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Ponta Delgada") to listOf("10h05", "11h05"),
                    getStop("Ponta Delgada - Hospital") to listOf("10h15", "11h15"),
                    getStop("Caminho da Levada") to listOf("10h20", "11h20"),
                    getStop("Fajã de Cima") to listOf("10h30", "11h30"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"i", mapOf(
                    getStop("Fajã de Cima") to listOf("07h50", "10h25", "11h25", "13h00", "15h20"),
                    getStop("Caminho da Levada") to listOf("08h00", "10h35", "11h35", "13h10", "15h30"),
                    getStop("Ponta Delgada - Hospital") to listOf("08h10", "10h45", "11h45", "13h20", "15h40"),
                    getStop("Ponta Delgada") to listOf("08h20", "10h55", "11h55", "13h30", "15h50"),
                ), TypeOfDay.WEEKDAY, img),
            ))
        /* Route 306 */
        route = "306"
        varelaRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"v",
                    mapOf(
                        getStop("Ponta Delgada") to listOf(
                            "07h30",
                            "08h00",
                            "08h45",
                            "10h10",
                            "12h10",
                            "12h40",
                            "14h00",
                            "17h05",
                            "18h15",
                            "19h10",
                        ),
                        getStop("Belém") to listOf(
                            "07h40",
                            "08h10",
                            "08h55",
                            "10h20",
                            "12h20",
                            "12h50",
                            "14h10",
                            "17h15",
                            "18h25",
                            "19h20",
                        ),
                        getStop("Fajã de Baixo") to listOf(
                            "07h50",
                            "08h20",
                            "09h05",
                            "10h30",
                            "12h30",
                            "13h00",
                            "14h20",
                            "17h25",
                            "18h35",
                            "19h30",
                        ),
                    ),
                    TypeOfDay.WEEKDAY, img,
                ),
                Route(
                    route, route+"i",
                    mapOf(
                        getStop("Fajã de Baixo") to listOf(
                            "08h25",
                            "09h10",
                            "10h35",
                            "12h35",
                            "13h05",
                            "13h30",
                            "14h25",
                        ),
                        getStop("Belém") to listOf(
                            "08h35",
                            "09h20",
                            "10h45",
                            "12h45",
                            "13h15",
                            "13h40",
                            "14h35",
                        ),
                        getStop("Ponta Delgada") to listOf(
                            "08h45",
                            "09h30",
                            "10h55",
                            "12h55",
                            "13h25",
                            "13h50",
                            "14h45",
                        ),
                    ),
                    TypeOfDay.WEEKDAY, img,
                ),
                Route(
                    route, route+"vs",
                    mapOf(
                        getStop("Ponta Delgada") to listOf("10h10", "12h10"),
                        getStop("Laranjeiras") to listOf("10h20", "12h20"),
                        getStop("Fajã de Baixo") to listOf("10h30", "12h30"),
                    ),
                    TypeOfDay.SATURDAY, img,
                ),
                Route(
                    route, route+"is",
                    mapOf(
                        getStop("Fajã de Baixo") to listOf("08h00", "10h35", "12h35"),
                        getStop("Laranjeiras") to listOf("08h10", "10h45", "12h45"),
                        getStop("Ponta Delgada") to listOf("08h20", "10h55", "12h55"),
                    ),
                    TypeOfDay.SATURDAY, img,
                ),
            ),
        )
        /* Route 304 */
        route = "304a"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Ponta Delgada") to listOf("09h10", "11h10", "13h10", "16h10"),
                    getStop("Laranjeiras") to listOf("09h15", "11h15", "13h15", "16h15"),
                    getStop("Fajã de Baixo") to listOf("09h25", "11h25", "13h25", "16h25"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"i", mapOf(
                    getStop("Ponta Delgada") to listOf("07h55"),
                    getStop("Laranjeiras") to listOf("08h05"),
                    getStop("Fajã de Baixo") to listOf("08h15"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"vs", mapOf(
                    getStop("Ponta Delgada") to listOf("09h10", "11h10"),
                    getStop("Belém") to listOf("09h15", "11h15"),
                    getStop("Fajã de Baixo") to listOf("09h25", "11h25"),
                ), TypeOfDay.SATURDAY, img),
            ))
        route = "304b"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Fajã de Baixo") to listOf("07h00", "09h35", "11h35", "16h35", "17h30", "18h40"),
                    getStop("Laranjeiras") to listOf("07h10", "09h45", "11h45", "16h45", "17h40", "18h50"),
                    getStop("Ponta Delgada") to listOf("07h15", "09h50", "11h50", "16h50", "17h45", "18h55"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"is", mapOf(
                    getStop("Fajã de Baixo") to listOf("07h00", "09h35", "11h35"),
                    getStop("Belém") to listOf("07h10", "09h45", "11h45"),
                    getStop("Ponta Delgada") to listOf("07h15", "09h50", "11h55"),
                ), TypeOfDay.SATURDAY, img),
            ))
        /* Route 328 */
        route = "328"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"vs", mapOf(
                    getStop("Ponta Delgada") to listOf("13h10", "14h30", "16h00", "17h30"),
                    getStop("Laranjeiras") to listOf("13h15", "14h35", "---", "---"),
                    getStop("Belém") to listOf("---", "---", "16h05", "17h35"),
                    getStop("Santa Rita") to listOf("13h25", "14h45", "16h15", "17h45"),
                    getStop("Fajã de Cima") to listOf("13h30", "14h50", "16h20", "17h50"),
                ), TypeOfDay.SATURDAY, img, Functions().avDHenrique(currentLanguage)),
                Route(route, route+"is", mapOf(
                    getStop("Fajã de Cima") to listOf("13h30", "14h50", "16h20", "17h50"),
                    getStop("Caminho da Levada") to listOf("13h40", "15h00", "16h30", "18h00"),
                    getStop("Ponta Delgada - Hospital") to listOf("13h45", "15h05", "---", "---"),
                    getStop("Ponta Delgada") to listOf("13h55", "15h15", "16h40", "18h10"),
                ), TypeOfDay.SATURDAY, img),
                Route(route, route+"vd", mapOf(
                    getStop("Ponta Delgada") to listOf("11h05", "13h10", "14h15", "16h45"),
                    getStop("Laranjeiras") to listOf("11h10", "---", "---", "---"),
                    getStop("Belém") to listOf("---", "13h15", "14h20", "16h50"),
                    getStop("Santa Rita") to listOf("11h20", "13h30", "14h30", "17h00"),
                    getStop("Fajã de Cima") to listOf("11h25", "13h30", "14h35", "17h05"),
                ), TypeOfDay.SUNDAY, img, Functions().avDHenrique(currentLanguage)),
                Route(route, route+"id", mapOf(
                    getStop("Fajã de Cima") to listOf("11h25", "13h30", "14h35", "17h05"),
                    getStop("Caminho da Levada") to listOf("11h35", "13h40", "14h45", "17h15"),
                    getStop("Ponta Delgada - Hospital") to listOf("---", "13h45", "14h50", "---"),
                    getStop("Ponta Delgada") to listOf("11h45", "13h55", "15h00", "17h25"),
                ), TypeOfDay.SUNDAY, img),
            ))
        /* Route 329 */
        route = "329"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Ponta Delgada") to listOf("20h00"),
                    getStop("Caminho da Levada") to listOf("20h10"),
                    getStop("Fajã de Cima") to listOf("20h20"),
                ), TypeOfDay.WEEKDAY, img,Functions().tourismOffice(currentLanguage)),
                Route(route, route+"i", mapOf(
                    getStop("Fajã de Cima") to listOf("20h20"),
                    getStop("Fajã de Baixo") to listOf("20h30"),
                    getStop("Laranjeiras") to listOf("20h40"),
                    getStop("Ponta Delgada") to listOf("20h50"),
                ), TypeOfDay.WEEKDAY, img),
            ))
        /* Route 302 */
        route = "302"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Ponta Delgada") to listOf("08h05", "12h45", "15h00", "17h45", "18h45"),
                    getStop("Fajã de Baixo") to listOf("08h15", "12h55", "15h10", "17h55", "18h55"),
                    getStop("Largo da Fonte") to listOf("08h25", "13h05", "15h20", "18h05", "19h05"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"i", mapOf(
                    getStop("Largo da Fonte") to listOf("07h15", "08h25", "13h30", "15h20", "18h05"),
                    getStop("Fajã de Baixo") to listOf("07h25", "08h35", "13h40", "15h30", "18h15"),
                    getStop("Ponta Delgada") to listOf("07h35", "08h45", "13h50", "15h40", "18h25"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"vs", mapOf(
                    getStop("Ponta Delgada") to listOf("08h05", "15h10"),
                    getStop("Fajã de Baixo") to listOf("08h15", "15h20"),
                    getStop("Largo da Fonte") to listOf("08h25", "15h30"),
                ), TypeOfDay.SATURDAY, img),
                Route(route, route+"is", mapOf(
                    getStop("Largo da Fonte") to listOf("07h15", "08h25", "15h35"),
                    getStop("Fajã de Baixo") to listOf("07h25", "08h35", "15h45"),
                    getStop("Ponta Delgada") to listOf("07h35", "08h45", "15h55"),
                ), TypeOfDay.SATURDAY, img),
            ))
        /* Route 316 */
        route = "316"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"i", mapOf(
                    getStop("Vila Franca") to listOf("07h20", "08h30", "10h10", "11h30", "13h00", "15h00", "17h10", "18h40", "20h00"),
                    getStop("Ribeira das Tainhas") to listOf("07h30", "08h40", "10h20", "11h40", "13h10", "15h10", "17h20", "18h50", "20h10"),
                    getStop("Caminho Novo") to listOf("07h40", "08h50", "10h30", "11h50", "13h20", "15h20", "17h30", "19h00", "20h20"),
                    getStop("Ponta Garça") to listOf("07h45", "08h55", "10h35", "11h55", "13h25", "15h25", "17h35", "19h05", "20h25"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"v", mapOf(
                    getStop("Ponta Garça") to listOf("06h40", "07h50", "09h10", "10h50", "12h25", "13h50", "15h40", "17h50", "19h20"),
                    getStop("Caminho Novo") to listOf("06h45", "07h55", "09h15", "10h55", "12h30", "13h55", "15h45", "17h55", "19h25"),
                    getStop("Ribeira das Tainhas") to listOf("06h55", "08h05", "09h25", "11h05", "12h40", "14h05", "15h55", "18h05", "19h35"),
                    getStop("Vila Franca") to listOf("07h05", "08h15", "09h35", "11h15", "12h50", "14h15", "16h05", "18h15", "19h45"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"is",mapOf(
                    getStop("Vila Franca") to listOf("08h50", "09h50", "11h50", "13h40", "15h50", "18h20"),
                    getStop("Ribeira das Tainhas") to listOf("09h00", "10h00", "12h00", "13h50", "16h00", "18h30"),
                    getStop("Caminho Novo") to listOf("09h10", "10h10", "12h10", "14h00", "16h10", "18h40"),
                    getStop("Ponta Garça") to listOf("09h15", "---", "12h15", "14h05", "---", "18h45"),
                ), TypeOfDay.SATURDAY, img),
                Route(route, route+"vs", mapOf(
                    getStop("Ponta Garça") to listOf("06h40", "07h40", "09h30", "---", "14h30", "---"),
                    getStop("Caminho Novo") to listOf("06h45", "07h45", "09h35", "11h35", "14h35", "17h35"),
                    getStop("Ribeira das Tainhas") to listOf("06h55", "07h55", "09h45", "11h45", "14h45", "17h45"),
                    getStop("Vila Franca") to listOf("07h05", "08h05", "09h55", "11h55", "14h55", "17h55"),
                ), TypeOfDay.SATURDAY, img),
                Route(route,route+"id", mapOf(
                    getStop("Vila Franca") to listOf("09h50", "10h50", "13h20", "15h50", "18h20"),
                    getStop("Ribeira das Tainhas") to listOf("10h00", "11h00", "13h30", "16h00", "18h30"),
                    getStop("Caminho Novo") to listOf("10h10", "11h10", "13h40", "16h10", "18h40"),
                    getStop("Ponta Garça") to listOf("---", "11h15", "13h50", "---", "18h45"),
                ), TypeOfDay.SUNDAY, img),
                Route(route, route+"vd", mapOf(
                    getStop("Ponta Garça") to listOf("07h40", "---", "14h30", "16h00", "---"),
                    getStop("Caminho Novo") to listOf("07h45", "11h35", "14h35", "16h05", "17h35"),
                    getStop("Ribeira das Tainhas") to listOf("07h55", "11h45", "14h45", "16h15", "17h45"),
                    getStop("Vila Franca") to listOf("08h05", "11h55", "14h55", "16h25", "17h55"),
                ), TypeOfDay.SUNDAY, img),
            ))
        /* Route 317 */
        route = "317"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"i", mapOf(
                    getStop("Furnas") to listOf("07h15", "12h10", "13h50", "16h20", "18h05"),
                    getStop("Ribeira Quente") to listOf("07h35", "12h30", "14h10", "16h40", "18h25"),
                ), TypeOfDay.WEEKDAY, img, Functions().school(currentLanguage)),
                Route(route, route+"v", mapOf(
                    getStop("Ribeira Quente") to listOf("07h40", "12h30", "14h15", "16h45", "18h30"),
                    getStop("Furnas") to listOf("08h00", "12h50", "14h30", "17h05", "18h50"),
                ), TypeOfDay.WEEKDAY, img, Functions().school(currentLanguage)),
                Route(route, route+"ii", mapOf(
                    getStop("Furnas") to listOf("07h40", "12h10", "18h05"),
                    getStop("Ribeira Quente") to listOf("08h00", "12h30", "18h25"),
                ), TypeOfDay.WEEKDAY, img, Functions().normal(currentLanguage)),
                Route(route, route+"vv", mapOf(
                    getStop("Ribeira Quente") to listOf("08h00", "12h30", "18h30"),
                    getStop("Furnas") to listOf("08h20", "12h50", "18h50"),
                ), TypeOfDay.WEEKDAY, img,  Functions().normal(currentLanguage)),
                Route(route, route+"vs", mapOf(
                    getStop("Furnas") to listOf("10h40", "16h40"),
                    getStop("Ribeira Quente") to listOf("11h00", "17h00"),
                ), TypeOfDay.SATURDAY, img,  Functions().julyToSep(currentLanguage)),
                Route(route, route+"is", mapOf(
                    getStop("Ribeira Quente") to listOf("11h00", "17h00"),
                    getStop("Furnas") to listOf("11h20", "17h20"),
                ), TypeOfDay.SATURDAY, img, Functions().julyToSep(currentLanguage)),
                Route(route, route+"vd", mapOf(
                    getStop("Furnas") to listOf("10h40", "16h40"),
                    getStop("Ribeira Quente") to listOf("11h00", "17h00"),
                ), TypeOfDay.SUNDAY, img, Functions().julyToSep(currentLanguage)),
                Route(route, route+"id", mapOf(
                    getStop("Ribeira Quente") to listOf("11h00", "17h00"),
                    getStop("Furnas") to listOf("11h20", "17h20"),
                ), TypeOfDay.SUNDAY, img,Functions().julyToSep(currentLanguage)),
            ))
        /* Route 326 */
        route = "326"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"v", mapOf(
                    getStop("Povoação") to listOf("16h10"),
                    getStop("Lomba do Alcaide") to listOf("16h20"),
                    getStop("Faial da Terra") to listOf("16h30"),
                    getStop("Agua Retorta") to listOf("16h40"),
                ), TypeOfDay.WEEKDAY, img, Functions().school(currentLanguage)),
                Route(route, route+"i", mapOf(
                    getStop("Agua Retorta") to listOf("07h30", "14h00"),
                    getStop("Faial da Terra") to listOf("07h40", "14h10"),
                    getStop("Lomba do Alcaide") to listOf("07h50", "14h20"),
                    getStop("Povoação") to listOf("08h00", "14h30"),
                ), TypeOfDay.WEEKDAY, img),
                Route(route, route+"vv", mapOf(
                    getStop("Povoação") to listOf("13h30", "18h00"),
                    getStop("Lomba do Alcaide") to listOf("13h40", "18h10"),
                    getStop("Faial da Terra") to listOf("13h50", "18h20"),
                    getStop("Agua Retorta") to listOf("14h00", "18h30"),
                ), TypeOfDay.WEEKDAY, img),
            ))
        /* Route 322 */
        route = "322"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"ie", mapOf(
                    getStop("Povoação") to listOf("07h25", "08h45", "12h30", "13h45", "16h10", "18h10"),
                    getStop("Lomba do Alcaide") to listOf("---", "---", "12h40", "13h55", "16h20", "---"),
                    getStop("Lomba do Loução") to listOf("07h40", "09h00", "12h45", "14h00", "16h25", "18h15"),
                ), TypeOfDay.WEEKDAY, img, Functions().school(currentLanguage)),
                Route(route, route+"vd", mapOf(
                    getStop("Povoação") to listOf("07h25", "09h10", "12h30", "16h00", "18h35"),
                    getStop("Lomba do Alcaide") to listOf("---", "---", "---", "16h10", "---"),
                    getStop("Lomba do Loução") to listOf("07h40", "09h25", "12h45", "16h15", "18h50"),
                ), TypeOfDay.WEEKDAY, img, Functions().normal(currentLanguage)),
                Route(route, route+"ve", mapOf(
                    getStop("Lomba do Loução") to listOf("07h40", "09h00", "13h00", "14h00", "16h45", "18h25"),
                    getStop("Povoação") to listOf("07h55", "09h15", "13h15", "14h15", "17h00", "18h40"),
                ), TypeOfDay.WEEKDAY, img, Functions().school(currentLanguage)),
                Route(route, route+"id", mapOf(
                    getStop("Lomba do Loução") to listOf("07h40", "09h30", "13h30", "16h20"),
                    getStop("Povoação") to listOf("07h55", "09h45", "13h45", "16h35"),
                ), TypeOfDay.WEEKDAY, img,Functions().normal(currentLanguage)),
            ))
        /* Route 324 */
        route = "324"
        varelaRoutes.addAll(
            arrayListOf(
                Route(route, route+"ve", mapOf(
                    getStop("Povoação") to listOf("07h30", "08h05", "11h50", "13h30", "13h50", "16h10", "16h30", "18h10"),
                    getStop("Lomba do Botão") to listOf("07h40", "08h15", "12h00", "13h40", "14h00", "16h20", "16h40", "18h20"),
                ), TypeOfDay.WEEKDAY, img, Functions().school(currentLanguage)),
                Route(route, route+"vn", mapOf(
                    getStop("Povoação") to listOf("08h00", "11h50", "18h10"),
                    getStop("Lomba do Botão") to listOf("08h10", "12h00", "18h20"),
                ), TypeOfDay.WEEKDAY, img, Functions().normal(currentLanguage)),
                Route(route, route+"ie", mapOf(
                    getStop("Lomba do Botão") to listOf("07h40", "08h15", "12h00", "13h40", "14h00", "16h20", "16h40", "18h20"),
                    getStop("Lomba do Pomar") to listOf("---", "08h20", "12h05", "13h45", "---", "16h25", "---", "18h25"),
                    getStop("Povoação") to listOf("07h50", "08h30", "12h15", "13h55", "14h10", "16h35", "16h50", "18h35"),
                ), TypeOfDay.WEEKDAY, img, Functions().school(currentLanguage)),
                Route(route, route+"in", mapOf(
                    getStop("Lomba do Botão") to listOf("08h10", "12h00", "18h20"),
                    getStop("Lomba do Pomar") to listOf("08h15", "12h05", "18h25"),
                    getStop("Povoação") to listOf("08h25", "12h15", "18h35"),
                ), TypeOfDay.WEEKDAY, img, Functions().normal(currentLanguage)),
                Route(route, route+"vo", mapOf(
                    getStop("Povoação") to listOf("08h00", "13h30", "16h10"),
                    getStop("Lomba do Carro") to listOf("08h10", "13h40", "16h20"),
                ), TypeOfDay.WEEKDAY, img, Functions().onlySchool(currentLanguage)),
                Route(route, route+"io", mapOf(
                    getStop("Lomba do Carro") to listOf("08h10", "13h40", "16h20"),
                    getStop("Povoação") to listOf("08h20", "13h50", "16h30"),
                ), TypeOfDay.WEEKDAY, img, Functions().onlySchool(currentLanguage)),
            ))
    }

    private fun loadCRP() {
        val img: Int = R.drawable.crp_logo
        /* Weekdays */
        /* Route 101 */
        var route = "101"
        crpRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("08h25", "17h15", "17h45", "18h15"),
                        getStop("Moviarte") to listOf("08h32", "17h22", "17h52", "18h22"),
                        getStop("Caldeirão") to listOf("08h40", "17h30", "18h00", "18h22"),
                        getStop("Ribeira Seca") to listOf("08h52", "17h41", "18h12", "18h42"),
                        getStop("Ribeirinha") to listOf("---", "18h00", "---", "19h00"),
                        getStop("Ribeira Grande") to listOf("08h55", "17h45", "18h15", "18h45"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route, route+"i", mapOf(
                        getStop("Ribeirinha") to listOf("07h00", "07h30", "08h00", "12h00"),
                        getStop("Ribeira Grande") to listOf("07h15", "07h45", "08h15", "12h15"),
                        getStop("Ribeira Seca") to listOf("07h18", "07h48", "08h18", "12h18"),
                        getStop("Caldeirão") to listOf("07h31", "08h01", "08h31", "12h31"),
                        getStop("Moviarte") to listOf("07h38", "08h08", "08h38", "12h38"),
                        getStop("Ponta Delgada") to listOf("07h50", "08h17", "08h50", "12h50"),
                    ), TypeOfDay.WEEKDAY, img),
            ))
        /* Route 102 */
        route = "102"
        crpRoutes.addAll(
            arrayListOf(
                Route(
                    route, route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("07h35", "08h15", "09h15", "11h30", "12h30", "13h30", "14h30", "15h30", "16h30", "17h30", "18h40", "19h15"),
                        getStop("Moviarte") to listOf("07h41", "08h21", "09h21", "11h36", "12h36", "13h36", "14h36", "15h36", "16h36", "17h36", "18h46", "19h21"),
                        getStop("Caldeirão") to listOf("07h51", "08h31", "09h31", "11h46", "12h46", "13h46", "14h46", "15h46", "16h46", "17h46", "18h56", "19h21"),
                        getStop("Pico da Pedra") to listOf("07h57", "08h37", "09h37", "11h52", "12h52", "13h52", "14h52", "15h52", "16h52", "17h52", "19h02", "19h37"),
                        getStop("Calhetas") to listOf("08h03", "08h43", "09h43", "11h58", "12h58", "13h58", "14h58", "15h58", "16h58", "17h58", "19h08", "19h43"),
                        getStop("Rabo de Peixe") to listOf("08h08", "08h48", "09h48", "12h03", "13h03", "15h03", "15h03", "16h03", "17h03", "18h03", "19h13", "19h48"),
                        getStop("Ribeira Grande") to listOf("08h20", "09h00", "10h00", "12h20", "13h15", "14h15", "15h15", "16h15", "17h15", "18h15", "19h25", "20h00"),
                        getStop("Ribeirinha") to listOf("08h30", "---", "---", "---", "12h30", "---", "---", "---", "---", "---", "---", "20h10"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route, route+"i", mapOf(
                        getStop("Maia - Escola") to listOf("---", "07h05", "---", "---", "---", "---", "---", "---", "---", "---", "---"),
                        getStop("São Brás") to listOf("---", "07h10", "---", "---", "---", "---", "---", "---", "---", "---", "---"),
                        getStop("Porto Formoso") to listOf("---", "07h13", "---", "---", "---", "---", "---", "---", "---", "---", "---"),
                        getStop("Ribeirinha") to listOf("---", "07h27", "---", "---", "---", "---", "12h30", "---", "---", "---", "---"),
                        getStop("Ribeira Grande") to listOf("---", "---", "07h45", "---", "10h00", "11h15", "12h45", "13h45", "14h45", "15h45", "16h45"),
                        getStop("Ribeira Seca") to listOf("---", "07h34", "---", "---", "---", "---", "---", "---", "---", "---", "---"),
                        getStop("Rabo de Peixe") to listOf("07h10", "---", "07h56", "09h00", "10h11", "11h26", "12h56", "13h56", "14h56", "15h56", "16h56"),
                        getStop("Calhetas") to listOf("07h14", "---", "08h00", "09h04", "10h15", "11h30", "13h00", "14h00", "15h00", "16h00", "17h00"),
                        getStop("Pico da Pedra") to listOf("07h20", "---", "08h05", "09h10", "10h20", "11h35", "13h05", "14h05", "15h05", "16h05", "17h05"),
                        getStop("Caldeirão") to listOf("07h25", "07h49", "08h10", "09h15", "10h25", "11h40", "13h10", "14h10", "15h10", "16h10", "17h10"),
                        getStop("Moviarte") to listOf("07h33", "07h57", "08h18", "09h23", "10h33", "11h48", "13h18", "14h18", "15h18", "16h18", "17h18"),
                        getStop("Ponta Delgada") to listOf("07h45", "08h10", "08h30", "09h35", "10h45", "12h00", "13h30", "14h30", "15h30", "16h30", "17h30"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route, route+"vs", mapOf(
                        getStop("Ponta Delgada") to listOf("08h15", "10h00", "13h30", "15h30", "17h30", "19h00"),
                        getStop("Moviarte") to listOf("08h21", "10h06", "13h36", "15h36", "17h36", "19h06"),
                        getStop("Caldeirão") to listOf("08h31", "10h16", "13h46", "15h46", "17h46", "19h16"),
                        getStop("Pico da Pedra") to listOf("08h37", "10h22", "13h52", "15h52", "17h52", "19h22"),
                        getStop("Calhetas") to listOf("08h43", "10h28", "13h58", "15h58", "17h58", "19h28"),
                        getStop("Rabo de Peixe") to listOf("08h48", "10h33", "14h03", "16h03", "18h03", "19h33"),
                        getStop("Ribeira Seca") to listOf("08h58", "10h43", "14h13", "16h13", "18h13", "19h43"),
                        getStop("Ribeira Grande") to listOf("09h00", "10h45", "14h15", "16h15", "18h15", "19h45"),
                        getStop("Ribeirinha") to listOf("09h07", "10h52", "14h22", "16h22", "18h22", "19h52"),
                        getStop("Porto Formoso") to listOf("09h15", "11h00", "14h30", "16h30", "18h30", "20h00"),
                        ), TypeOfDay.SATURDAY, img),
                Route(
                    route, route+"vd", mapOf(
                        getStop("Ponta Delgada") to listOf("08h30", "10h00", "12h30", "14h30", "16h30", "18h30"),
                        getStop("Moviarte") to listOf("08h36", "10h06", "12h36", "14h36", "16h36", "18h36"),
                        getStop("Caldeirão") to listOf("08h46", "10h16", "12h46", "14h46", "16h46", "18h46"),
                        getStop("Pico da Pedra") to listOf("08h52", "10h22", "12h52", "14h52", "16h52", "18h52"),
                        getStop("Calhetas") to listOf("08h58", "10h28", "12h58", "14h58", "16h58", "18h58"),
                        getStop("Rabo de Peixe") to listOf("09h03", "10h33", "13h03", "15h03", "17h03", "19h03"),
                        getStop("Ribeira Seca") to listOf("09h13", "10h43", "13h13", "15h13", "17h13", "19h13"),
                        getStop("Ribeira Grande") to listOf("09h15", "10h45", "13h15", "15h15", "17h15", "19h15"),
                        getStop("Ribeirinha") to listOf("09h22", "10h52", "13h22", "15h22", "17h22", "19h22"),
                        getStop("Porto Formoso") to listOf("09h30", "11h00", "13h30", "15h30", "17h30", "19h30"),
                    ), TypeOfDay.SUNDAY, img),
                Route(
                    route, route+"is", mapOf(
                        getStop("Gramas") to listOf("06h50", "---", "12h15", "15h15", "17h15"),
                        getStop("Ribeirinha") to listOf("06h58", "---", "12h23", "15h23", "17h23"),
                        getStop("Ribeira Grande") to listOf("07h05", "07h45", "12h30", "15h30", "17h30"),
                        getStop("Ribeira Seca") to listOf("07h07", "07h47", "12h32", "15h32", "17h32"),
                        getStop("Rabo de Peixe") to listOf("07h16", "07h56", "12h41", "15h41", "17h41"),
                        getStop("Calhetas") to listOf("07h20", "08h00", "12h45", "15h45", "17h45"),
                        getStop("Pico da Pedra") to listOf("07h25", "08h05", "12h50", "15h50", "17h50"),
                        getStop("Caldeirão") to listOf("07h30", "08h10", "12h55", "15h55", "17h55"),
                        getStop("Moviarte") to listOf("07h38", "08h18", "13h03", "16h03", "18h03"),
                        getStop("Ponta Delgada") to listOf("07h50", "08h30", "13h15", "16h15", "18h15"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route,  route+"id", mapOf(
                        getStop("Gramas") to listOf("06h50", "12h15", "14h30", "16h30"),
                        getStop("Ribeirinha") to listOf("06h58",  "12h23", "14h38", "16h38"),
                        getStop("Ribeira Grande") to listOf("07h05",  "12h30", "14h45", "16h45"),
                        getStop("Ribeira Seca") to listOf("07h07", "12h32", "14h47", "16h47"),
                        getStop("Rabo de Peixe") to listOf("07h16", "12h41", "14h56", "16h56"),
                        getStop("Calhetas") to listOf("07h20", "12h45", "15h00", "17h00"),
                        getStop("Pico da Pedra") to listOf("07h25", "12h50", "15h05", "17h05"),
                        getStop("Caldeirão") to listOf("07h30", "12h55", "15h10", "17h10"),
                        getStop("Moviarte") to listOf("07h38", "13h03", "15h18", "17h18"),
                        getStop("Ponta Delgada") to listOf("07h50", "13h15", "15h30", "17h30"),
                    ), TypeOfDay.SUNDAY, img),
                Route(
                    route, route+"rv", mapOf(
                        getStop("Ponta Delgada") to listOf("21h15", "23h15"),
                        getStop("Ponta Delgada - Hospital") to listOf("21h26", "23h26"),
                        getStop("Caldeirão") to listOf("21h33", "23h33"),
                        getStop("Pico da Pedra") to listOf("21h39", "23h39"),
                        getStop("Calhetas") to listOf("21h45", "23h45"),
                        getStop("Rabo de Peixe") to listOf("21h48", "23h48"),
                        getStop("Ribeira Seca") to listOf("21h57", "23h57"),
                        getStop("Ribeira Grande") to listOf("22h00", "00h00"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"ri",mapOf(
                        getStop("Ponta Delgada") to listOf("21h15", "23h15"),
                        getStop("Ponta Delgada - Hospital") to listOf("21h26", "23h26"),
                        getStop("Caldeirão") to listOf("21h33", "23h33"),
                        getStop("Pico da Pedra") to listOf("21h39", "23h39"),
                        getStop("Calhetas") to listOf("21h45", "23h45"),
                        getStop("Rabo de Peixe") to listOf("21h48", "23h48"),
                        getStop("Ribeira Seca") to listOf("21h57", "23h57"),
                        getStop("Ribeira Grande") to listOf("22h00", "00h00"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route, route+"rvd", mapOf(
                        getStop("Ponta Delgada") to listOf("21h15", "23h15"),
                        getStop("Ponta Delgada - Hospital") to listOf("21h26", "23h26"),
                        getStop("Caldeirão") to listOf("21h33", "23h33"),
                        getStop("Pico da Pedra") to listOf("21h39", "23h39"),
                        getStop("Calhetas") to listOf("21h45", "23h45"),
                        getStop("Rabo de Peixe") to listOf("21h48", "23h48"),
                        getStop("Ribeira Seca") to listOf("21h57", "23h57"),
                        getStop("Ribeira Grande") to listOf("22h00", "00h00"),
                    ), TypeOfDay.SUNDAY, img),
                Route(
                    route, route+"nvi", mapOf(
                        getStop("Ribeira Grande") to listOf("22h00"),
                        getStop("Ribeira Seca") to listOf("22h02"),
                        getStop("Rabo de Peixe") to listOf("22h11"),
                        getStop("Calhetas") to listOf("22h15"),
                        getStop("Pico da Pedra") to listOf("22h21"),
                        getStop("Caldeirão") to listOf("22h26"),
                        getStop("Ponta Delgada") to listOf("22h45"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"nis", mapOf(
                        getStop("Ribeira Grande") to listOf("22h00"),
                        getStop("Ribeira Seca") to listOf("22h02"),
                        getStop("Rabo de Peixe") to listOf("22h11"),
                        getStop("Calhetas") to listOf("22h15"),
                        getStop("Pico da Pedra") to listOf("22h21"),
                        getStop("Caldeirão") to listOf("22h26"),
                        getStop("Ponta Delgada") to listOf("22h45"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route,  route+"nid", mapOf(
                        getStop("Ribeira Grande") to listOf("22h00"),
                        getStop("Ribeira Seca") to listOf("22h02"),
                        getStop("Rabo de Peixe") to listOf("22h11"),
                        getStop("Calhetas") to listOf("22h15"),
                        getStop("Pico da Pedra") to listOf("22h21"),
                        getStop("Caldeirão") to listOf("22h26"),
                        getStop("Ponta Delgada") to listOf("22h45"),
                    ), TypeOfDay.SUNDAY, img),
            ))
        /* Route 105 */
        route = "105"
        crpRoutes.addAll(
            arrayListOf(
                Route(
                    route,  route+"ri", mapOf(
                        getStop("Vila do Nordeste") to listOf("11h00", "15h00"),
                        getStop("Lomba da Pedreira") to listOf("11h15", "15h15"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"rv",mapOf(
                        getStop("Lomba da Pedreira") to listOf("09h15", "15h15"),
                        getStop("Vila do Nordeste") to listOf("09h30", "15h30"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("06h45", "16h15"),
                        getStop("Moviarte") to listOf("06h52", "16h22"),
                        getStop("Caldeirão") to listOf("07h00", "16h30"),
                        getStop("Ribeira Seca") to listOf("07h16", "16h46"),
                        getStop("Ribeira Grande") to listOf("07h20", "16h50"),
                        getStop("Ribeirinha") to listOf("07h25", "16h55"),
                        getStop("São Brás") to listOf("07h40", "17h10"),
                        getStop("Maia - Largo S.António") to listOf("07h45", "17h15"),
                        getStop("Lomba da Maia") to listOf("07h55", "17h25"),
                        getStop("Fenais da Ajuda") to listOf("08h02", "17h32"),
                        getStop("Lomba de S.Pedro") to listOf("08h07", "17h37"),
                        getStop("Salga") to listOf("08h12", "17h42"),
                        getStop("Lomba da Achadinha") to listOf("08h17", "17h47"),
                        getStop("Achada") to listOf("08h26", "17h567"),
                        getStop("Algarvia") to listOf("08h35", "18h05"),
                        getStop("Santo António Nordestinho") to listOf("08h40", "18h10"),
                        getStop("São Pedro Nordestinho") to listOf("08h45", "18h15"),
                        getStop("Lomba da Fazenda") to listOf("08h50", "18h20"),
                        getStop("Lomba da Cruz") to listOf("08h54", "18h24"),
                        getStop("Vila do Nordeste") to listOf("09h00", "18h30"),
                        getStop("Lomba da Pedreira") to listOf("09h15", "18h45"),
                        ), TypeOfDay.WEEKDAY, img),
                /**
                Route(
                    route+"b",  route+"i", mapOf(
                        getStop("Ponta Delgada") to listOf("18h30b"),
                        getStop("Moviarte") to listOf("18h37b"),
                        getStop("Caldeirão") to listOf("18h45b"),
                        getStop("Ribeira Seca") to listOf("19h01b"),
                        getStop("Ribeira Grande") to listOf("19h05b"),
                        getStop("Ribeirinha") to listOf("19h10b"),
                        getStop("São Brás") to listOf("19h25b"),
                        getStop("Maia - Largo S.António") to listOf("19h30b"),
                        getStop("Lomba da Maia") to listOf("19h40b"),
                        getStop("Fenais da Ajuda") to listOf("19h47b"),
                        getStop("Lomba de S.Pedro") to listOf("19h52b"),
                        getStop("Salga") to listOf("19h47b"),
                        getStop("Lomba da Achadinha") to listOf("20h02b"),
                        getStop("Achada") to listOf("20h11b"),
                        getStop("Algarvia") to listOf("20h20b"),
                        getStop("Santo António Nordestinho") to listOf("20h25b"),
                        getStop("São Pedro Nordestinho") to listOf("20h30b"),
                        getStop("Lomba da Fazenda") to listOf("20h35b"),
                        getStop("Lomba da Cruz") to listOf("20h39b"),
                        getStop("Vila do Nordeste") to listOf("20h45b"),
                    ), TypeOfDay.WEEKDAY, img, "b) " + Functions().justFriday(currentLanguage)),
                 **/
                Route(
                    route, route+"ov", mapOf(
                        getStop("Lomba da Pedreira") to listOf("06h30"),
                        getStop("Vila do Nordeste") to listOf("06h45"),
                        getStop("Lomba da Cruz") to listOf("06h51"),
                        getStop("Lomba da Fazenda") to listOf("06h55"),
                        getStop("São Pedro Nordestinho") to listOf("07h00"),
                        getStop("Santo António Nordestinho") to listOf("07h05"),
                        getStop("Algarvia") to listOf("07h10"),
                        getStop("Achada") to listOf("07h19"),
                        getStop("Lomba da Achadinha") to listOf("07h28"),
                        getStop("Salga") to listOf("07h33"),
                        getStop("Lomba de S.Pedro") to listOf("07h38"),
                        getStop("Fenais da Ajuda") to listOf("07h43"),
                        getStop("Lomba da Maia") to listOf("07h50"),
                        getStop("Gorreana") to listOf("07h58"),
                        getStop("São Brás") to listOf("08h05"),
                        getStop("Ribeirinha") to listOf("08h30"),
                        getStop("Ribeira Grande") to listOf("08h45"),
                        getStop("Ribeira Seca") to listOf("08h49"),
                        getStop("Caldeirão") to listOf("09h00"),
                        getStop("Moviarte") to listOf("09h08"),
                        getStop("Ponta Delgada") to listOf("09h15"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"oi", mapOf(
                        getStop("Ponta Delgada") to listOf("06h45"),
                        getStop("Moviarte") to listOf("06h52"),
                        getStop("Caldeirão") to listOf("07h00"),
                        getStop("Ribeira Seca") to listOf("07h21"),
                        getStop("Ribeira Grande") to listOf("07h24"),
                        getStop("Ribeirinha") to listOf("07h29"),
                        getStop("Maia - Escola") to listOf("07h50"),
                        getStop("Maia - Largo S.António") to listOf("07h52"),
                        getStop("Lomba da Maia") to listOf("08h03"),
                        getStop("Fenais da Ajuda") to listOf("08h10"),
                        getStop("Lomba de S.Pedro") to listOf("08h15"),
                        getStop("Salga") to listOf("08h22"),
                        getStop("Lomba da Achadinha") to listOf("08h27"),
                        getStop("Achada") to listOf("08h36"),
                        getStop("Algarvia") to listOf("08h43"),
                        getStop("Santo António Nordestinho") to listOf("08h49"),
                        getStop("São Pedro Nordestinho") to listOf("08h53"),
                        getStop("Lomba da Fazenda") to listOf("08h57"),
                        getStop("Lomba da Cruz") to listOf("09h02"),
                        getStop("Vila do Nordeste") to listOf("09h08"),
                        getStop("Lomba da Pedreira") to listOf("09h15"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route,  route+"is",mapOf(
                        getStop("Lomba da Pedreira") to listOf("06h30"),
                        getStop("Vila do Nordeste") to listOf("06h45"),
                        getStop("Lomba da Cruz") to listOf("06h58"),
                        getStop("Lomba da Fazenda") to listOf("07h03"),
                        getStop("São Pedro Nordestinho") to listOf("07h07"),
                        getStop("Santo António Nordestinho") to listOf("07h11"),
                        getStop("Algarvia") to listOf("07h17"),
                        getStop("Achada") to listOf("07h24"),
                        getStop("Lomba da Achadinha") to listOf("07h32"),
                        getStop("Salga") to listOf("07h38"),
                        getStop("Lomba de S.Pedro") to listOf("07h42"),
                        getStop("Fenais da Ajuda") to listOf("07h46"),
                        getStop("Lomba da Maia") to listOf("07h56"),
                        getStop("Gorreana") to listOf("08h06"),
                        getStop("São Brás") to listOf("08h09"),
                        getStop("Ribeirinha") to listOf("08h29"),
                        getStop("Ribeira Grande") to listOf("08h45"),
                        getStop("Ribeira Seca") to listOf("08h47"),
                        getStop("Caldeirão") to listOf("08h54"),
                        getStop("Moviarte") to listOf("09h02"),
                        getStop("Ponta Delgada") to listOf("09h15"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route,  route+"vd", mapOf(
                        getStop("Ponta Delgada") to listOf("06h45"),
                        getStop("Moviarte") to listOf("06h58"),
                        getStop("Caldeirão") to listOf("07h00"),
                        getStop("Ribeira Seca") to listOf("07h21"),
                        getStop("Ribeira Grande") to listOf("07h24"),
                        getStop("Ribeirinha") to listOf("07h29"),
                        getStop("Maia - Escola") to listOf("07h50"),
                        getStop("Maia - Largo S.António") to listOf("07h52"),
                        getStop("Lomba da Maia") to listOf("08h03"),
                        getStop("Fenais da Ajuda") to listOf("08h10"),
                        getStop("Lomba de S.Pedro") to listOf("08h15"),
                        getStop("Salga") to listOf("08h22"),
                        getStop("Lomba da Achadinha") to listOf("08h27"),
                        getStop("Achada") to listOf("08h36"),
                        getStop("Algarvia") to listOf("08h43"),
                        getStop("Santo António Nordestinho") to listOf("08h49"),
                        getStop("São Pedro Nordestinho") to listOf("08h53"),
                        getStop("Lomba da Fazenda") to listOf("08h57"),
                        getStop("Lomba da Cruz") to listOf("09h02"),
                        getStop("Vila do Nordeste") to listOf("09h08"),
                        getStop("Lomba da Pedreira") to listOf("09h15"),
                    ), TypeOfDay.SUNDAY, img),
                ))
        /* Route 106 */
        route = "106"
        crpRoutes.addAll(
            arrayListOf(
                Route(
                    route,  route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("11h00"),
                        getStop("Moviarte") to listOf("11h07"),
                        getStop("Caldeirão") to listOf("11h15"),
                        getStop("Ribeira Seca") to listOf("11h31"),
                        getStop("Ribeira Grande") to listOf("11h35"),
                        getStop("Ribeirinha") to listOf("11h40"),
                        getStop("São Brás") to listOf("11h55"),
                        getStop("Maia - Largo S.António") to listOf("12h00"),
                        getStop("Lomba da Maia") to listOf("12h10"),
                        getStop("Fenais da Ajuda") to listOf("12h17"),
                        getStop("Lomba de S.Pedro") to listOf("12h22"),
                        getStop("Salga") to listOf("12h27"),
                        getStop("Lomba da Achadinha") to listOf("12h32"),
                        getStop("Achada") to listOf("12h41"),
                        getStop("Algarvia") to listOf("12h50"),
                        getStop("Santo António Nordestinho") to listOf("12h55"),
                        getStop("São Pedro Nordestinho") to listOf("13h00"),
                        getStop("Lomba da Fazenda") to listOf("13h05"),
                        getStop("Lomba da Cruz") to listOf("13h09"),
                        getStop("Vila do Nordeste") to listOf("13h15"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"i", mapOf(
                        getStop("Lomba da Pedreira") to listOf("11h15"),
                        getStop("Vila do Nordeste") to listOf("11h30"),
                        getStop("Lomba da Cruz") to listOf("11h36"),
                        getStop("Lomba da Fazenda") to listOf("11h40"),
                        getStop("São Pedro Nordestinho") to listOf("11h45"),
                        getStop("Santo António Nordestinho") to listOf("11h50"),
                        getStop("Algarvia") to listOf("11h55"),
                        getStop("Achada") to listOf("12h04"),
                        getStop("Lomba da Achadinha") to listOf("12h13"),
                        getStop("Salga") to listOf("12h18"),
                        getStop("Lomba de S.Pedro") to listOf("12h23"),
                        getStop("Fenais da Ajuda") to listOf("12h28"),
                        getStop("Lomba da Maia") to listOf("12h35"),
                        getStop("Maia - Largo S.António") to listOf("12h45"),
                        getStop("São Brás") to listOf("12h50"),
                        getStop("Ribeirinha") to listOf("13h15"),
                        getStop("Ribeira Grande") to listOf("13h30"),
                        getStop("Ribeira Seca") to listOf("13h39"),
                        getStop("Caldeirão") to listOf("13h50"),
                        getStop("Moviarte") to listOf("13h58"),
                        getStop("Ponta Delgada") to listOf("14h00"),
                    ), TypeOfDay.WEEKDAY, img),
                ))
        /* Route 107 */
        route = "107"
        crpRoutes.addAll(
            arrayListOf(
                Route(
                    route,  route+"vs", mapOf(
                        getStop("Ponta Delgada") to listOf("16h15"),
                        getStop("Moviarte") to listOf("16h22"),
                        getStop("Caldeirão") to listOf("16h30"),
                        getStop("Ribeira Seca") to listOf("16h51"),
                        getStop("Ribeira Grande") to listOf("16h54"),
                        getStop("Ribeirinha") to listOf("16h59"),
                        getStop("São Brás") to listOf("17h17"),
                        getStop("Maia - Escola") to listOf("17h20"),
                        getStop("Gorreana") to listOf("17h25"),
                        getStop("Lomba da Maia") to listOf("17h33"),
                        getStop("Fenais da Ajuda") to listOf("17h40"),
                        getStop("Lomba de S.Pedro") to listOf("17h45"),
                        getStop("Salga") to listOf("17h52"),
                        getStop("Lomba da Achadinha") to listOf("17h57"),
                        getStop("Achada") to listOf("18h06"),
                        getStop("Algarvia") to listOf("18h13"),
                        getStop("Santo António Nordestinho") to listOf("18h19"),
                        getStop("São Pedro Nordestinho") to listOf("18h23"),
                        getStop("Lomba da Fazenda") to listOf("18h27"),
                        getStop("Lomba da Cruz") to listOf("18h32"),
                        getStop("Vila do Nordeste") to listOf("18h38"),
                        getStop("Lomba da Pedreira") to listOf("18h45"),
                        ), TypeOfDay.SATURDAY, img),
                Route(
                    route,  route+"i", mapOf(
                        getStop("Vila do Nordeste") to listOf("16h15"),
                        getStop("Lomba da Cruz") to listOf("16h21"),
                        getStop("Lomba da Fazenda") to listOf("16h25"),
                        getStop("São Pedro Nordestinho") to listOf("16h35"),
                        getStop("Santo António Nordestinho") to listOf("16h40"),
                        getStop("Algarvia") to listOf("16h45"),
                        getStop("Achada") to listOf("16h54"),
                        getStop("Lomba da Achadinha") to listOf("17h03"),
                        getStop("Salga") to listOf("17h08"),
                        getStop("Lomba de S.Pedro") to listOf("17h13"),
                        getStop("Fenais da Ajuda") to listOf("17h18"),
                        getStop("Lomba da Maia") to listOf("17h25"),
                        getStop("Maia - Largo S.António") to listOf("17h35"),
                        getStop("São Brás") to listOf("17h40"),
                        getStop("Porto Formoso") to listOf("17h45"),
                        getStop("Ribeirinha") to listOf("18h10"),
                        getStop("Ribeira Grande") to listOf("18h30"),
                        getStop("Ribeira Seca") to listOf("18h39"),
                        getStop("Caldeirão") to listOf("18h50"),
                        getStop("Moviarte") to listOf("18h58"),
                        getStop("Ponta Delgada") to listOf("19h05"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"is", mapOf(
                        getStop("Lomba da Pedreira") to listOf("14h30"),
                        getStop("Vila do Nordeste") to listOf("14h37"),
                        getStop("Lomba da Cruz") to listOf("14h43"),
                        getStop("Lomba da Fazenda") to listOf("14h48"),
                        getStop("São Pedro Nordestinho") to listOf("14h52"),
                        getStop("Santo António Nordestinho") to listOf("14h56"),
                        getStop("Algarvia") to listOf("15h02"),
                        getStop("Achada") to listOf("15h09"),
                        getStop("Lomba da Achadinha") to listOf("15h17"),
                        getStop("Salga") to listOf("15h23"),
                        getStop("Lomba de S.Pedro") to listOf("15h27"),
                        getStop("Fenais da Ajuda") to listOf("15h31"),
                        getStop("Lomba da Maia") to listOf("15h41"),
                        getStop("Maia - Largo S.António") to listOf("15h49"),
                        getStop("São Brás") to listOf("15h53"),
                        getStop("Porto Formoso") to listOf("15h56"),
                        getStop("Ribeirinha") to listOf("16h14"),
                        getStop("Ribeira Grande") to listOf("16h18"),
                        getStop("Ribeira Seca") to listOf("16h22"),
                        getStop("Caldeirão") to listOf("16h39"),
                        getStop("Moviarte") to listOf("16h47"),
                        getStop("Ponta Delgada") to listOf("17h00"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route,  route+"vd", mapOf(
                        getStop("Ponta Delgada") to listOf("16h15"),
                        getStop("Moviarte") to listOf("16h22"),
                        getStop("Caldeirão") to listOf("16h30"),
                        getStop("Ribeira Seca") to listOf("16h51"),
                        getStop("Ribeira Grande") to listOf("16h54"),
                        getStop("Ribeirinha") to listOf("16h59"),
                        getStop("São Brás") to listOf("17h17"),
                        getStop("Maia - Escola") to listOf("17h20"),
                        getStop("Gorreana") to listOf("17h25"),
                        getStop("Lomba da Maia") to listOf("17h33"),
                        getStop("Fenais da Ajuda") to listOf("17h40"),
                        getStop("Lomba de S.Pedro") to listOf("17h45"),
                        getStop("Salga") to listOf("17h52"),
                        getStop("Lomba da Achadinha") to listOf("17h57"),
                        getStop("Achada") to listOf("18h06"),
                        getStop("Algarvia") to listOf("18h13"),
                        getStop("Santo António Nordestinho") to listOf("18h19"),
                        getStop("São Pedro Nordestinho") to listOf("18h23"),
                        getStop("Lomba da Fazenda") to listOf("18h27"),
                        getStop("Lomba da Cruz") to listOf("18h32"),
                        getStop("Vila do Nordeste") to listOf("18h38"),
                        getStop("Lomba da Pedreira") to listOf("18h45"),
                    ), TypeOfDay.SUNDAY, img),
                Route(
                    route,  route+"id",mapOf(
                        getStop("Lomba da Pedreira") to listOf("06h30", "16h15"),
                        getStop("Vila do Nordeste") to listOf("06h45","16h16"),
                        getStop("Lomba da Cruz") to listOf("06h58","16h17"),
                        getStop("Lomba da Fazenda") to listOf("07h03","16h22"),
                        getStop("São Pedro Nordestinho") to listOf("07h07","16h30"),
                        getStop("Santo António Nordestinho") to listOf("07h11","16h51"),
                        getStop("Algarvia") to listOf("07h17","16h52"),
                        getStop("Achada") to listOf("07h24","16h54"),
                        getStop("Lomba da Achadinha") to listOf("07h32","16h59"),
                        getStop("Salga") to listOf("07h38","17h17"),
                        getStop("Lomba de S.Pedro") to listOf("07h42","17h20"),
                        getStop("Fenais da Ajuda") to listOf("07h46","17h26"),
                        getStop("Lomba da Maia") to listOf("07h56","17h36"),
                        getStop("Maia - Largo S.António") to listOf("08h04", "17h44"),
                        getStop("São Brás") to listOf("08h08", "17h52"),
                        getStop("Porto Formoso") to listOf("08h11", "17h57"),
                        getStop("Ribeirinha") to listOf("08h29","18h06"),
                        getStop("Ribeira Grande") to listOf("08h45","18h13"),
                        getStop("Ribeira Seca") to listOf("08h47","18h23"),
                        getStop("Caldeirão") to listOf("08h54","18h27"),
                        getStop("Moviarte") to listOf("09h02","18h31"),
                        getStop("Ponta Delgada") to listOf("09h15","18h45"),
                    ), TypeOfDay.SUNDAY, img),
            ))
        /* Route 108 */
        route = "108"
        crpRoutes.addAll(
            arrayListOf(
                Route(
                    route,  route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("12h00", "16h15"),
                        getStop("Moviarte") to listOf("12h07", "16h22"),
                        getStop("Caldeirão") to listOf("12h15", "16h30"),
                        getStop("Ribeira Seca") to listOf("12h32", "16h47"),
                        getStop("Ribeira Grande") to listOf("12h35", "16h50"),
                        getStop("Ribeirinha") to listOf("12h39", "16h54"),
                        getStop("Porto Formoso") to listOf("12h57", "17h12"),
                        getStop("São Brás") to listOf("13h00", "17h15"),
                        getStop("Maia - Escola") to listOf("13h05", "17h20"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"i", mapOf(
                        getStop("Maia - Escola") to listOf("13h50"),
                        getStop("São Brás") to listOf("13h55"),
                        getStop("Porto Formoso") to listOf("13h58"),
                        getStop("Ribeirinha") to listOf("14h12"),
                        getStop("Ribeira Grande") to listOf("14h30"),
                        getStop("Ribeira Seca") to listOf("14h33"),
                        getStop("Caldeirão") to listOf("14h47"),
                        getStop("Moviarte") to listOf("14h51"),
                        getStop("Ponta Delgada") to listOf("14h55"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"is", mapOf(
                        getStop("Maia - Escola") to listOf("07h05"),
                        getStop("São Brás") to listOf("07h10"),
                        getStop("Porto Formoso") to listOf("07h13"),
                        getStop("Ribeirinha") to listOf("07h27"),
                        getStop("Ribeira Grande") to listOf("07h31"),
                        getStop("Ribeira Seca") to listOf("07h34"),
                        getStop("Caldeirão") to listOf("07h49"),
                        getStop("Moviarte") to listOf("07h57"),
                        getStop("Ponta Delgada") to listOf("08h10"),
                    ), TypeOfDay.SATURDAY, img),
            ))
        /* Route 112 */
        route = "112"
        crpRoutes.addAll(
            arrayListOf(
                Route(
                    route,  route+"i", mapOf(
                        getStop("Fenais da Ajuda") to listOf("07h15"),
                        getStop("Lomba da Maia") to listOf("07h20"),
                        getStop("Gorreana") to listOf("07h30"),
                        getStop("Maia - Largo S.António") to listOf("07h38"),
                        getStop("São Brás") to listOf("07h43"),
                        getStop("Ribeirinha") to listOf("07h58"),
                        getStop("Ribeira Grande") to listOf("08h15"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"vs",mapOf(
                        getStop("Ponta Delgada") to listOf("12h00"),
                        getStop("Moviarte") to listOf("12h06"),
                        getStop("Caldeirão") to listOf("12h16"),
                        getStop("Pico da Pedra") to listOf("12h22"),
                        getStop("Calhetas") to listOf("12h28"),
                        getStop("Rabo de Peixe") to listOf("12h33"),
                        getStop("Ribeira Seca") to listOf("12h43"),
                        getStop("Ribeira Grande") to listOf("12h45"),
                        getStop("Ribeirinha") to listOf("12h49"),
                        getStop("São Brás") to listOf("13h05"),
                        getStop("Maia - Escola") to listOf("13h11"),
                        getStop("Maia - Largo S.António") to listOf("13h16"),
                        getStop("Gorreana") to listOf("13h24"),
                        getStop("Lomba da Maia") to listOf("13h34"),
                        getStop("Fenais da Ajuda") to listOf("13h38"),
                        ), TypeOfDay.SATURDAY, img),
            ))
        /* Route 113 */
        route = "113"
        crpRoutes.addAll(
            arrayListOf(
                Route(
                    route,  route+"i", mapOf(
                        getStop("Maia - Largo S.António") to listOf("08h16"),
                        getStop("Lomba da Maia") to listOf("08h24"),
                        getStop("Lomba de S.Pedro") to listOf("09h39"),
                        ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("18h15"),
                        getStop("Moviarte") to listOf("18h23"),
                        getStop("Caldeirão") to listOf("18h31"),
                        getStop("Ribeira Seca") to listOf("18h52"),
                        getStop("Ribeira Grande") to listOf("19h06"),
                        getStop("Ribeirinha") to listOf("19h12"),
                        getStop("Porto Formoso") to listOf("19h31"),
                        getStop("São Brás") to listOf("19h35"),
                        getStop("Maia - Largo S.António") to listOf("19h15"),
                        getStop("Lomba da Maia") to listOf("19h23"),
                        getStop("Lomba de S.Pedro") to listOf("20h38"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"rv",  mapOf(
                        getStop("Fenais da Ajuda") to listOf("09h40", "---"),
                        getStop("Lomba da Maia") to listOf("09h45", "---"),
                        getStop("Gorreana") to listOf("09h55", "---"),
                        getStop("Maia - Largo S.António") to listOf("10h03", "---"),
                        getStop("São Brás") to listOf("10h08", "---"),
                        getStop("Porto Formoso") to listOf("10h12", "---"),
                        getStop("Ribeirinha") to listOf("10h31", "---"),
                        getStop("Ribeira Grande") to listOf("11h00", "17h45"),
                        getStop("Ribeira Seca") to listOf("11h04", "---"),
                        getStop("Rabo de Peixe") to listOf("---", "17h56"),
                        getStop("Calhetas") to listOf("---", "18h00"),
                        getStop("Pico da Pedra") to listOf("---", "18h05"),
                        getStop("Caldeirão") to listOf("11h24", "18h10"),
                        getStop("Moviarte") to listOf("11h32", "18h18"),
                        getStop("Ponta Delgada") to listOf("11h46", "18h30"),
                    ), TypeOfDay.WEEKDAY, img),
            ))
        /* Route 104 */
        route = "104"
        crpRoutes.addAll(
            arrayListOf(
                Route(
                    route,  route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("07h30", "08h40", "09h15", "10h15", "11h15", "12h00", "13h40", "14h30", "15h40", "16h30", "17h15", "18h40", "19h20"),
                        getStop("São Roque") to listOf("07h39", "08h49", "09h24", "10h24", "11h24", "12h09", "13h49", "14h39", "15h49", "16h39", "17h24", "18h49", "19h29"),
                        getStop("Livramento") to listOf("07h43", "08h53", "09h28", "10h28", "11h28", "12h13", "13h53", "14h43", "15h53", "16h43", "17h28", "18h53", "19h33"),
                        getStop("Pico do Fogo") to listOf("07h50", "09h00", "09h35", "10h35", "11h35", "12h20", "14h00", "14h50", "16h00", "16h50", "17h35", "19h00", "19h40"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"i", mapOf(
                        getStop("Pico do Fogo") to listOf("07h05", "08h00", "08h45", "09h05", "09h40",  "12h00", "13h20", "13h45", "14h20", "15h05", "16h10", "17h10", "18h25"),
                        getStop("Livramento") to listOf("07h09", "08h04", "08h49", "09h09", "09h44",  "12h04", "13h24", "13h49", "14h24", "15h09", "16h14", "17h14", "18h29"),
                        getStop("São Roque") to listOf("07h12", "08h07", "08h52", "09h12", "09h47", "12h07", "13h27", "13h52", "14h27", "15h12", "16h17", "17h17", "18h32"),
                        getStop("Ponta Delgada") to listOf("07h25", "08h20", "09h05", "09h25", "10h00",  "12h20", "13h40", "14h05", "14h40", "15h25", "16h30", "17h30", "18h45"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"rv", mapOf(
                        getStop("Ponta Delgada") to listOf("07h30", "08h40", "09h15", "10h15", "11h15", "13h05", "14h30", "17h15", "19h20"),
                        getStop("São Roque") to listOf("07h39", "08h49", "09h24", "10h24", "11h24", "13h14", "14h39", "17h24", "19h29"),
                        getStop("Livramento") to listOf("07h43", "08h53", "09h28", "10h28", "11h28", "13h18", "14h43",  "17h28",  "19h33"),
                        getStop("Pico do Fogo") to listOf("07h50", "09h00", "09h35", "10h35", "11h35",  "13h25", "14h50",  "17h35", "19h40"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route,  route+"is", mapOf(
                        getStop("Pico do Fogo") to listOf("07h05", "08h00", "09h05", "10h20", "12h00", "13h30", "15h05", "18h10"),
                        getStop("Livramento") to listOf("07h09", "08h04", "09h09", "10h24", "12h04", "13h34", "15h09", "18h14"),
                        getStop("São Roque") to listOf("07h12", "08h07", "09h12", "10h27", "12h07", "13h37", "15h12", "18h17"),
                        getStop("Ponta Delgada") to listOf("07h25", "08h20", "09h25", "10h40",  "12h20", "13h50",  "15h25", "18h30"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route,   route+"vd",mapOf(
                        getStop("Ponta Delgada") to listOf("08h45", "10h15", "12h30", "14h30", "16h30", "19h20"),
                        getStop("São Roque") to listOf("08h54", "10h24", "12h39", "14h39", "16h39", "19h29"),
                        getStop("Livramento") to listOf("08h58", "10h28", "12h43", "14h43", "16h43", "19h33"),
                        getStop("Pico do Fogo") to listOf("09h05", "10h35", "12h50", "14h50", "16h50", "19h40"),
                    ), TypeOfDay.SUNDAY, img),
                Route(
                    route,   route+"id", mapOf(
                        getStop("Pico do Fogo") to listOf("07h30", "09h10", "13h10", "15h10", "17h10"),
                        getStop("Livramento") to listOf("07h34", "09h14", "13h14", "15h14", "17h14"),
                        getStop("São Roque") to listOf("07h37", "09h17", "13h17", "15h17", "17h17"),
                        getStop("Ponta Delgada") to listOf("07h50", "09h30", "13h30", "15h30", "17h30"),
                    ), TypeOfDay.SUNDAY, img),
            ))
        /* Route 103 */
        route = "103"
        crpRoutes.addAll(
            arrayListOf(
                Route(
                    route,   route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("12h20", "18h10", "17h40"),
                        getStop("São Roque") to listOf("12h29", "18h19", "17h49"),
                        getStop("Livramento") to listOf("12h33", "18h23", "17h53"),
                        getStop("Pico do Fogo") to listOf("12h40", "18h30", "18h00"),
                        getStop("Cabouco") to listOf("12h47", "18h37", "18h07"),
                        getStop("Santa Bárbara - Ribeira Grande") to listOf("12h55", "18h45", "18h15"),
                        getStop("Ribeira Seca") to listOf("13h05", "18h55", "---"),
                        getStop("Ribeira Grande") to listOf("13h10", "19h00", "---"),
                        ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,   route+"i", mapOf(
                        getStop("Ribeira Grande") to listOf("---", "07h50", "12h10", "16h00"),
                        getStop("Ribeira Seca") to listOf("---", "07h54", "12h14", "16h04"),
                        getStop("Santa Bárbara - Ribeira Grande") to listOf("07h00", "08h00", "12h20", "16h10"),
                        getStop("Cabouco") to listOf("07h17", "08h17", "12h37", "16h27"),
                        getStop("Pico do Fogo") to listOf("07h24", "08h24", "12h44", "16h34"),
                        getStop("Livramento") to listOf("07h31", "08h31", "12h51", "16h41"),
                        getStop("São Roque") to listOf("07h35", "08h35", "12h55", "16h45"),
                        getStop("Ponta Delgada") to listOf("07h50", "08h50", "13h10", "17h00"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,   route+"vs",mapOf(
                        getStop("Ponta Delgada") to listOf("12h20"),
                        getStop("São Roque") to listOf("12h29"),
                        getStop("Livramento") to listOf("12h33"),
                        getStop("Pico do Fogo") to listOf("12h40"),
                        getStop("Cabouco") to listOf("12h47"),
                        getStop("Santa Bárbara - Ribeira Grande") to listOf("12h55"),
                        getStop("Ribeira Seca") to listOf("13h05"),
                        getStop("Ribeira Grande") to listOf("13h10"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route,  route+"is", mapOf(
                        getStop("Ribeira Grande") to listOf("07h50"),
                        getStop("Ribeira Seca") to listOf("07h54"),
                        getStop("Santa Bárbara - Ribeira Grande") to listOf("08h00"),
                        getStop("Cabouco") to listOf("08h17"),
                        getStop("Pico do Fogo") to listOf("08h24"),
                        getStop("Livramento") to listOf("08h31"),
                        getStop("São Roque") to listOf("08h35"),
                        getStop("Ponta Delgada") to listOf("08h50"),
                    ), TypeOfDay.SATURDAY, img),
            ))
        /* Route 115 */
        route = "115"
        crpRoutes.addAll(
            arrayListOf(
                Route(
                    route,  route+"i", mapOf(
                        getStop("Salga") to listOf("07h25*"),
                        getStop("Lomba da Achadinha") to listOf("07h31*"),
                        getStop("Achada") to listOf("07h41*"),
                        getStop("Algarvia") to listOf("07h48*"),
                        getStop("Santo António Nordestinho") to listOf("07h54*"),
                        getStop("São Pedro Nordestinho") to listOf("07h58*"),
                        getStop("Lomba da Fazenda") to listOf("08h03*"),
                        getStop("Lomba da Cruz") to listOf("08h07*"),
                        getStop("Vila do Nordeste") to listOf("08h14*"),
                        getStop("Lomba da Pedreira") to listOf("08h23*"),
                        getStop("Faial da Terra") to listOf("08h51*"),
                        getStop("Lomba do Alcaide") to listOf("09h10*"),
                        getStop("Povoação") to listOf("09h25*"),
                        ), TypeOfDay.WEEKDAY, img, Functions().onlyTT(currentLanguage)),
                Route(
                    route,  route+"v", mapOf(
                        getStop("Salga") to listOf("16h00*"),
                        getStop("Lomba da Achadinha") to listOf("16h11*"),
                        getStop("Achada") to listOf("16h30*"),
                        getStop("Algarvia") to listOf("17h02*"),
                        getStop("Santo António Nordestinho") to listOf("17h11*"),
                        getStop("São Pedro Nordestinho") to listOf("17h18*"),
                        getStop("Lomba da Fazenda") to listOf("17h22*"),
                        getStop("Lomba da Cruz") to listOf("17h27*"),
                        getStop("Vila do Nordeste") to listOf("17h31*"),
                        getStop("Lomba da Pedreira") to listOf("17h37*"),
                        getStop("Faial da Terra") to listOf("17h44*"),
                        getStop("Lomba do Alcaide") to listOf("17h54*"),
                        getStop("Povoação") to listOf("18h00*"),
                    ), TypeOfDay.WEEKDAY, img, Functions().onlyTT(currentLanguage)),
            ))
        /* Route 110 */
        route = "110"
        crpRoutes.addAll(
            arrayListOf(
                Route(
                    route,  route+"v", mapOf(
                        getStop("Ponta Delgada") to listOf("07h15", "15h15"),
                        getStop("Moviarte") to listOf("07h22", "15h22"),
                        getStop("Caldeirão") to listOf("07h30", "15h30"),
                        getStop("Ribeira Seca") to listOf("07h43", "15h43"),
                        getStop("Ribeira Grande") to listOf("07h45", "15h45"),
                        getStop("Ribeirinha") to listOf("07h50", "15h50"),
                        getStop("Porto Formoso") to listOf("08h09", "16h09"),
                        getStop("São Brás") to listOf("08h11", "16h11"),
                        getStop("Maia - Largo S.António") to listOf("08h16", "16h16"),
                        getStop("Furnas - Águas Quentes") to listOf("08h50", "16h50"),
                        ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"i", mapOf(
                        getStop("Furnas - Águas Quentes") to listOf("09h10", "17h10"),
                        getStop("Furnas - Caldeiras") to listOf("09h13", "17h13"),
                        getStop("Maia - Largo S.António") to listOf("09h38", "17h38"),
                        getStop("São Brás") to listOf("09h43", "17h43"),
                        getStop("Ribeirinha") to listOf("10h15", "18h15"),
                        getStop("Ribeira Grande") to listOf("10h17", "18h17"),
                        getStop("Ribeira Seca") to listOf("10h17", "18h17"),
                        getStop("Caldeirão") to listOf("10h31", "18h31"),
                        getStop("Moviarte") to listOf("10h38", "18h38"),
                        getStop("Ponta Delgada") to listOf("10h50", "18h50"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,  route+"vs", mapOf(
                        getStop("Ponta Delgada") to listOf("07h15", "15h15"),
                        getStop("Moviarte") to listOf("07h22", "15h22"),
                        getStop("Caldeirão") to listOf("07h30", "15h30"),
                        getStop("Ribeira Seca") to listOf("07h43", "15h43"),
                        getStop("Ribeira Grande") to listOf("07h45", "15h45"),
                        getStop("Ribeirinha") to listOf("07h50", "15h50"),
                        getStop("Porto Formoso") to listOf("08h09", "16h09"),
                        getStop("São Brás") to listOf("08h11", "16h11"),
                        getStop("Maia - Largo S.António") to listOf("08h16", "16h16"),
                        getStop("Furnas - Águas Quentes") to listOf("08h50", "16h50"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route,   route+"vd", mapOf(
                        getStop("Ponta Delgada") to listOf("07h15", "15h15"),
                        getStop("Moviarte") to listOf("07h22", "15h22"),
                        getStop("Caldeirão") to listOf("07h30", "15h30"),
                        getStop("Ribeira Seca") to listOf("07h43", "15h43"),
                        getStop("Ribeira Grande") to listOf("07h45", "15h45"),
                        getStop("Ribeirinha") to listOf("07h50", "15h50"),
                        getStop("Porto Formoso") to listOf("08h09", "16h09"),
                        getStop("São Brás") to listOf("08h11", "16h11"),
                        getStop("Maia - Largo S.António") to listOf("08h16", "16h16"),
                        getStop("Furnas - Águas Quentes") to listOf("08h50", "16h50"),
                    ), TypeOfDay.SUNDAY, img),
            ))
        /* Route 111 */
        route = "111"
        crpRoutes.addAll(
            arrayListOf(
                Route(
                    route,   route+"is", mapOf(
                        getStop("Furnas - Águas Quentes") to listOf("09h10", "17h10"),
                        getStop("Furnas - Caldeiras") to listOf("09h13", "17h13"),
                        getStop("Maia - Largo S.António") to listOf("09h38", "17h38"),
                        getStop("São Brás") to listOf("09h43", "17h43"),
                        getStop("Porto Formoso") to listOf("09h46", "17h46"),
                        getStop("Ribeirinha") to listOf("10h04", "18h04"),
                        getStop("Ribeira Grande") to listOf("10h13", "18h13"),
                        getStop("Ribeira Seca") to listOf("10h16", "18h16"),
                        getStop("Rabo de Peixe") to listOf("10h24", "18h24"),
                        getStop("Calhetas") to listOf("10h28", "18h28"),
                        getStop("Pico da Pedra") to listOf("10h34", "18h34"),
                        getStop("Caldeirão") to listOf("10h39", "18h39"),
                        getStop("Moviarte") to listOf("10h47", "18h47"),
                        getStop("Ponta Delgada") to listOf("11h00", "19h00"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route,   route+"id", mapOf(
                        getStop("Furnas - Águas Quentes") to listOf("09h10", "17h10"),
                        getStop("Furnas - Caldeiras") to listOf("09h13", "17h13"),
                        getStop("Maia - Largo S.António") to listOf("09h38", "17h38"),
                        getStop("São Brás") to listOf("09h43", "17h43"),
                        getStop("Porto Formoso") to listOf("09h46", "17h46"),
                        getStop("Ribeirinha") to listOf("10h04", "18h04"),
                        getStop("Ribeira Grande") to listOf("10h13", "18h13"),
                        getStop("Ribeira Seca") to listOf("10h16", "18h16"),
                        getStop("Rabo de Peixe") to listOf("10h24", "18h24"),
                        getStop("Calhetas") to listOf("10h28", "18h28"),
                        getStop("Pico da Pedra") to listOf("10h34", "18h34"),
                        getStop("Caldeirão") to listOf("10h39", "18h39"),
                        getStop("Moviarte") to listOf("10h47", "18h47"),
                        getStop("Ponta Delgada") to listOf("11h00", "19h00"),
                    ), TypeOfDay.SUNDAY, img),
            ))
        /* Route 109 */
        route = "109"
        crpRoutes.addAll(
            arrayListOf(
                Route(
                    route,   route+"v", mapOf(
                        getStop("Ribeira Grande") to listOf("07h50", "09h45", "11h50", "12h55", "13h10", "13h55", "14h55", "15h55", "16h55"),
                        getStop("Ribeirinha") to listOf("08h00", "09h55", "12h00", "13h05", "13h20", "14h05", "15h05", "16h05", "17h05"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,   route+"i", mapOf(
                        getStop("Ribeirinha") to listOf("08h30", "10h00", "13h20", "14h05", "15h05", "16h05", "17h05", "18h05", "19h05"),
                        getStop("Ribeira Grande") to listOf("08h40", "10h10", "13h30", "14h15", "15h15", "16h15", "17h15", "18h15", "19h15"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,   route+"vs", mapOf(
                        getStop("Ribeira Grande") to listOf("12h00"),
                        getStop("Ribeirinha") to listOf("12h07"),
                        getStop("Gramas") to listOf("12h15"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route,   route+"is", mapOf(
                        getStop("Gramas") to listOf("11h05", "18h35", "20h00"),
                        getStop("Ribeirinha") to listOf("11h13", "18h43", "20h08"),
                        getStop("Ribeira Grande") to listOf("11h20", "18h50", "20h15"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route,   route+"vd", mapOf(
                        getStop("Ribeira Grande") to listOf("12h00"),
                        getStop("Ribeirinha") to listOf("12h07"),
                        getStop("Gramas") to listOf("12h15"),
                    ), TypeOfDay.SUNDAY, img),
                Route(
                    route,   route+"id", mapOf(
                        getStop("Gramas") to listOf("09h35", "17h35", "19h30"),
                        getStop("Ribeirinha") to listOf("09h43", "17h43", "19h38"),
                        getStop("Ribeira Grande") to listOf("09h50", "17h50", "19h45"),
                    ), TypeOfDay.SUNDAY, img),
            ))
        /* Route 114 */
        route = "114"
        crpRoutes.addAll(
            arrayListOf(
                Route(
                    route,   route+"v", mapOf(
                        getStop("Ribeira Grande") to listOf("09h15", "14h15", "18h30"),
                        getStop("Ribeira Seca") to listOf("09h21",  "14h21", "18h36"),
                        getStop("Santa Bárbara - Ribeira Grande") to listOf("09h30", "14h30", "18h45"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,   route+"i", mapOf(
                        getStop("Santa Bárbara - Ribeira Grande") to listOf("07h30", "09h30", "12h55", "14h30", "18h50"),
                        getStop("Ribeira Seca") to listOf("07h36", "09h36", "13h03", "14h36", "18h58"),
                        getStop("Ribeira Grande") to listOf("07h45", "09h45", "13h10","14h45", "19h05"),
                    ), TypeOfDay.WEEKDAY, img),
                Route(
                    route,   route+"vs", mapOf(
                        getStop("Ribeira Grande") to listOf("09h15", "12h10", "14h15", "18h45"),
                        getStop("Ribeira Seca") to listOf("09h21", "12h16", "14h21", "18h51"),
                        getStop("Santa Bárbara - Ribeira Grande") to listOf("09h30", "12h25", "14h30", "19h00"),
                        ), TypeOfDay.SATURDAY, img),
                Route(
                    route,   route+"is", mapOf(
                        getStop("Santa Bárbara - Ribeira Grande") to listOf("07h30", "09h30", "14h30"),
                        getStop("Ribeira Seca") to listOf("07h36", "09h36", "14h36"),
                        getStop("Ribeira Grande") to listOf("07h45", "09h45", "14h45"),
                    ), TypeOfDay.SATURDAY, img),
                Route(
                    route,   route+"vd", mapOf(
                        getStop("Ribeira Grande") to listOf("07h50", "09h15", "13h50", "18h45"),
                        getStop("Ribeira Seca") to listOf("07h56", "09h21", "13h56", "18h51"),
                        getStop("Santa Bárbara - Ribeira Grande") to listOf("08h05", "09h30", "14h05", "19h00"),
                    ), TypeOfDay.SUNDAY, img),
                Route(
                    route,   route+"id", mapOf(
                        getStop("Santa Bárbara - Ribeira Grande") to listOf("07h30", "09h30", "14h05"),
                        getStop("Ribeira Seca") to listOf("07h36", "09h36", "14h11"),
                        getStop("Ribeira Grande") to listOf("07h45", "09h45", "14h20"),
                    ), TypeOfDay.SUNDAY, img),
            ))
    }

    private fun setCorrespondence() {
        for (stop in stops) {
            correspondence[stop] = mutableListOf()
            for (route in allRoutes) {
                if (stop in route.stops.keys) {
                    correspondence[stop]?.addAll(route.stops.keys)
                }
            }
        }
    }

    fun getStops(): ArrayList<Stop> {
        return stops
    }

    fun addStop(stop: Stop) {
        stops.add(stop)
    }

    fun getAllRoutes(): ArrayList<Route> {
        return allRoutes
    }

    fun getAvmRoutes(): ArrayList<Route> {
        return avmRoutes
    }

    fun getVarelaRoutes(): ArrayList<Route> {
        return varelaRoutes
    }

    fun getCrpRoutes(): ArrayList<Route> {
        return crpRoutes
    }

    fun getCorrespondence(stop: String): MutableList<Stop>? {
        return correspondence[getStop(stop)]
    }

    fun getStop(stop: String): Stop {
        for (busStop in stops)
            if (busStop.name.uppercase() == stop.uppercase())
                return busStop
        Log.d("ERROR", "Error finding: $stop")
        return Stop("null", Location(0.0, 0.0))
    }

    fun getAllTimes(
        id: String?,
        origin: String?,
        destination: String?,
        day: TypeOfDay
    ): Map<Stop, List<String>>? {
        try {
            //Log.d("ERROR", id.toString())
            val route: Route? = routeHash[id]
            return route?.stops
        }
        catch(e: Exception) {
            return mapOf()
        }
        return mapOf()
    }

    fun getTimeIdx(
        route_id: String?,
        timeToFind: String?,
        origin: String?,
        destination: String?
    ): Int {
        val route = getRouteHash()[route_id]
        if (route != null) {
            for (stop in route.stops) {
                if (stop.key.name == destination)
                    break
                else if ((stop.key.name == origin) and (destination?.let { getStop(it) } in route.stops.keys)) {
                    val ret = route.getTimeIdx(stop.value, timeToFind)
                    if (ret >= 0) return ret
                }
            }
        }
        return -1
    }

    fun getAllStopTimes(
        route_id: String?,
        timeToFind: String?,
        origin: String?,
        destination: String?,
        day: TypeOfDay = TypeOfDay.WEEKDAY
    ): Map<String, String> {
        var map: MutableMap<String, String> = mutableMapOf()
        try{
            val idx = getTimeIdx(route_id, timeToFind, origin, destination)
            val route = getRouteHash()[route_id]
                    for (i in route?.stops?.keys?.indices!!) {
                        Log.d("debug", route.stops.toString())
                        val times: List<String>? = route.stops[getStop(route.stops.keys.toList()[i].toString())]
                        if (times != null) {
                            map[route.stops.keys.toList()[i].toString()] = times[idx]
                        }
            }
            return map
        }
        catch(e: Exception) {
            return mapOf("ERROR" to "ERROR")
        }
        return map
    }

    fun getFavorite(): MutableList<List<String>> {
        return favorite
    }

    fun addFavorite(origin: String?, destination: String?) {
        if (listOf(origin, destination) !in favorite) {
            favorite.add(listOf(origin, destination) as List<String>)
        }
    }

    fun removeFavorite(toRemove: List<String>) {
        favorite.remove(toRemove)
    }

    fun loadFavorite(fav: MutableList<List<String>>) {
        favorite = fav
    }

    fun getCurrentLang(): String {
        return currentLanguage
    }

    fun changeCurrentLang(lang: String) {
        currentLanguage = lang
    }

    fun getLoaded(): Boolean {
        return loaded
    }

    fun loaded() {
        loaded = true
    }

    fun hasInfo(id: String?, origin: String?, destination: String?, typeOfDay: TypeOfDay): String? {
        for (route in allRoutes)
            if ((route.id == id) and (route.getStopIdx(origin?.let { getStop(it) }) < route.getStopIdx(destination?.let { getStop(it) }))and (route.day == typeOfDay))
                return route.info
        return null
    }

    fun addRouteToHash(id: String, route: Route){
        routeHash[id] = route
    }
    fun getRouteHash(): HashMap<String, Route> {
        return routeHash
    }
}
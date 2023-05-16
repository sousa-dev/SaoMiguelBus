class Route:
    def __init__(self, id, unique_id, stops, day, company, info = ""):
        self.id = id
        self.unique_id = unique_id
        self.stops = stops
        self.day = day
        self.company = company
        self.info = info

    def getStopIdx(self, stop, position):
        return stops[stop]

    def __str__(self):
        return 


'''
class Route constructor(val id: String, val unique_id: String, val stops: Map<Stop, List<String>>, val day: TypeOfDay, val company: Int, val info: String? = "") {
    private var allStops: List<Stop> = stops.keys.toList()
    private var origin: Stop? = allStops[0]
    private var destination: Stop? = allStops[allStops.size - 1]

    init {
        if (Datasource().getRouteHash().containsKey(unique_id)) Log.w("ERROR", "$unique_id duplicated")
        else Datasource().addRouteToHash(unique_id, this)
    }

    fun getStopTime(stop: Stop?, position: Int): String? {
        return stops[stop]?.get(position)
    }

    fun getTimeIdx(times: List<String>, time: String?): Int {
        for (i in times.indices)
            if (times[i] == time) return i
        Log.d("dl", times.toString() + time)
        return -1
    }

    fun getStopIdx(stop: Stop?): Int {
        var i : Int = 0
        for (st in stops.keys)
            if (st == stop) return i
            else i++
        return -1
    }

    fun getOrigin(): Stop? {
        return origin
    }

    fun getDestination(): Stop? {
        return destination
    }

    fun getNStops(stop: Stop?): Int? {
        return stops[stop]?.size
    }
}
'''
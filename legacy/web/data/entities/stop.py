class Stop:
    def __init__(self, name, coordinates):
        self.name = name
        self.coordinates = coordinates


'''
class Stop constructor(var name: String, val coordinates: Location) {

    init {
        if (!Datasource().getStops().contains(this)) Datasource().addStop(this)
    }
    override fun toString(): String{
        return name
    }
}
'''
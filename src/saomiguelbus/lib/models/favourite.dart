class Favourite {
  final String origin;
  final String destination;

  Favourite({required this.origin, required this.destination});

  // Convert a Favourite object into a JSON object
  Map<String, dynamic> toJson() {
    return {
      'origin': origin,
      'destination': destination,
    };
  }

  // Create a Favourite object from a JSON object
  factory Favourite.fromJson(Map<String, dynamic> json) {
    return Favourite(
      origin: json['origin'],
      destination: json['destination'],
    );
  }
}

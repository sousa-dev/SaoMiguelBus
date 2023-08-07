import 'dart:convert';

import 'package:saomiguelbus/models/index.dart';

class Instruction {
  List<StepRoute> routes = [];

  Instruction initInstructions(List<dynamic> routesJson) {
    for (var routeJson in routesJson) {
      routes.add(initStepRoute(routeJson));
    }
    return this;
  }

  StepRoute initStepRoute(dynamic json) {
    var instructionRoute = StepRoute();

    instructionRoute.overviewPolylinePoints =
        json['overview_polyline']['points'];
    instructionRoute.warnings = List<String>.from(json['warnings']);
    var legs = json['legs'];
    for (var legJson in legs) {
      instructionRoute.legs.add(initLeg(legJson));
    }

    return instructionRoute;
  }

  Leg initLeg(dynamic json) {
    var leg = Leg();

    leg.startAddress = json['start_address'];
    leg.startLocation =
        Location(json['start_location']['lat'], json['start_location']['lng']);
    leg.endAddress = json['end_address'];
    leg.endLocation =
        Location(json['end_location']['lat'], json['end_location']['lng']);

    leg.departure = json['departure_time']['text'];
    leg.arrival = json['arrival_time']['text'];
    leg.duration = json['duration']['text'];

    var steps = json['steps'];
    for (var stepJson in steps) {
      leg.steps.add(initStep(stepJson, leg));
    }

    return leg;
  }

  Step initStep(dynamic json, Leg? leg) {
    var step = Step();
    step.leg = leg;

    try {
      step.instructions = json['html_instructions'];
    } catch (e) {
      step.instructions = '';
    }

    step.startLocation =
        Location(json['start_location']['lat'], json['start_location']['lng']);
    step.endLocation =
        Location(json['end_location']['lat'], json['end_location']['lng']);

    step.distance = json['distance']['text'];
    step.duration = json['duration']['text'];

    step.polyline = json['polyline']['points'];
    step.travelMode = json['travel_mode'];

    if (json.containsKey('steps')) {
      for (var stepJson in json['steps']) {
        step.steps.add(initStep(stepJson, null));
      }
    } else if (json.containsKey('transit_details')) {
      step.transitDetails = initTransitDetails(json['transit_details']);
    }

    return step;
  }

  TransitDetails initTransitDetails(dynamic json) {
    var transitDetails = TransitDetails();

    transitDetails.departureStop = json['departure_stop']['name'];
    transitDetails.departureLocation = Location(
        json['departure_stop']['location']['lat'],
        json['departure_stop']['location']['lng']);
    transitDetails.departureTime = json['departure_time']['text'];

    transitDetails.arrivalStop = json['arrival_stop']['name'];
    transitDetails.arrivalLocation = Location(
        json['arrival_stop']['location']['lat'],
        json['arrival_stop']['location']['lng']);
    transitDetails.arrivalTime = json['arrival_time']['text'];

    transitDetails.headsign = json['headsign'];
    transitDetails.line = initLine(json['line']);
    transitDetails.numStops = json['num_stops'];

    return transitDetails;
  }

  Line initLine(dynamic json) {
    var line = Line();
    var agencies = <Agency>[];

    var agenciesJson = json['agencies'];
    for (var agencyJson in agenciesJson) {
      agencies.add(initAgency(agencyJson));
    }

    line.agencies = agencies;
    line.name = json['name'];
    line.shortName = json['short_name'];

    line.vehicle = initVehicle(json['vehicle']);

    return line;
  }

  Agency initAgency(dynamic json) {
    var agency = Agency();

    agency.name = json['name'];
    agency.phone = json['phone'];
    agency.url = json['url'];

    return agency;
  }

  Vehicle initVehicle(dynamic json) {
    var vehicle = Vehicle();

    vehicle.icon = json['icon'];
    vehicle.name = json['name'];
    vehicle.type = json['type'];

    return vehicle;
  }

  @override
  String toString() {
    var json = <String, dynamic>{};
    var routesArray = <dynamic>[];

    for (var route in routes) {
      var routeObject = <String, dynamic>{};
      var legsArray = <dynamic>[];

      for (var leg in route.legs) {
        var legObject = <String, dynamic>{};

        legObject['start_address'] = leg.startAddress;
        legObject['end_address'] = leg.endAddress;
        legObject['duration'] = leg.duration;
        legObject['departure'] = leg.departure;
        legObject['arrival'] = leg.arrival;

        var stepsArray = <dynamic>[];

        for (var step in leg.steps) {
          var stepObject = <String, dynamic>{};

          stepObject['instructions'] = step.instructions;
          stepObject['travel_mode'] = step.travelMode;
          stepObject['distance'] = step.distance;
          stepObject['duration'] = step.duration;
          stepObject['polyline'] = step.polyline;

          if (step.travelMode == 'TRANSIT') {
            var transitDetailsObject = <String, dynamic>{};

            transitDetailsObject['departure_stop'] =
                step.transitDetails.departureStop;
            transitDetailsObject['departure_location'] = {
              'lat': step.transitDetails.departureLocation.latitude,
              'lng': step.transitDetails.departureLocation.longitude,
            };
            transitDetailsObject['departure_time'] =
                step.transitDetails.departureTime;

            transitDetailsObject['arrival_stop'] =
                step.transitDetails.arrivalStop;
            transitDetailsObject['arrival_location'] = {
              'lat': step.transitDetails.arrivalLocation.latitude,
              'lng': step.transitDetails.arrivalLocation.longitude,
            };
            transitDetailsObject['arrival_time'] =
                step.transitDetails.arrivalTime;

            transitDetailsObject['headsign'] = step.transitDetails.headsign;

            var lineObject = <String, dynamic>{};

            lineObject['name'] = step.transitDetails.line.name;
            lineObject['short_name'] = step.transitDetails.line.shortName;

            var vehicleObject = <String, dynamic>{};

            vehicleObject['icon'] = step.transitDetails.line.vehicle.icon;
            vehicleObject['name'] = step.transitDetails.line.vehicle.name;
            vehicleObject['type'] = step.transitDetails.line.vehicle.type;

            lineObject['vehicle'] = vehicleObject;

            var agenciesArray = <dynamic>[];

            for (var agency in step.transitDetails.line.agencies) {
              var agencyObject = <String, dynamic>{};

              agencyObject['name'] = agency.name;
              agencyObject['phone'] = agency.phone;
              agencyObject['url'] = agency.url;

              agenciesArray.add(agencyObject);
            }

            lineObject['agencies'] = agenciesArray;

            transitDetailsObject['line'] = lineObject;
            transitDetailsObject['num_stops'] = step.transitDetails.numStops;

            stepObject['transit_details'] = transitDetailsObject;
          } else if (step.travelMode == 'WALKING') {
            var stepStepsArray = <dynamic>[];

            for (var stepsStep in step.steps) {
              var stepStepsStepObject = <String, dynamic>{};

              stepStepsStepObject['instructions'] = stepsStep.instructions;
              stepStepsStepObject['travel_mode'] = stepsStep.travelMode;
              stepStepsStepObject['distance'] = stepsStep.distance;
              stepStepsStepObject['duration'] = stepsStep.duration;
              stepStepsStepObject['polyline'] = stepsStep.polyline;

              stepStepsArray.add(stepStepsStepObject);
            }
          }

          stepsArray.add(stepObject);
        }

        legObject['steps'] = stepsArray;
        legsArray.add(legObject);
      }

      routeObject['legs'] = legsArray;
      routeObject['overview_polyline_points'] = route.overviewPolylinePoints;
      routeObject['warnings'] = route.warnings;

      routesArray.add(routeObject);
    }

    json['routes'] = routesArray;

    return jsonEncode(json);
  }
}

class StepRoute {
  List<Leg> legs = [];
  late String overviewPolylinePoints;
  late List<dynamic> warnings;
}

class Leg {
  late String startAddress;
  late Location startLocation;
  late String endAddress;
  late Location endLocation;

  late String departure;
  late String arrival;
  late String duration;

  List<Step> steps = [];
}

class Step {
  Leg? leg;
  late String instructions;

  late Location startLocation;
  late Location endLocation;

  late String maneuver;
  late TransitDetails transitDetails;

  late String distance;
  late String duration;

  late String travelMode;
  late String polyline;

  List<Step> steps = [];
}

class TransitDetails {
  late Location departureLocation;
  late String departureStop;
  late String departureTime;
  late Location arrivalLocation;
  late String arrivalStop;
  late String arrivalTime;

  late String headsign;
  late Line line;
  int numStops = -1;
}

class Line {
  List<Agency> agencies = [];

  late String name;
  late String shortName;

  late Vehicle vehicle;
}

class Agency {
  late String name;
  late String phone;
  late String url;
}

class Vehicle {
  late String icon;
  late String name;
  late String type;
}

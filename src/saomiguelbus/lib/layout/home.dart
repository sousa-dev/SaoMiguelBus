// Home Page Body Widget
// Path: lib/layout/home.dart
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'dart:developer' as developer;

import 'package:saomiguelbus/layout/results.dart';
import 'package:saomiguelbus/models/index.dart';
import 'package:saomiguelbus/models/instruction.dart';
import 'package:saomiguelbus/services/google_maps.dart';
import 'package:saomiguelbus/services/index.dart';
import 'package:saomiguelbus/models/route.dart' as my_route;
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/utils/remove_diacritics.dart';

class HomePageBody extends StatefulWidget {
  HomePageBody(
      {Key? key,
      required this.onChangeOrigin,
      required this.onChangeDestination})
      : super(key: key);

  final Function onChangeOrigin;
  final Function onChangeDestination;

  List _routes = [];
  Instruction _instructions = Instruction().initWarning("");

  @override
  _HomePageBodyState createState() => _HomePageBodyState();
}

class _HomePageBodyState extends State<HomePageBody> {
  var _selectedStop = '';
  var _selectedOption = '';
  Map<String, AutocompletePlace> autoComplete = {};
  var _departureType = "depart";
  DateTime date = DateTime.now().toUtc();

  @override
  Widget build(BuildContext context) {
    var time = TimeOfDay.fromDateTime(date);
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          _getAutocompleteField('origin'),
          const SizedBox(height: 16.0),
          ElevatedButton(
            onPressed: () {
              setState(() {
                final temp = origin;
                origin = destination;
                destination = temp;
                widget.onChangeOrigin(origin);
                widget.onChangeDestination(destination);
              });
            },
            child: const Icon(Icons.swap_vert),
          ),
          const SizedBox(height: 16.0),
          _getAutocompleteField('destination'),
          ElevatedButton(
            child: Text('${date.day}/${date.month}/${date.year}'),
            onPressed: () async {
              final chosenDate = await pickDate(date);
              if (chosenDate == null) return;
              setState(() {
                date = DateTime(chosenDate.year, chosenDate.month,
                    chosenDate.day, date.hour, date.minute);
              });
            },
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              DropdownButton<String>(
                value: _departureType,
                onChanged: (value) {
                  setState(() {
                    _departureType = value!;
                  });
                },
                items: [
                  DropdownMenuItem(
                    value: "depart",
                    child: Text(AppLocalizations.of(context)!.depart),
                  ),
                  DropdownMenuItem(
                    value: "arrive",
                    child: Text(AppLocalizations.of(context)!.arrive),
                  ),
                ],
              ),
            ],
          ),
          ElevatedButton(
            child: Text(
                '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}'),
            onPressed: () async {
              final chosenTime = await pickTime(date);
              if (chosenTime == null) return;
              setState(() {
                date = DateTime(date.year, date.month, date.day,
                    chosenTime.hour, chosenTime.minute);
              });
            },
          ),
          ElevatedButton(
            onPressed: () {
              if (origin.isEmpty || destination.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(AppLocalizations.of(context)!.fillFields),
                ));
                return;
              }

              setState(() {
                if (!autoComplete.keys.contains(origin)) {
                  autoComplete[origin] = AutocompletePlace(
                    name: origin,
                    placeID: 'custom',
                    type: 'custom',
                  );
                }
                if (!autoComplete.keys.contains(destination)) {
                  autoComplete[destination] = AutocompletePlace(
                    name: destination,
                    placeID: 'custom',
                    type: 'custom',
                  );
                }

                getLatLngFromPlaceID(autoComplete[origin]!.placeID,
                        autoComplete[destination]!.placeID, origin, destination)
                    .then((value) {
                  Location originLocation = value[0];
                  Location destinationLocation = value[1];

                  String originQuery = originLocation.toString();
                  String destinationQuery = destinationLocation.toString();

                  if (originQuery == '0.0,0.0') {
                    if (autoComplete[origin]!.placeID == 'custom') {
                      originQuery = origin;
                      originLocation = getStop(origin).location;
                    } else {
                      originLocation =
                          getStop(autoComplete[origin]!.name).location;
                      originQuery = originLocation.toString();
                    }
                  }

                  if (destinationQuery == '0.0,0.0') {
                    if (autoComplete[destination]!.placeID == 'custom') {
                      destinationQuery = destination;
                      destinationLocation = getStop(destination).location;
                    } else {
                      destinationLocation =
                          getStop(autoComplete[destination]!.name).location;
                      destinationQuery = destinationLocation.toString();
                    }
                  }

                  getGoogleRoutes(originQuery, destinationQuery, date,
                          AppLocalizations.of(context)!.languageCode,
                          arrival_departure: _departureType)
                      .then((value) {
                    widget._instructions = value;
                    if (widget._instructions.runtimeType == String) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: Text(widget._instructions.toString()),
                      ));
                      return;
                    }

                    Map gMapsResults = {
                      'origin': origin,
                      'destination': destination,
                      'routesNumber': widget._instructions.routes.length,
                      'instructions': widget._instructions,
                    };

                    List<Stop> originClosestStops =
                        getClosestStops(originLocation);
                    List<Stop> destinationClosestStops =
                        getClosestStops(destinationLocation);
                    widget._routes = [];
                    for (var originStop in originClosestStops) {
                      for (var destinationStop in destinationClosestStops) {
                        developer.log(originStop.name);
                        developer.log(destinationStop.name);
                        developer.log(widget._routes.toString());
                        widget._routes.addAll(findRoutes(
                            originStop,
                            destinationStop,
                            _getDayOfWeekString(date.weekday)));
                      }
                    }

                    widget._routes = widget._routes.toSet().toList();

                    Stop fixedOrigin = originClosestStops[0];
                    Stop fixedDestination = destinationClosestStops[0];

                    Map routesResults = {
                      'origin':
                          originClosestStops.map((stop) => stop.name).toList(),
                      'destination': destinationClosestStops
                          .map((stop) => stop.name)
                          .toList(),
                      'routesNumber': widget._routes.length,
                      'routes': widget._routes,
                    };

                    Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (context) => ResultsPageBody(
                                gMaps: gMapsResults,
                                bdSmb: routesResults,
                                origin: autoComplete[origin]!,
                                destination: autoComplete[destination]!,
                              )),
                    );
                  });
                });
              });
            },
            child: Text(AppLocalizations.of(context)!.search),
          ),
        ],
      ),
    );
  }

  Future<Iterable<String>> onChangeText(String text) async {
    if (internetConnection) {
      return placesAutocomplete(text, context).then((value) {
        List<String> placesSuggestions = [];
        placesSuggestions = value[0];
        autoComplete.addAll(value[1]);
        if (placesSuggestions.isNotEmpty) {
          return placesSuggestions;
        }
        return defaultSuggestions(text);
      });
    }
    return defaultSuggestions(text);
  }

  Iterable<String> defaultSuggestions(String text) {
    List<String> stopMatches = <String>[];
    stopMatches.addAll(allStops.keys.cast<String>());

    for (var stop in allStops.keys) {
      autoComplete[stop] = AutocompletePlace(
        name: stop,
        placeID: 'na',
        type: 'bus_station',
      );
    }

    stopMatches.retainWhere((stop) {
      return removeDiacritics(stop.toLowerCase())
          .contains(removeDiacritics(text.toLowerCase()));
    });
    return stopMatches;
  }

  pickDate(DateTime date) => showDatePicker(
        context: context,
        initialDate: date,
        firstDate: date,
        lastDate: DateTime(date.year + 1),
      );

  pickTime(DateTime date) => showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(date),
      );

  TypeOfDay _getDayOfWeekString(int weekday) {
    developer.log(weekday.toString(), name: 'weekday');
    switch (weekday) {
      case 6:
        return TypeOfDay.saturday;
      case 7:
        return TypeOfDay.sunday;
      default:
        return TypeOfDay.weekday;
    }
  }

  _getAutocompleteField(String targetLabel) {
    return Autocomplete<String>(
      optionsBuilder: (TextEditingValue textEditingValue) {
        return onChangeText(textEditingValue.text);
      },
      fieldViewBuilder:
          (context, textEditingController, focusNode, onFieldSubmitted) {
        textEditingController.text =
            targetLabel == 'origin' ? origin : destination;
        return TextFormField(
          controller: textEditingController,
          focusNode: focusNode,
          onTapOutside: (event) => focusNode.unfocus(),
          decoration: InputDecoration(
            labelText: targetLabel == 'origin'
                ? AppLocalizations.of(context)!.origin
                : AppLocalizations.of(context)!.destination,
            border: const OutlineInputBorder(),
            suffixIcon: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              transitionBuilder: (child, animation) {
                return ScaleTransition(
                  scale: animation,
                  child: child,
                );
              },
              child: (targetLabel == 'origin' ? origin : destination).isNotEmpty
                  ? IconButton(
                      key: targetLabel == 'origin'
                          ? const ValueKey('originClearIcon')
                          : const ValueKey('destinationClearIcon'),
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        textEditingController.clear();
                        setState(() {
                          if (targetLabel == 'origin') {
                            origin = '';
                          } else {
                            destination = '';
                          }
                        });
                        focusNode.unfocus();
                      },
                    )
                  : null,
            ),
          ),
          onChanged: (value) {
            setState(() {
              if (targetLabel == 'origin') {
                origin = value;
              } else {
                destination = value;
              }
            });
          },
          onFieldSubmitted: (value) {
            setState(() {
              if (targetLabel == 'origin') {
                origin = value;
              } else {
                destination = value;
              }
            });
            onFieldSubmitted();
            focusNode.unfocus();
          },
        );
      },
      optionsViewBuilder: (BuildContext context,
          AutocompleteOnSelected<String> onSelected, Iterable<String> options) {
        return Align(
          alignment: Alignment.topLeft,
          child: Material(
            elevation: 4.0,
            child: SizedBox(
              height: 200.0,
              child: ListView.builder(
                padding: const EdgeInsets.all(8.0),
                itemCount: options.length,
                itemBuilder: (BuildContext context, int index) {
                  final option = options.elementAt(index);
                  AutocompletePlace? autocompletePlace =
                      autoComplete.containsKey(option)
                          ? autoComplete[option]
                          : null;
                  return ListTile(
                    title: Text(autocompletePlace != null
                        ? autocompletePlace.name
                        : option),
                    leading: autocompletePlace != null
                        ? autocompletePlace.icon
                        : const Icon(Icons.location_on),
                    onTap: () {
                      onSelected(option);
                    },
                  );
                },
              ),
            ),
          ),
        );
      },
      onSelected: (String selection) => targetLabel == 'origin'
          ? widget.onChangeOrigin(selection)
          : widget.onChangeDestination(selection),
    );
  }
}

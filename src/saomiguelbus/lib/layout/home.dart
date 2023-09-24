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
          Autocomplete<String>(
            optionsBuilder: (TextEditingValue textEditingValue) {
              return onChangeText(textEditingValue.text);
            },
            fieldViewBuilder:
                (context, textEditingController, focusNode, onFieldSubmitted) {
              textEditingController.text = origin;
              return TextFormField(
                controller: textEditingController,
                focusNode: focusNode,
                decoration: InputDecoration(
                  labelText: AppLocalizations.of(context)!.origin,
                  border: const OutlineInputBorder(),
                ),
                onChanged: (value) {
                  setState(() {
                    origin = value;
                  });
                },
                onFieldSubmitted: (value) {
                  setState(() {
                    origin = value;
                  });
                  onFieldSubmitted();
                },
              );
            },
            optionsViewBuilder: (BuildContext context,
                AutocompleteOnSelected<String> onSelected,
                Iterable<String> options) {
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
                        return ListTile(
                          title: Text(autoComplete[option]!.name),
                          leading: autoComplete[option]!.icon,
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
            onSelected: (String selection) {
              widget.onChangeOrigin(selection);
            },
          ),
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
          Autocomplete<String>(
            optionsBuilder: (TextEditingValue textEditingValue) {
              return onChangeText(textEditingValue.text);
            },
            onSelected: (String selection) {
              widget.onChangeDestination(selection);
            },
            fieldViewBuilder: (BuildContext context,
                TextEditingController textEditingController,
                FocusNode focusNode,
                VoidCallback onFieldSubmitted) {
              textEditingController.text = destination;
              return TextFormField(
                controller: textEditingController,
                focusNode: focusNode,
                decoration: InputDecoration(
                  labelText: AppLocalizations.of(context)!.destination,
                  border: const OutlineInputBorder(),
                ),
                onChanged: (value) {
                  setState(() {
                    destination = value;
                  });
                },
                onFieldSubmitted: (value) {
                  setState(() {
                    destination = value;
                  });
                  onFieldSubmitted();
                },
              );
            },
            optionsViewBuilder: (BuildContext context,
                AutocompleteOnSelected<String> onSelected,
                Iterable<String> options) {
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
          ),
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
              setState(() {
                //instructions.routes.length
                getGoogleRoutes(origin, destination, date,
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

                  Stop fixedOrigin = getStop(origin);
                  Stop fixedDestination = getStop(destination);
                  widget._routes = findRoutes(fixedOrigin, fixedDestination,
                      _getDayOfWeekString(date.weekday));

                  Map routesResults = {
                    'origin': fixedOrigin.name,
                    'destination': fixedDestination.name,
                    'routesNumber': widget._routes.length,
                    'routes': widget._routes,
                  };

                  Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => ResultsPageBody(
                              gMaps: gMapsResults,
                              bdSmb: routesResults,
                            )),
                  );
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
        autoComplete = value[1];
        if (placesSuggestions.isNotEmpty) {
          return placesSuggestions;
        }
        return defaultSuggestions(text);
      });
    }
    return defaultSuggestions(text);
  }

  Iterable<String> defaultSuggestions(String text) {
    if (text == '') {
      return const Iterable<String>.empty();
    }
    List<String> stopMatches = <String>[];
    stopMatches.addAll(allStops.keys.cast<String>());

    autoComplete = {};
    for (var stop in allStops.keys) {
      autoComplete[stop] = AutocompletePlace(
        name: stop,
        placeID: stop,
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
    switch (weekday) {
      case 1:
        return TypeOfDay.sunday;
      case 7:
        return TypeOfDay.saturday;
      default:
        return TypeOfDay.weekday;
    }
  }
}

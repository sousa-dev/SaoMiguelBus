// Home Page Body Widget
// Path: lib/layout/home.dart
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:saomiguelbus/layout/results.dart';
import 'package:saomiguelbus/models/instruction.dart';
import 'package:saomiguelbus/models/stop.dart';
import 'dart:developer' as developer;

import 'package:saomiguelbus/models/type_of_day.dart';
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
  DateTime date = DateTime.now().toUtc();

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
            onSelected: (String selection) {
              widget.onChangeOrigin(selection);
            },
          ),
          const SizedBox(height: 16.0),
          Autocomplete<String>(
            optionsBuilder: (TextEditingValue textEditingValue) {
              return onChangeText(textEditingValue.text);
            },
            onSelected: (String selection) {
              widget.onChangeDestination(selection);
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
          // DropdownButton<String>(
          //   value: _selectedOption,
          //   onChanged: (String? newValue) {
          //     setState(() {
          //       _selectedOption = newValue ?? 'Option 1';
          //     });
          //   },
          //   items: <String>['Option 1', 'Option 2', 'Option 3']
          //       .map<DropdownMenuItem<String>>((String value) {
          //     return DropdownMenuItem<String>(
          //       value: value,
          //       child: Text(value),
          //     );
          //   }).toList(),
          // ),
          ElevatedButton(
            child: Text('${time.hour}:${time.minute}'),
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
                //TODO: Change type of day
                getGoogleRoutes(origin, destination, date,
                        AppLocalizations.of(context)!.languageCode)
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
    developer.log("onChangeText: $internetConnection");
    if (internetConnection) {
      return placesAutocomplete(text, context).then((value) {
        List<String> placesSuggestions = [];
        placesSuggestions = value;
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

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

  Widget build(BuildContext context) {
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
            onPressed: () {
              setState(() {
                //instructions.routes.length
                //TODO: Change type of day
                getGoogleRoutes(origin, destination, TypeOfDay.weekday,
                        AppLocalizations.of(context)!.languageCode)
                    .then((value) {
                  widget._instructions = value;
                  if (widget._instructions.runtimeType == String) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(widget._instructions.toString()),
                    ));
                    return;
                  }

                  Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => ResultsPageBody(
                              origin: origin,
                              destination: destination,
                              routesNumber: widget._instructions.routes.length,
                              instructions: widget._instructions,
                            )),
                  );
                  if (false) {
                    Stop fixedOrigin = getStop(origin);
                    Stop fixedDestination = getStop(destination);
                    widget._routes = findRoutes(
                        fixedOrigin, fixedDestination, TypeOfDay.weekday);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (context) => ResultsPageBody(
                                origin: fixedOrigin.name,
                                destination: fixedDestination.name,
                                routesNumber: widget._routes.length,
                                routes: widget._routes,
                              )),
                    );
                  }
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
}

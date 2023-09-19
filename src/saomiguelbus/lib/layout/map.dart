// Map Page Body Widget
// Path: lib/layout/map.dart

import 'package:flutter/material.dart';
import 'dart:developer' as developer;
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:saomiguelbus/layout/results.dart';
import 'package:saomiguelbus/models/instruction.dart';
import 'package:saomiguelbus/models/stop.dart';

import 'package:saomiguelbus/models/type_of_day.dart';
import 'package:saomiguelbus/services/index.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/utils/remove_diacritics.dart';
import 'package:saomiguelbus/services/google_maps.dart';

class MapPageBody extends StatefulWidget {
  MapPageBody(
      {Key? key,
      required this.onChangeOrigin,
      required this.onChangeDestination})
      : super(key: key);

  final Function onChangeOrigin;
  final Function onChangeDestination;

  Instruction _instructions = Instruction().initWarning('');

  @override
  _MapPageBodyState createState() => _MapPageBodyState();
}

class _MapPageBodyState extends State<MapPageBody> {
  @override
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
                Stop fixedOrigin = getStop(origin);
                Stop fixedDestination = getStop(destination);
                //TODO: Change type of day
                getGoogleRoutes(
                        getStop(origin),
                        getStop(destination),
                        TypeOfDay.weekday,
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
                              origin: fixedOrigin.name,
                              destination: fixedDestination.name,
                              routesNumber: widget._instructions.routes.length,
                              instructions: widget._instructions,
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
    return placesAutocomplete(text, context).then((value) {
      List<String> placesSuggestions = [];
      placesSuggestions = value;
      if (placesSuggestions.isNotEmpty) {
        return placesSuggestions;
      }
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
    });
  }
}

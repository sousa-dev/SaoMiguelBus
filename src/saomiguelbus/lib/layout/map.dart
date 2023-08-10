// Map Page Body Widget
// Path: lib/layout/map.dart

import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

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

  String _routes = '';

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
              if (textEditingValue.text == '') {
                return const Iterable<String>.empty();
              }
              List<String> stopMatches = <String>[];
              stopMatches.addAll(allStops.keys.cast<String>());

              stopMatches.retainWhere((stop) {
                return removeDiacritics(stop.toLowerCase()).contains(
                    removeDiacritics(textEditingValue.text.toLowerCase()));
              });
              return stopMatches;
            },
            onSelected: (String selection) {
              widget.onChangeOrigin(selection);
            },
          ),
          const SizedBox(height: 16.0),
          Autocomplete<String>(
            optionsBuilder: (TextEditingValue textEditingValue) {
              if (textEditingValue.text == '') {
                return const Iterable<String>.empty();
              }
              List<String> stopMatches = <String>[];
              stopMatches.addAll(allStops.keys.cast<String>());

              stopMatches.retainWhere((stop) {
                return removeDiacritics(stop.toLowerCase()).contains(
                    removeDiacritics(textEditingValue.text.toLowerCase()));
              });
              return stopMatches;
            },
            onSelected: (String selection) {
              widget.onChangeDestination(selection);
            },
          ),
          ElevatedButton(
            onPressed: () {
              setState(() {
                getGoogleRoutes(getStop(origin),
                        getStop(destination), TypeOfDay.weekday, 
                        AppLocalizations.of(context)!.languageCode)
                    .then((value) => widget._routes = value.toString());
              });
            },
            child: Text(AppLocalizations.of(context)!.search),
          ),
          Text(widget._routes)
        ],
      ),
    );
  }
}

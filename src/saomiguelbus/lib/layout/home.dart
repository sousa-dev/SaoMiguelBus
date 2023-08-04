// Home Page Body Widget
// Path: lib/layout/home.dart
import 'package:flutter/material.dart';

import 'package:saomiguelbus/models/type_of_day.dart';
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

  String _routes = '';

  @override
  _HomePageBodyState createState() => _HomePageBodyState();
}

class _HomePageBodyState extends State<HomePageBody> {
  var _selectedStop = '';
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
                widget._routes = findRoutes(getStop(origin),
                        getStop(destination), TypeOfDay.weekday)
                    .toString();
              });
            },
            child: const Text('Search'),
          ),
          Text(widget._routes)
        ],
      ),
    );
  }
}

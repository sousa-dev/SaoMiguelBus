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
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Text(
            'São Miguel Bus Map Page',
          ),
        ],
      ),
    );
  }
}

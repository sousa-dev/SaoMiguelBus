import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

import 'package:saomiguelbus/models/stop.dart';

class CardInstruction {
  final Icon trailing;
  final Icon leading;

  late String routeId;
  late Text title;
  late Text subtitle;

  CardInstruction(instructions, context)
      : trailing = const Icon(Icons.arrow_forward_ios),
        leading = const Icon(Icons.directions_bus) {
          
  }
}

import 'package:flutter/material.dart';
import 'package:saomiguelbus/models/globals.dart';

class AutocompletePlace {
  String name;
  Icon icon;
  String placeID = '';

  AutocompletePlace({
    required this.name,
    required this.placeID,
    String? type,
  }) : icon = _getIcon(type);

  static _getIcon(String? type) {
    return icons[type] ?? const Icon(Icons.location_on);
  }

  @override
  String toString() {
    return name;
  }
}

import 'package:flutter/material.dart';

class CardRoute {
  final Icon trailing;
  final Text title;
  final Text subtitle;
  final Icon leading;

  CardRoute(
      {required this.trailing,
      required this.title,
      required this.subtitle,
      required this.leading});
}

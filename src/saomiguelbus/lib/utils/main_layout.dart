import 'package:flutter/material.dart';
import 'package:saomiguelbus/widgets/navBar.dart';

PreferredSizeWidget getTopBar({title = "São Miguel Bus"}) {
  return AppBar(
    title: Text(title),
  );
}

Widget getNavBar(currentIndex, updateBody) {
  return NavBar(
      key: UniqueKey(), currentIndex: currentIndex, onItemSelected: updateBody);
}

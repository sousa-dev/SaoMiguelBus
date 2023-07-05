// Create a navbar widget

import 'package:flutter/material.dart';

class NavBar extends StatelessWidget {
  NavBar({Key? key, this.selectedIndex = 0}) : super(key: key);

  int selectedIndex;

  @override
  Widget build(BuildContext context) {
    if (selectedIndex >= 4) {
      selectedIndex = 0;
    }

    var navbar = BottomNavigationBar(
      key: key,
      items: const <BottomNavigationBarItem>[
        BottomNavigationBarItem(
          icon: Icon(Icons.home),
          label: 'Home',
        ),
        BottomNavigationBarItem(icon: Icon(Icons.directions_bus), label: 'Bus'),
        BottomNavigationBarItem(icon: Icon(Icons.directions_car), label: 'Car'),
        BottomNavigationBarItem(
            icon: Icon(Icons.directions_bike), label: 'Bike'),
      ],
      selectedItemColor: Theme.of(context).colorScheme.primary,
      unselectedItemColor: Theme.of(context).colorScheme.onSurface,
      showUnselectedLabels: true,
      currentIndex: selectedIndex,
    );
    return navbar;
  }
}

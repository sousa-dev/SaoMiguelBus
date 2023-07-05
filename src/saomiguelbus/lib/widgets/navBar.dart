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
        BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Find'),
        BottomNavigationBarItem(icon: Icon(Icons.map), label: 'Map'),
        BottomNavigationBarItem(icon: Icon(Icons.info_outline), label: 'Info'),
      ],
      selectedItemColor: Theme.of(context).colorScheme.primary,
      unselectedItemColor: Theme.of(context).colorScheme.onSurface,
      showUnselectedLabels: true,
      onTap: ((value) => print(value)),
      currentIndex: selectedIndex,
    );
    return navbar;
  }
}

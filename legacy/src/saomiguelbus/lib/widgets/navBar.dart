import 'package:flutter/material.dart';

class NavBar extends StatefulWidget {
  NavBar({Key? key, required this.currentIndex, required this.onItemSelected})
      : super(key: key);

  final Function(int) onItemSelected;
  int currentIndex;

  @override
  // ignore: library_private_types_in_public_api
  _NavBarState createState() => _NavBarState();
}

class _NavBarState extends State<NavBar> {
  @override
  Widget build(BuildContext context) {
    // if (widget.currentIndex >= 4) {
    //   widget.currentIndex = 0;
    // }

    final navbar = BottomNavigationBar(
      key: widget.key,
      items: const <BottomNavigationBarItem>[
        BottomNavigationBarItem(
          icon: Icon(Icons.home),
          label: 'Home',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.search),
          label: 'Find',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.map),
          label: 'Map',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.info_outline),
          label: 'Info',
        ),
      ],
      selectedItemColor: Theme.of(context).colorScheme.primary,
      unselectedItemColor: Theme.of(context).colorScheme.onSurface,
      showUnselectedLabels: true,
      onTap: (index) {
        setState(() {
          widget.currentIndex = index;
        });
        
        widget.onItemSelected(index);
      },
      currentIndex: widget.currentIndex,
    );
    return navbar;
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

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
      items: <BottomNavigationBarItem>[
        BottomNavigationBarItem(
          icon: const Icon(Icons.home),
          label: AppLocalizations.of(context)!.home,
        ),
        BottomNavigationBarItem(
          icon: const Icon(Icons.search),
          label: AppLocalizations.of(context)!.find,
        ),
        BottomNavigationBarItem(
          icon: const Icon(Icons.map),
          label: AppLocalizations.of(context)!.map,
        ),
        BottomNavigationBarItem(
          icon: const Icon(Icons.info_outline),
          label: AppLocalizations.of(context)!.info,
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

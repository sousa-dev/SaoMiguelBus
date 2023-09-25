// Results Page Body Widget
// Path: lib/layout/results.dart

import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:saomiguelbus/main.dart';
import 'package:saomiguelbus/models/globals.dart';

import 'package:saomiguelbus/models/index.dart';
import 'package:saomiguelbus/models/instruction.dart';
import 'package:saomiguelbus/utils/main_layout.dart';

class ResultsPageBody extends StatefulWidget {
  const ResultsPageBody(
      {Key? key,
      required this.gMaps,
      required this.bdSmb,
      required this.origin,
      required this.destination})
      : super(key: key);

  final Map gMaps;
  final Map bdSmb;
  final AutocompletePlace origin;
  final AutocompletePlace destination;

  @override
  _ResultsPageBodyState createState() => _ResultsPageBodyState();
}

class _ResultsPageBodyState extends State<ResultsPageBody> {
  int _currentPageIndex = 0;
  final PageController _pageController = PageController(initialPage: 0);

  void _goToPage(int pageIndex) {
    setState(() {
      _currentPageIndex = pageIndex;
    });
    _pageController.jumpToPage(pageIndex);
  }

  void _onPageChanged(int pageIndex) {
    setState(() {
      _currentPageIndex = pageIndex;
    });
  }

  void _updateBody(int index) {
    setState(() {
      Navigator.push(
        context,
        MaterialPageRoute(
            builder: (context) =>
                MyHomePage(title: 'São Miguel Bus', currentIndex: index)),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final String originGmaps = widget.gMaps['origin'];
    final String destinationGmaps = widget.gMaps['destination'];
    final List<String> originBdsmb = widget.bdSmb['origin'];
    final List<String> destinationBdsmb = widget.bdSmb['destination'];
    final int routesnumberGmaps = widget.gMaps['routesNumber'];
    final int routesnumberBdsmb = widget.bdSmb['routesNumber'];
    final List routes = widget.bdSmb['routes'];
    final Instruction instructions = widget.gMaps['instructions'];

    Widget gMapsWidget = _getGMapsWidget(
        originGmaps, destinationGmaps, routesnumberGmaps, instructions);

    Widget bdSmbWidget = _getBdSmbWidget(
        originBdsmb, destinationBdsmb, routesnumberBdsmb, routes);

    return Scaffold(
      appBar: getTopBar(),
      body: Material(
        child: Column(
          children: [
            Text(originGmaps),
            Text(destinationGmaps),
            _getPageRow(),
            Container(
              height: 5,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    _currentPageIndex == 0
                        ? const Color(0xFF218732)
                        : Colors.grey,
                    _currentPageIndex == 1
                        ? const Color(0xFF218732)
                        : Colors.grey,
                  ],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
              ),
            ),
            Expanded(
              child: PageView(
                controller: _pageController,
                onPageChanged: _onPageChanged,
                children: [
                  Container(
                    key: const Key('gMapsResults'),
                    child: gMapsWidget,
                  ),
                  Container(
                    key: const Key('bdSmbResults'),
                    child: bdSmbWidget,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: getNavBar(0, _updateBody),
    );
  }

  List _routeToCard(
      List routes, List<String> origin, List<String> destination) {
    List cardRoutes = [];
    for (var route in routes) {
      cardRoutes.add(CardRoute(route, origin, destination, context));
    }
    return cardRoutes;
  }

  Widget _getGMapsWidget(String origin, String destination, int routesNumber,
      Instruction instructions) {
    if (routesNumber == 0) {
      return _getNoRoutesWidget();
    }

    return Material(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: ListView.builder(
                physics: const ScrollPhysics(parent: null),
                shrinkWrap: true,
                itemBuilder: (BuildContext context, int index) {
                  return CardInstruction()
                      .getInstructionWidget(instructions.routes[index]);
                },
                itemCount: routesNumber,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _getNoRoutesWidget() {
    return Material(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Text(
            AppLocalizations.of(context)!.noRoutesFound,
          ),
        ],
      ),
    );
  }

  Widget _getBdSmbWidget(List<String> origin, List<String> destination,
      int routesNumber, List routes) {
    if (routesNumber == 0) {
      return _getNoRoutesWidget();
    }

    List _routes = _routeToCard(routes, origin, destination);
    return Material(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: ListView.builder(
                physics: const ScrollPhysics(parent: null),
                shrinkWrap: true,
                itemBuilder: (BuildContext context, int index) {
                  return ExpansionTile(
                    iconColor: Colors.blue,
                    textColor: Colors.black,
                    title: ListTile(
                      title: _routes[index].title,
                      subtitle: _routes[index].subtitle,
                      leading: _routes[index].leading,
                    ),
                    children: [
                      for (var stop in _routes[index].stops.keys)
                        Text('${_routes[index].stops[stop]} - ${stop.name}'),
                    ],
                  );
                },
                itemCount: routesNumber,
              ),
            ),
          ),
        ],
      ),
    );
  }

  _getPageRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Expanded(
          child: ElevatedButton(
            onPressed: () => _goToPage(0),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              foregroundColor: _currentPageIndex == 0
                  ? const Color(0xFF218732)
                  : Colors.black,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(7),
              ),
              textStyle: const TextStyle(
                decoration: TextDecoration.none,
              ),
              padding: EdgeInsets.zero,
            ),
            child: Text(AppLocalizations.of(context)!.directionsPageLabel,
                style: const TextStyle(fontSize: 20)),
          ),
        ),
        Expanded(
          child: ElevatedButton(
            onPressed: () => _goToPage(1),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              foregroundColor: _currentPageIndex == 1
                  ? const Color(0xFF218732)
                  : Colors.black,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(7),
              ),
              textStyle: const TextStyle(
                decoration: TextDecoration.none,
              ),
              padding: EdgeInsets.zero,
            ),
            child: Text(AppLocalizations.of(context)!.routesPageLabel,
                style: const TextStyle(fontSize: 20)),
          ),
        ),
      ],
    );
  }
}

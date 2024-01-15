// Results Page Body Widget
// Path: lib/layout/results.dart

import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'dart:developer' as developer;

import 'package:saomiguelbus/main.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/models/index.dart';
import 'package:saomiguelbus/models/instruction.dart';
import 'package:saomiguelbus/utils/favourite_utility.dart';
import 'package:saomiguelbus/utils/main_layout.dart';
import 'package:saomiguelbus/utils/search_route.dart';

class ResultsPageBody extends StatefulWidget {
  ResultsPageBody({
    Key? key,
    required this.gMaps,
    required this.bdSmb,
    required this.origin,
    required this.destination,
    required this.date,
    required this.departureType,
    required this.autoComplete,
    required this.routes,
    required this.instructions,
  }) : super(key: key);

  final Map gMaps;
  final Map bdSmb;
  final AutocompletePlace origin;
  final AutocompletePlace destination;
  final DateTime date;
  final String departureType;
  final Map<String, AutocompletePlace> autoComplete;
  final List<dynamic> routes;
  final Instruction instructions;

  @override
  _ResultsPageBodyState createState() => _ResultsPageBodyState();
}

class _ResultsPageBodyState extends State<ResultsPageBody> {
  late int _currentPageIndex;
  late PageController _pageController;

  @override
  void initState() {
    super.initState();
    _currentPageIndex = ((widget.gMaps['routesNumber'] == 0 &&
                widget.bdSmb['routesNumber'] > 0) ||
            !internetConnection)
        ? 1
        : 0;
    _pageController = PageController(initialPage: _currentPageIndex);
  }

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

    developer.log("origin: $origin // destination: $destination");
    developer.log(
        "originGmaps: $originGmaps // destinationGmaps: $destinationGmaps");
    developer.log(
        "originBdsmb: $originBdsmb // destinationBdsmb: $destinationBdsmb");

    Widget gMapsWidget = _getGMapsWidget(
        originGmaps, destinationGmaps, routesnumberGmaps, instructions);

    Widget bdSmbWidget = _getBdSmbWidget(
        originBdsmb, destinationBdsmb, routesnumberBdsmb, routes);

    return Scaffold(
      appBar: getTopBar(context: context),
      body: Material(
        child: Column(
          children: [
            _getTopSection(originGmaps, destinationGmaps),
            _getPageSelection(),
            _getSelectionIndicator(),
            _getCenterWidgets(gMapsWidget, bdSmbWidget),
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
                  return CardInstruction().getInstructionWidget(
                      instructions.routes[index], origin, destination);
                },
                itemCount: routesNumber,
              ),
            ),
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
                  return _routes[index].getCardRouteWidget(_routes[index]);
                },
                itemCount: routesNumber,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _getTopSection(String originGmaps, String destinationGmaps) {
    bool isFavourite = checkIfFavourite(originGmaps, destinationGmaps);

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(origin),
        IconButton(
          icon: Icon(
            Icons.favorite,
            color: isFavourite ? primaryColor : Colors.grey,
          ),
          onPressed: () {
            setState(() {
              if (isFavourite) {
                removeFavourite(originGmaps, destinationGmaps);
              } else {
                addFavourite(originGmaps, destinationGmaps);
              }
              isFavourite = !isFavourite;
            });
          },
        ),
        Text(destination),
        IconButton(
          icon: const Icon(Icons.swap_horiz),
          onPressed: () {
            String key =
                '$destination->$origin:${widget.date.day}/${widget.date.month}/${widget.date.year}-${widget.date.hour}h${widget.date.minute}';
            String languageCode = AppLocalizations.of(context)!.languageCode;
            fetchRoutes(
                    destinationGmaps,
                    originGmaps,
                    widget.date,
                    widget.departureType,
                    widget.autoComplete,
                    widget.routes,
                    context,
                    key,
                    widget.instructions,
                    languageCode)
                .then((results) {
              final temp = origin;
              origin = destination;
              destination = temp;
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) => ResultsPageBody(
                          gMaps: gMapsResultsCached[key],
                          bdSmb: routesResultsCached[key],
                          origin: widget.autoComplete[destinationGmaps]!,
                          destination: widget.autoComplete[originGmaps]!,
                          date: widget.date,
                          departureType: widget.departureType,
                          autoComplete: widget.autoComplete,
                          routes: widget.routes,
                          instructions: widget.instructions,
                        )),
              );
            });
          },
        ),
      ],
    );
  }

  Widget _getPageSelection() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Expanded(
          child: ElevatedButton(
            onPressed: () => _goToPage(0),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              foregroundColor:
                  _currentPageIndex == 0 ? primaryColor : Colors.black,
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
              foregroundColor:
                  _currentPageIndex == 1 ? primaryColor : Colors.black,
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

  Widget _getSelectionIndicator() {
    return Container(
      height: 5,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            _currentPageIndex == 0 ? primaryColor : Colors.grey,
            _currentPageIndex == 1 ? primaryColor : Colors.grey,
          ],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
      ),
    );
  }

  Widget _getCenterWidgets(Widget gMapsWidget, Widget bdSmbWidget) {
    return Expanded(
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
    );
  }
}

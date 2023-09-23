// Results Page Body Widget
// Path: lib/layout/results.dart

import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

import 'package:saomiguelbus/models/card_route.dart';
import 'package:saomiguelbus/models/index.dart';
import 'package:saomiguelbus/models/instruction.dart';

class ResultsPageBody extends StatefulWidget {
  const ResultsPageBody({Key? key, required this.gMaps, required this.bdSmb})
      : super(key: key);

  final Map gMaps;
  final Map bdSmb;

  @override
  _ResultsPageBodyState createState() => _ResultsPageBodyState();
}

class _ResultsPageBodyState extends State<ResultsPageBody> {
  @override
  Widget build(BuildContext context) {
    final String origin_gMaps = widget.gMaps['origin'];
    final String destination_gMaps = widget.gMaps['destination'];
    final String origin_bdSmb = widget.bdSmb['origin'];
    final String destination_bdSmb = widget.bdSmb['destination'];
    final int routesNumber_gMaps = widget.gMaps['routesNumber'];
    final int routesNumber_bdSmb = widget.bdSmb['routesNumber'];
    final List routes = widget.bdSmb['routes'];
    final Instruction instructions = widget.gMaps['instructions'];

    Widget _gMapsWidget = _getGMapsWidget(
        origin_gMaps, destination_gMaps, routesNumber_gMaps, instructions);

    Widget _bdSmbWidget = _getBdSmbWidget(
        origin_bdSmb, destination_bdSmb, routesNumber_bdSmb, routes);

    return PageView(
      children: [
        _gMapsWidget,
        _bdSmbWidget,
      ],
    );
  }

  List _routeToCard(List routes, String origin, String destination) {
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

  Widget _getBdSmbWidget(
      String origin, String destination, int routesNumber, List routes) {
    if (routesNumber == 0) {
      return _getNoRoutesWidget();
    }

    List _routes = _routeToCard(routes ?? [], origin, destination);
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
                      Text(
                        _routes[index].arrivalStop.toString(),
                      ),
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
}

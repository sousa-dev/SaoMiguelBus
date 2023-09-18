// Results Page Body Widget
// Path: lib/layout/results.dart

import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

import 'package:saomiguelbus/models/card_route.dart';

class ResultsPageBody extends StatefulWidget {
  const ResultsPageBody(
      {Key? key,
      required this.origin,
      required this.destination,
      required this.routesNumber,
      required this.routes})
      : super(key: key);

  final String origin;
  final String destination;
  final int routesNumber;
  final List routes;

  @override
  _ResultsPageBodyState createState() => _ResultsPageBodyState();
}

class _ResultsPageBodyState extends State<ResultsPageBody> {
  @override
  Widget build(BuildContext context) {
    List _routes =
        _routeToCard(widget.routes, widget.origin, widget.destination);
    if (widget.routesNumber == 0) {
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

    return Material(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'São Miguel Bus Results Page',
          ),
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
                itemCount: widget.routesNumber,
              ),
            ),
          ),
        ],
      ),
    );
  }

  List _routeToCard(List routes, String origin, String destination) {
    List cardRoutes = [];
    for (var route in routes) {
      cardRoutes.add(CardRoute(route, origin, destination, context));
    }
    return cardRoutes;
  }
}

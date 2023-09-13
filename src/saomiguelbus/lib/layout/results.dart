// Results Page Body Widget
// Path: lib/layout/results.dart

import 'package:flutter/material.dart';
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
    //TODO: Change the text to internationalization
    if (widget.routesNumber == 0) {
      return const Material(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(
              'São Miguel Bus Results Page',
            ),
            Text(
              'No routes found',
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
                  return Container(
                    color: Colors.blue,
                    child: ListTile(
                      trailing: _routes[index].trailing,
                      title: _routes[index].title,
                      subtitle: _routes[index].subtitle,
                      leading: _routes[index].leading,
                    ),
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

  static List _routeToCard(List routes, String origin, String destination) {
    List cardRoutes = [];
    for (var route in routes) {
      cardRoutes.add(CardRoute(route, origin, destination));
    }
    return cardRoutes;
  }
}
